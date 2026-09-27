#!/usr/bin/env python3
"""Checks the vault for structural problems that let documents drift apart.

Two classes of finding:
  FAIL - something is broken and must be fixed (exit 1)
  WARN - something needs a human call, or is normal mid-work (exit 0)

Everything is read in a single pass; all checks then query that in-memory
index. The previous bash version ran `find` once per link, which took 63
seconds at 61 documents.
"""
import re
import sys
from collections import defaultdict
from datetime import date as calendar_date
from difflib import get_close_matches
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
WIKI = ROOT / "AI-Sessions" / "wiki"
CONVERSATIONS = ROOT / "AI-Sessions" / "conversations"
INDEX = ROOT / "index.md"
GLOSSARY = WIKI / "concepts" / "glossary.md"
MANIFEST = ROOT / "TEMPLATE_MANIFEST.md"

VALID_STATUS = {"draft", "active", "superseded"}
VALID_TYPE = {"decision", "source", "concept", "error",
              "project", "design", "dev-task", "handoff"}
# type -> the folder it belongs in. Types with no natural folder are unmapped.
TYPE_FOLDER = {"decision": "decisions", "source": "sources", "concept": "concepts",
               "error": "errors", "project": "projects", "design": "design",
               "dev-task": "dev-tasks"}
DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")
LINK_RE = re.compile(r"\[\[([^\]]+)\]\]")
SHOW = 10  # per-category output cap unless --all

errors = []
warnings = []


def fail(msg, hint=None):
    errors.append((msg, hint))


def warn(msg, hint=None):
    warnings.append((msg, hint))


def link_target(raw):
    """`folder/doc#heading|alias` -> `doc`.

    Headings and aliases are valid Obsidian link syntax; the old linter
    treated them as part of the filename and reported false breaks.
    """
    t = raw.split("|")[0].split("#")[0].strip()
    return t.rsplit("/", 1)[-1]


def read_doc(path):
    text = path.read_text(encoding="utf-8", errors="replace")
    meta = {}
    if text.startswith("---"):
        end = text.find("\n---", 3)
        if end != -1:
            for line in text[3:end].splitlines():
                if ":" in line:
                    k, v = line.split(":", 1)
                    meta[k.strip()] = v.strip()
    title = next((l[2:].strip() for l in text.splitlines() if l.startswith("# ")), None)
    links = {link_target(m) for m in LINK_RE.findall(text)}
    return {"path": path,
            "rel": path.relative_to(ROOT).as_posix(),
            "meta": meta,
            "title": title,
            "links": {l for l in links if l},
            "has_front": text.startswith("---")}


def all_stems():
    """Every .md name in the vault, built once. Links may point at documents
    outside wiki/ (CLAUDE, index, prompts/...), so this is wider than `docs`."""
    return {p.stem for p in ROOT.rglob("*.md") if ".obsidian" not in p.parts}


NAME_RE = re.compile(r"^[a-z0-9]+(-[a-z0-9]+)*$")
HANDOFF_NAME_RE = re.compile(r"^\d{4}-\d{2}-\d{2}_[a-z0-9]+(-[a-z0-9]+)*$")


def check_meta(d, known_agents):
    """Field checks shared by wiki docs and handoffs. False if no frontmatter."""
    if not d["has_front"]:
        fail(f"missing frontmatter: {d['rel']}")
        return False
    m = d["meta"]
    for field in ("type", "date", "status", "owner"):
        if not m.get(field):
            fail(f"missing or empty frontmatter field '{field}': {d['rel']}")

    status = m.get("status")
    if status and status not in VALID_STATUS:
        fail(f"invalid status '{status}': {d['rel']}",
             "use draft, active, or superseded")

    dtype = m.get("type")
    if dtype and dtype not in VALID_TYPE:
        fail(f"invalid type '{dtype}': {d['rel']}",
             "one of: " + ", ".join(sorted(VALID_TYPE)))

    date = m.get("date")
    if date:
        if not DATE_RE.match(date):
            fail(f"invalid date '{date}': {d['rel']}", "use YYYY-MM-DD")
        else:
            try:
                calendar_date.fromisoformat(date)
            except ValueError:
                fail(f"no such calendar date '{date}': {d['rel']}")

    owner = m.get("owner")
    if owner and owner not in known_agents:
        fail(f"unknown owner '{owner}': {d['rel']}",
             "use an agent in .claude/agents/, or 'shared'")

    # A decision with nobody on record as deciding it is still a proposal.
    if dtype == "decision" and not m.get("decided_by"):
        fail(f"decision without 'decided_by': {d['rel']}",
             "record who decided, e.g. decided_by: user")

    source = m.get("source", "")
    if source.startswith("AI-Sessions/raw/") and not (ROOT / source).exists():
        fail(f"source points to a missing raw file '{source}': {d['rel']}")
    return True


