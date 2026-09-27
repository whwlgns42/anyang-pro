#!/usr/bin/env python3
"""Export a clean, record-free copy of this vault as a distributable ZIP.

This vault is both a template and a live workspace. The workspace state
(log.md entries, project docs, personal settings) must not ship. This
script copies the whole tree to a staging dir, resets the work records
back to their initial template state, verifies with the existing
validate-template.sh + lint_wiki.py, and zips the result.

The reset steps mirror prompts/bootstrap-dev-agents.md "방법 1" 1~5.

Usage:
    python export.py <output-path>      # writes <output-path>.zip
    python export.py --self-check       # export to temp, assert, discard
"""
import re
import shutil
import subprocess
import sys
import tempfile
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
SKILL_REL = ".claude/skills/export-template"

# Copied but never treated as content to reset. Personal/OS cruft only.
COPY_IGNORE = shutil.ignore_patterns(
    # .agents holds npx-installed skills; .claude/skills links into it and
    # copytree follows those links, so copying .agents too ships them twice.
    ".git", ".agents", "node_modules", "__pycache__", "*.pyc",
    ".DS_Store", "Thumbs.db",
    "workspace", "workspace.json", "workspace-mobile.json", "cache",
)


def reset_log(stage):
    p = stage / "log.md"
    text = p.read_text(encoding="utf-8")
    head, sep, _ = text.partition("## Log")
    if not sep:
        raise SystemExit("log.md has no '## Log' section")
    p.write_text(head + "## Log\n", encoding="utf-8")


def reset_index(stage):
    p = stage / "index.md"
    text = p.read_text(encoding="utf-8")
    # Section body -> placeholder. Concepts keeps only [[glossary]].
    repl = {
        "Projects": "아직 등록된 프로젝트가 없습니다.",
        "Concepts": "- [[glossary]] — 프로젝트 용어 사전. "
                    "같은 개념을 다른 이름으로 부르지 않도록 고정",
        "Decisions": "아직 등록된 의사결정이 없습니다.",
        "Sources": "아직 등록된 source 문서가 없습니다.",
        "Errors / Lessons": "아직 등록된 error 문서가 없습니다.",
    }
    for name, body in repl.items():
        # match "## <name>\n...\n" up to the next "## " or EOF
        pat = re.compile(
            r"(## " + re.escape(name) + r"\n)(.*?)(?=\n## |\Z)",
            re.DOTALL,
        )
        if not pat.search(text):
            raise SystemExit(f"index.md missing section '## {name}'")
        text = pat.sub(lambda m: m.group(1) + "\n" + body + "\n", text)
    p.write_text(text, encoding="utf-8")


def reset_glossary(stage):
    p = stage / "AI-Sessions" / "wiki" / "concepts" / "glossary.md"
    text = p.read_text(encoding="utf-8")
    # Keep everything up to "### 도메인 용어", drop the term table and the
    # "미확정 용어" list, keep the "## Links" section.
    m = re.search(r"\n### 도메인 용어\n", text)
    links = re.search(r"\n## Links\n.*\Z", text, re.DOTALL)
    if not m or not links:
        raise SystemExit("glossary.md structure changed; cannot reset safely")
    head = text[: m.start()]
    body = (
        "\n### 도메인 용어\n\n"
        "아직 확정된 도메인 용어가 없습니다. 프로젝트를 시작하면 표로 채웁니다.\n\n"
        "| 한글 | 영문 식별자 | 정의 |\n|---|---|---|\n\n"
        "### 미확정 용어\n\n"
        "아직 없습니다.\n"
    )
    p.write_text(head + body + links.group(0), encoding="utf-8")


def reset_wiki_docs(stage):
    wiki = stage / "AI-Sessions" / "wiki"
    keep = {(wiki / "concepts" / "glossary.md").resolve()}
    for md in wiki.rglob("*.md"):
        if md.resolve() not in keep:
            md.unlink()


def reset_settings(stage):
    p = stage / ".claude" / "settings.local.json"
    if p.exists():
        p.unlink()


