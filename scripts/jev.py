#!/usr/bin/env python3
"""Advisory Jev judgments for vault document work. Never used by enforcement hooks.

Usage:
    python scripts/jev.py docs "<task>" [--top 5]   # index.md docs ranked by relevance
    python scripts/jev.py dup "<new doc topic>"     # existing docs on the same topic
    python scripts/jev.py save-filter "<summary>"   # knowledge-ops Save Filter, 5 questions

Exit 0 ok, 2 bad input, 3 Jev unavailable (no key, network, API error):
on 3 the caller judges by itself as before.
Only the given text and index.md one-line summaries are sent out.
"""
import os
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
UNAVAILABLE = 3
DUP_THRESHOLD = 0.5    # ponytail: untuned default, adjust with real cases
SAVE_THRESHOLD = 0.5
DOCS_MIN_SCORE = 0.34  # below "background only" level

RELEVANCE_LEVELS = [
    "Unrelated: the document is not needed for this task.",
    "Background only: might give general context but can be skipped.",
    "Relevant: should be checked while doing the task.",
    "Essential: must be read before starting the task.",
]
SAVE_QUESTIONS = {
    "reuse": "Will this information be reused repeatedly in future work?",
    "handoff": "Must another agent or colleague read this to take over the project?",
    "decision": "Does it record a decision whose rationale or decision-maker must be traceable later?",
    "failure": "Is it a failed approach or risk that must not be retried?",
    "team_rule": "Is it a common rule or design guide the whole team must follow?",
}


def api_key():
    key = os.environ.get("TYPESAFE_API_KEY")
    if key or sys.platform != "win32":
        return key
    import winreg  # user env var set after the shell started is only in the registry
    try:
        with winreg.OpenKey(winreg.HKEY_CURRENT_USER, "Environment") as k:
            return winreg.QueryValueEx(k, "TYPESAFE_API_KEY")[0]
    except OSError:
        return None


def unavailable(reason):
    print(f"Jev 사용 불가: 직접 판단 ({reason})")
    sys.exit(UNAVAILABLE)


def ask(state, questions):
    key = api_key()
    if not key:
        unavailable("TYPESAFE_API_KEY 없음")
    try:
        from typesafe_sdk import TypeSafeClient, TypeSafeError
    except ImportError:
        unavailable("typesafe-sdk 미설치")
    try:
        with TypeSafeClient(api_key=key, timeout=30) as client:
            return client.system_one(state=state, questions=questions).answers
    except TypeSafeError as e:
        unavailable(type(e).__name__)


def index_docs():
    text = (ROOT / "index.md").read_text(encoding="utf-8")
    return [{"name": m[1], "summary": m[2].strip()}
            for m in re.finditer(r"^- \[\[([^\]|#]+)[^\]]*\]\] — (.+)$", text, re.M)]


def per_doc(docs, make):
    return {f"d{i}": make(i) for i in range(len(docs))}


def cmd_docs(task, top):
    docs = index_docs()
    answers = ask({"task": task, "docs": docs}, per_doc(docs, lambda i: {
        "type": "score",
        "instructions": f"How much is the vault document `docs[{i}]` (name and one-line summary) "
                        "needed to carry out `task`?",
        "criteria": RELEVANCE_LEVELS,
    }))
    top_n = len(RELEVANCE_LEVELS) - 1
    ranked = sorted(((answers[f"d{i}"].score / top_n, d) for i, d in enumerate(docs)),
                    key=lambda x: x[0], reverse=True)
    for s, d in [r for r in ranked if r[0] >= DOCS_MIN_SCORE][:top]:
        print(f"{s:.2f}  [[{d['name']}]] — {d['summary']}")


def cmd_dup(topic):
    docs = index_docs()
    answers = ask({"new_document_topic": topic, "docs": docs}, per_doc(docs, lambda i: {
        "type": "noul",
        "instructions": f"Does the existing vault document `docs[{i}]` already cover the same subject "
                        "as `new_document_topic`, so that updating it is better than creating a new document?",
    }))
    hits = sorted(((answers[f"d{i}"].noul, d) for i, d in enumerate(docs)),
                  key=lambda x: x[0], reverse=True)
    for p, d in [h for h in hits if h[0] >= DUP_THRESHOLD]:
        print(f"{p:.2f}  [[{d['name']}]] — {d['summary']}")


def cmd_save_filter(summary):
    answers = ask({"save_candidate": summary}, {
        k: {"type": "noul", "instructions": f"About `save_candidate`: {q}"}
        for k, q in SAVE_QUESTIONS.items()})
    probs = {k: answers[k].noul for k in SAVE_QUESTIONS}
    for k, p in probs.items():
        print(f"{p:.2f}  {k}")
    print("판정: 저장" if max(probs.values()) >= SAVE_THRESHOLD else "판정: 저장하지 않음")


def main(argv):
    if len(argv) < 2 or argv[0] not in ("docs", "dup", "save-filter"):
        print(__doc__.strip())
        return 2
    text = argv[1]
    if "AI-Sessions/raw" in text.replace("\\", "/"):
        print("raw 자료는 외부로 보내지 않는다. 요약만 넘길 것.")
        return 2
    if argv[0] == "docs":
        top = int(argv[argv.index("--top") + 1]) if "--top" in argv else 5
        cmd_docs(text, top)
    elif argv[0] == "dup":
        cmd_dup(text)
    else:
        cmd_save_filter(text)
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