def check_frontmatter(docs, known_agents):
    for d in docs.values():
        if not check_meta(d, known_agents):
            continue
        dtype = d["meta"].get("type")
        # Filed in the wrong folder is a filing mistake, not a break.
        want = TYPE_FOLDER.get(dtype)
        if want and want not in d["path"].relative_to(WIKI).parts[:-1]:
            warn(f"type '{dtype}' but filed in {d['path'].parent.name}/: {d['rel']}",
                 f"move it to {want}/, or correct the type")
        if not NAME_RE.match(d["path"].stem):
            warn(f"file name is not lowercase-hyphen: {d['rel']}",
                 "rename to lowercase English words joined by hyphens")


def check_handoffs(handoffs, known_agents):
    """Handoffs are temporary, so they get field and name checks only —
    no index registration or link-graph checks."""
    for d in handoffs:
        if not check_meta(d, known_agents):
            continue
        if d["meta"].get("type") != "handoff":
            fail(f"conversations/ document is not type 'handoff': {d['rel']}")
        if not HANDOFF_NAME_RE.match(d["path"].stem):
            fail(f"handoff name is not YYYY-MM-DD_<session-name>: {d['rel']}",
                 "session-name in lowercase words joined by hyphens")


def check_dev_tasks(docs):
    for d in sorted(docs.values(), key=lambda x: x["rel"]):
        if d["meta"].get("type") != "dev-task":
            continue
        if not any(docs[t]["meta"].get("type") == "design"
                   for t in d["links"] if t in docs):
            warn(f"dev-task links no design document: {d['rel']}",
                 "link the design it implements")


def check_uniqueness(docs, by_stem):
    for stem, paths in sorted(by_stem.items()):
        if len(paths) > 1:
            fail(f"duplicate document name '{stem}': " + ", ".join(paths),
                 "[[links]] to it are ambiguous; rename one")

    seen = defaultdict(list)
    for d in docs.values():
        if d["title"]:
            seen[d["title"]].append(d["rel"])
    for title, paths in sorted(seen.items()):
        if len(paths) > 1:
            fail(f"duplicate document title '{title}': " + ", ".join(sorted(paths)))


def check_links_resolve(docs, stems, known):
    for d in docs.values():
        for target in sorted(d["links"]):
            if target in known:
                continue
            near = get_close_matches(target, stems, n=1, cutoff=0.7)
            fail(f"broken link [[{target}]] in {d['rel']}",
                 f"did you mean [[{near[0]}]]?" if near else None)


def check_index(docs, stems, known):
    """index.md is the map. Check it in both directions."""
    if not INDEX.is_file():
        fail("index.md missing")
        return None

    index_doc = read_doc(INDEX)
    for target in sorted(index_doc["links"]):
        if target in known:
            continue
        near = get_close_matches(target, stems, n=1, cutoff=0.7)
        fail(f"index.md links [[{target}]] but no such document exists",
             f"did you mean [[{near[0]}]]?" if near
             else "remove the entry, or restore the document")

    for stem, d in sorted(docs.items()):
        if stem not in index_doc["links"]:
            fail(f"not registered in index.md: {d['rel']}",
                 f"add [[{stem}]] to index.md")
    return index_doc


def check_graph(docs):
    """Two-way links, superseded references, orphans.

    All warnings: a document written a minute ago has no backlinks yet, and
    citing a superseded decision is sometimes exactly right. Failing on these
    would push agents to skip the linter.
    """
    for stem, d in sorted(docs.items()):
        for target in sorted(d["links"]):
            t = docs.get(target)
            if t is None or target == stem:
                continue
            if stem not in t["links"]:
                warn(f"one-way link: {d['rel']} -> [[{target}]]",
                     f"add [[{stem}]] to the Links section of {t['rel']}")
            if (t["meta"].get("status") == "superseded"
                    and d["meta"].get("status") in ("active", "draft")):
                warn(f"{d['rel']} links superseded [[{target}]]",
                     "point at the replacement, or note why the old one still applies")

    linked_from = defaultdict(set)
    for stem, d in docs.items():
        for target in d["links"]:
            if target != stem:
                linked_from[target].add(stem)
    for stem, d in sorted(docs.items()):
        if not linked_from[stem]:
            warn(f"orphan: {d['rel']} is linked only from index.md",
                 "link it from a related document, or remove it")