def reset_dev_environment(stage):
    p = stage / ".claude" / "rules" / "dev-environment.md"
    text = p.read_text(encoding="utf-8")
    # Reset the gh CLI row: status back to 미설치, drop the auth-account note.
    text = re.sub(
        r"\| GitHub CLI \(`gh`\) \| [^|]*\| ([^|]*)\| ([^|]*)\| [^|]*\|",
        r"| GitHub CLI (`gh`) | 미설치 | \1| \2| 설치 후 `gh auth login`으로 계정 "
        r"인증. 이 vault가 git 저장소가 되고 GitHub 원격이 생긴 뒤에 필요 |",
        text,
    )
    # Installed/version state is this machine's, not the template's.
    text = re.sub(
        r"(\| TypeSafe Python SDK \(`typesafe-sdk`\) \| )[^|]*\|",
        r"\1미설치 |",
        text,
    )
    p.write_text(text, encoding="utf-8")


RESETS = [
    reset_log, reset_index, reset_glossary,
    reset_wiki_docs, reset_settings, reset_dev_environment,
]


def build_stage(dest):
    """Copy ROOT into dest/<name> and run every reset."""
    stage = dest / "template"
    shutil.copytree(ROOT, stage, ignore=COPY_IGNORE)
    for fn in RESETS:
        fn(stage)
    return stage


def verify(stage):
    checks = [
        (["bash", "scripts/validate-template.sh"], "validate-template.sh"),
        ([sys.executable, "scripts/lint_wiki.py"], "lint_wiki.py"),
    ]
    for cmd, name in checks:
        r = subprocess.run(cmd, cwd=stage, capture_output=True, text=True)
        if r.returncode != 0:
            sys.stderr.write(r.stdout + r.stderr)
            raise SystemExit(f"{name} failed on the exported template")


def make_zip(stage, out_path):
    out_path = out_path.with_suffix(".zip")
    out_path.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(out_path, "w", zipfile.ZIP_DEFLATED) as z:
        for f in sorted(stage.rglob("*")):
            if f.is_file():
                z.write(f, f.relative_to(stage))
    return out_path


def export(out_path):
    with tempfile.TemporaryDirectory() as tmp:
        stage = build_stage(Path(tmp))
        verify(stage)
        zip_path = make_zip(stage, out_path)
    size_kb = zip_path.stat().st_size / 1024
    print(f"OK  {zip_path}  ({size_kb:.0f} KB)")
    print("reset: log.md, index.md, glossary.md term table, wiki project docs,")
    print("       settings.local.json (removed), dev-environment.md gh row")
    print("verified: validate-template.sh + lint-wiki.sh both pass")


def self_check():
    with tempfile.TemporaryDirectory() as tmp:
        tmp = Path(tmp)
        zip_path = tmp / "out.zip"
        with tempfile.TemporaryDirectory() as tmp2:
            stage = build_stage(Path(tmp2))
            verify(stage)
            make_zip(stage, zip_path)
        ex = tmp / "ex"
        with zipfile.ZipFile(zip_path) as z:
            z.extractall(ex)

        log = (ex / "log.md").read_text(encoding="utf-8")
        assert log.rstrip().endswith("## Log"), "log.md not reset"
        assert not list((ex / "AI-Sessions/wiki/projects").glob("*.md")), \
            "project doc left"
        gloss = ex / "AI-Sessions/wiki/concepts/glossary.md"
        assert gloss.exists(), "glossary.md missing"
        table = gloss.read_text(encoding="utf-8").partition("|---|---|---|\n")[2]
        assert not table.lstrip("\n").startswith("|"), \
            "glossary term table not cleared"
        assert (ex / ".claude/skills/typesafe-ai/SKILL.md").exists(), \
            "linked skill not in ZIP"
        assert not (ex / ".agents").exists(), ".agents shipped twice"
        env = (ex / ".claude/rules/dev-environment.md").read_text(encoding="utf-8")
        assert "(`typesafe-sdk`) | 미설치 |" in env, "typesafe-sdk row not reset"
        assert (ex / SKILL_REL / "export.py").exists(), "skill not in ZIP"
        assert not (ex / ".claude/settings.local.json").exists(), \
            "settings.local.json shipped"
        idx = (ex / "index.md").read_text(encoding="utf-8")
        assert "## Projects\n\n아직 등록된 프로젝트가 없습니다." in idx, \
            "index.md not reset"
    print("self-check passed")


def main():
    args = sys.argv[1:]
    if args == ["--self-check"]:
        return self_check()
    if len(args) != 1 or args[0].startswith("-"):
        raise SystemExit(__doc__)
    out = Path(args[0]).resolve()
    if ROOT in out.parents or out == ROOT:
        raise SystemExit("output path must be outside the vault")
    export(out)


if __name__ == "__main__":
    main()