LOG_ENTRY_RE = re.compile(r"^(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2}|--:--) \| ")


def check_log(text):
    """log.md entries must be well-formed and in time order.

    `--:--` means the writer could not see the clock (pm has no Bash); it is
    compared by date only. An entry whose time is wrong but still in order
    cannot be caught here.
    """
    _, sep, body = text.partition("\n## Log")
    if not sep:
        fail("log.md has no '## Log' section")
        return
    # Zero-padded dates and times compare correctly as strings.
    prev_date, prev_time = "", ""
    for n, line in enumerate(body.splitlines()[1:], 1):
        if not line.strip():
            continue
        m = LOG_ENTRY_RE.match(line)
        if not m:
            fail(f"log.md entry {n} is not 'YYYY-MM-DD HH:mm | ...': {line[:40]}",
                 "use --:-- for the time if the clock is unknown")
            continue
        day, time = m.group(1), m.group(2)
        known = time != "--:--"
        if day < prev_date or (day == prev_date and known and time < prev_time):
            fail(f"log.md entry {n} is out of time order: {day} {time}",
                 "append new entries at the end with the real time")
        if day > prev_date:
            prev_date, prev_time = day, ""
        if day == prev_date and known:
            prev_time = max(prev_time, time)


def check_rule_docs(rule_docs):
    """Dead path references, rules copied into more than one file, manifest drift.

    Carried over from the bash version.
    """
    path_re = re.compile(r"`([A-Za-z._][A-Za-z0-9._/-]*)`")
    for doc in rule_docs:
        rel = doc.relative_to(ROOT).as_posix()
        text = doc.read_text(encoding="utf-8", errors="replace")
        for raw in sorted(set(path_re.findall(text))):
            if not ("/" in raw or raw.endswith((".md", ".sh", ".py"))):
                continue
            if any(c in raw for c in "<>*"):
                continue
            # `concepts/` in prose is shorthand for AI-Sessions/wiki/concepts/
            if raw.endswith("/") and raw.count("/") == 1:
                continue
            if not (ROOT / raw).exists():
                fail(f"dead path reference `{raw}` in {rel}")

    # Each fingerprint must live in exactly one owner file. The halves are
    # joined here so this script never contains a fingerprint literally and
    # cannot match itself.
    fingerprints = [
        ("향후 실무에 반복해서", " 재사용될 데이터인가",
         "save filter", ".claude/rules/knowledge-ops.md"),
        ("설계 → 문서화", " 완료 → 구현",
         "dev order", ".claude/rules/dev-common.md"),
        ("type: decision | ", "source | concept",
         "document format", ".claude/rules/knowledge-ops.md"),
    ]
    # Read each candidate once, not once per fingerprint. Rule text belongs in
    # rule documents and the root guides; wiki content is not a candidate.
    candidates = {}
    scan = list(rule_docs) + [ROOT / "TEMPLATE_MANIFEST.md", ROOT / "index.md"]
    for p in scan:
        if not p.is_file() or p.name in ("README.md", "START_HERE.md"):
            continue
        candidates[p.relative_to(ROOT).as_posix()] = p.read_text(
            encoding="utf-8", errors="replace")
    for head, tail, label, owner in fingerprints:
        phrase = head + tail
        hits = sorted(rel for rel, text in candidates.items() if phrase in text)
        if not hits:
            fail(f"{label} rule text not found; owner should be {owner}")
        elif len(hits) > 1:
            fail(f"{label} duplicated across {len(hits)} files: " + ", ".join(hits),
                 f"keep it only in {owner}")
        elif hits[0] != owner:
            fail(f"{label} lives in {hits[0]}, expected {owner}")

    if not MANIFEST.is_file():
        fail("TEMPLATE_MANIFEST.md missing")
        return
    entries, on = [], False
    for line in MANIFEST.read_text(encoding="utf-8").splitlines():
        if re.match(r"^## Required (Files|Directories)", line):
            on = True
            continue
        if line.startswith("## "):
            on = False
        if on:
            entries += re.findall(r"`([^`]*)`", line)
    for entry in entries:
        if not (ROOT / entry).exists():
            fail(f"TEMPLATE_MANIFEST lists missing entry: {entry}")


def report(show_all):
    def dump(items, tag, stream):
        shown = items if show_all else items[:SHOW]
        for msg, hint in shown:
            print(f"{tag}  {msg}", file=stream)
            if hint:
                print(f"      -> {hint}", file=stream)
        if len(items) > len(shown):
            print(f"      ... and {len(items) - len(shown)} more "
                  f"(run with --all to see every one)", file=stream)

    if errors or warnings:
        print()
    dump(errors, "FAIL", sys.stderr)
    if errors and warnings:
        print(file=sys.stderr)
    dump(warnings, "WARN", sys.stdout)
    print()

    if errors:
        print(f"{len(errors)} error(s), {len(warnings)} warning(s). "
              f"Fix the errors before reporting completion.", file=sys.stderr)
        return 1
    if warnings:
        print(f"Wiki lint passed with {len(warnings)} warning(s).")
    else:
        print("Wiki lint passed.")
    return 0


def main():
    show_all = "--all" in sys.argv

    if not WIKI.is_dir():
        print(f"wiki directory not found: {WIKI}", file=sys.stderr)
        return 1

    wiki_docs = sorted(WIKI.rglob("*.md"))
    # Top level only: archive/ holds integrated history and is not checked.
    handoff_docs = sorted(CONVERSATIONS.glob("*.md")) if CONVERSATIONS.is_dir() else []
    rule_docs = [p for p in (ROOT / "CLAUDE.md", ROOT / "AGENTS.md") if p.is_file()]
    rule_docs += sorted((ROOT / ".claude" / "rules").glob("*.md"))
    rule_docs += sorted((ROOT / ".claude" / "agents").glob("*.md"))

    print(f"Checking {len(wiki_docs)} wiki documents, {len(handoff_docs)} handoffs, "
          f"{len(rule_docs)} rule documents...")
    if not wiki_docs:
        print("No wiki documents yet. Nothing to check.")
        return 0

    # One pass builds the graph; every check below is an in-memory lookup.
    docs, by_stem = {}, defaultdict(list)
    for p in wiki_docs:
        d = read_doc(p)
        docs[p.stem] = d
        by_stem[p.stem].append(d["rel"])

    known_agents = {p.stem for p in (ROOT / ".claude" / "agents").glob("*.md")}
    known_agents.add("shared")
    stems = list(docs)

    check_frontmatter(docs, known_agents)
    handoffs = [read_doc(p) for p in handoff_docs]
    check_handoffs(handoffs, known_agents)
    check_uniqueness(docs, by_stem)
    known = all_stems()
    check_links_resolve(docs, stems, known)
    check_index(docs, stems, known)
    check_graph(docs)
    check_dev_tasks(docs)

    if not GLOSSARY.is_file():
        fail("glossary missing: AI-Sessions/wiki/concepts/glossary.md")
    if (ROOT / "log.md").is_file():
        check_log((ROOT / "log.md").read_text(encoding="utf-8", errors="replace"))

    check_rule_docs(rule_docs)

    owner = option_value("--owner")
    if owner:
        filter_by_owner(owner, list(docs.values()) + handoffs)
    return report(show_all)


def option_value(name):
    args = sys.argv[1:]
    if name in args and args.index(name) + 1 < len(args):
        return args[args.index(name) + 1]
    return None


def filter_by_owner(owner, doc_list):
    """Keep findings about this agent's documents and ownerless ones (someone
    has to claim those). The SubagentStop hook uses this so one agent is not
    held up by another agent's half-finished document.

    index.md registration is kept only for pm, and for every document: during
    development only pm edits index.md, so pm must register what others made
    before it ends. Other agents cannot fix it and must not be sent back.
    log.md findings follow the same reasoning."""
    rels = [d["rel"] for d in doc_list if d["meta"].get("owner") in (owner, None, "")]

    def mine(item):
        if item[0].startswith(("not registered in index.md", "log.md")):
            return owner == "pm"
        return any(r in item[0] for r in rels)

    errors[:] = [e for e in errors if mine(e)]
    warnings[:] = [w for w in warnings if mine(w)]


if __name__ == "__main__":
    sys.exit(main())
