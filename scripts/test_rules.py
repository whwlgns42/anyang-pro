#!/usr/bin/env python3
"""Regression checks for rules that were fixed once and must stay fixed.

Each check pins a behavior recorded under "해결한 항목" in
AI-Sessions/wiki/decisions/rule-review-baseline.md. When a rule is fixed and
the fix can be checked by machine, add a case here.

Usage: python scripts/test_rules.py   (exit 1 on any failure)
"""
import contextlib
import io
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import agent_guard  # noqa: E402
import lint_wiki  # noqa: E402

failures = []


def expect(cond, msg):
    if not cond:
        failures.append(msg)


def hook_denies(handler, data):
    out = io.StringIO()
    with contextlib.redirect_stdout(out):
        handler(data)
    return '"deny"' in out.getvalue()


def check_index_filter():
    """pm keeps index registration and log.md FAILs; others drop them."""
    doc = {"rel": "AI-Sessions/wiki/design/login-api.md", "meta": {"owner": "backend"}}
    unregistered = ("not registered in index.md: " + doc["rel"], None)
    broken = ("broken link [[x]] in " + doc["rel"], None)
    log_order = ("log.md entry 3 is out of time order: 2026-09-15 15:00", None)
    for owner, want_pm_only, want_broken in (("pm", True, False), ("backend", False, True)):
        lint_wiki.errors[:] = [unregistered, broken, log_order]
        lint_wiki.warnings[:] = []
        lint_wiki.filter_by_owner(owner, [doc])
        expect((unregistered in lint_wiki.errors) == want_pm_only,
               f"--owner {owner}: index registration kept={not want_pm_only}, want {want_pm_only}")
        expect((log_order in lint_wiki.errors) == want_pm_only,
               f"--owner {owner}: log.md FAIL kept={not want_pm_only}, want {want_pm_only}")
        expect((broken in lint_wiki.errors) == want_broken,
               f"--owner {owner}: own-document FAIL kept={not want_broken}, want {want_broken}")


def check_git_write():
    blocked = ["git commit -m x", "git add a.txt", "ls && git add a.txt",
               "git branch -d foo", "git tag v1", "git stash", "git push",
               "git --git-dir=.git commit -m x", "git -C dir commit -m x"]
    allowed = ["git status", "git log --oneline", "git diff", "git branch",
               "git tag", "git stash list", "git branch --show-current"]
    for c in blocked:
        expect(agent_guard.GIT_WRITE.search(c), f"git write not blocked: {c}")
    for c in allowed:
        expect(not agent_guard.GIT_WRITE.search(c), f"read-only git blocked: {c}")


def check_call_graph():
    """Hub structure: frontend and database reach each other only via backend.
    A fork is not an exception: it may escape the agent_type-based guards."""
    want = {
        "pm": {"backend", "frontend", "database", "code-review", "git-manager"},
        "backend": {"frontend", "database", "git-manager"},
        "frontend": {"backend", "git-manager"},
        "database": {"backend", "git-manager"},
        "code-review": {"backend", "frontend", "database"},
        "git-manager": set(),
    }
    for agent, spawns in want.items():
        got = agent_guard.allowed_spawns(agent)
        expect(got == spawns, f"{agent} may call {sorted(got or [])}, want {sorted(spawns)}")
    for agent in want:
        expect(hook_denies(agent_guard.agent_call,
                           {"agent_type": agent, "tool_input": {"subagent_type": "fork"}}),
               f"{agent} may fork past the guards")
    expect(not hook_denies(agent_guard.agent_call, {"tool_input": {"subagent_type": "fork"}}),
           "main session fork blocked")


def check_design_lock():
    """An approved design changes only its status line without re-approval."""
    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        wiki = root / "AI-Sessions" / "wiki"
        (wiki / "projects").mkdir(parents=True)
        (wiki / "design").mkdir()
        (wiki / "projects" / "p.md").write_text(
            "# P\n\n## Details\n\n### 승인된 설계\n\n"
            "- [[login-api|로그인 API]] — 승인일 2026-09-15, 승인자 user\n\n"
            "### 확인이 필요한 항목\n\n- [[other-screen]]\n", encoding="utf-8")
        approved = wiki / "design" / "login-api.md"
        approved.write_text("---\nstatus: draft\n---\n\n# Login API\n\nPOST /login\n",
                            encoding="utf-8")
        other = wiki / "design" / "other-screen.md"
        other.write_text("---\nstatus: draft\n---\n\n# Other\n", encoding="utf-8")

        def reason(path, **ti):
            return agent_guard.design_lock_reason(root, {"file_path": str(path), **ti})

        expect(reason(approved, old_string="status: draft", new_string="status: active") is None,
               "design-lock: status-only Edit denied")
        expect(reason(approved, old_string="POST /login", new_string="POST /signin"),
               "design-lock: content Edit of approved design allowed")
        expect(reason(approved, content=approved.read_text(encoding="utf-8") + "extra\n"),
               "design-lock: content Write of approved design allowed")
        expect(reason(approved, edits=[{"old_string": "status: draft",
                                        "new_string": "status: active"},
                                       {"old_string": "POST", "new_string": "GET"}]),
               "design-lock: MultiEdit with content change allowed")
        approved.write_text(approved.read_text(encoding="utf-8") + "만료 30분 (미확정)\n",
                            encoding="utf-8")
        expect(reason(approved, edits=[{"old_string": "status: draft",
                                        "new_string": "status: active"},
                                       {"old_string": " (미확정)", "new_string": ""}]) is None,
               "design-lock: dropping (미확정) markers on activation denied")
        expect(reason(approved, old_string="30분 (미확정)", new_string="60분"),
               "design-lock: value change hidden in marker removal allowed")
        expect(reason(other, old_string="# Other", new_string="# Changed") is None,
               "design-lock: design outside '승인된 설계' section denied")
        approved.write_text(
            "---\nstatus: draft\n---\n\n# Login API\n\nPOST /login\n\n"
            "응답 예시:\n\n```\nstatus: \"ok\"\n```\n", encoding="utf-8")
        expect(reason(approved, edits=[
                {"old_string": "status: draft", "new_string": "status: active"},
                {"old_string": 'status: "ok"', "new_string": 'status: "error"'}]),
               "design-lock: body line starting with 'status:' lets content change through")
        expect(not hook_denies(agent_guard.design_lock, {"tool_input": {
            "file_path": str(approved), "content": "x"}}),
               "design-lock: main session denied")


def check_log_order():
    head = "# Agent Work Log\n\n```text\nYYYY-MM-DD HH:mm | command\n```\n\n## Log\n\n"
    cases = [
        ("2026-09-15 15:59 | a | x\n2026-09-15 16:01 | b | y\n", 0, "in-order log"),
        ("2026-09-15 16:10 | a | x\n2026-09-15 15:59 | b | y\n", 1, "reversed times"),
        ("2026-09-15 16:10 | a | x\n2026-09-14 --:-- | b | y\n", 1, "reversed dates"),
        ("2026-09-15 16:10 | a | x\n2026-09-15 --:-- | b | y\n"
         "2026-09-15 16:20 | c | z\n", 0, "unknown time"),
        ("2026-09-15 4pm | a | x\n", 1, "malformed entry"),
    ]
    for body, want, label in cases:
        lint_wiki.errors[:] = []
        lint_wiki.check_log(head + body)
        expect(len(lint_wiki.errors) == want,
               f"log check on {label}: {len(lint_wiki.errors)} FAIL(s), want {want}")


def check_rule_text():
    """Rule sentences that closed a flow gap. Pinned by key phrase so an edit
    that drops the rule fails here instead of reopening the gap."""
    root = Path(__file__).resolve().parent.parent
    agents = root / ".claude" / "agents"
    want = {
        root / ".claude" / "rules" / "dev-common.md": [
            "database → backend → frontend",      # design runs one at a time
            "승인된 설계",                          # approval is recorded
            "반려",                                # rejection path
            "설계 문서와 dev-task 문서를",           # both go active
            "설계 단계가 아닐 때",                   # peers answer only after design
            "설계 변경 필요",
            "누구도 승인된 설계 문서의 내용을 고치지 않는다",  # pm-called agents too
            "의존이 없고 수정할 파일이 겹치지 않을 때만 병렬",  # implementation order
            "`- [[문서명]] — 승인일",               # format the design-lock hook parses
            "설계 승인은 그 문서에 적힌 값의 확정이다",  # approval confirms (미확정) values
            "이미 \"승인된 설계\"에 오른 문서를 고쳐야 하면",  # new request unlists first
            "## Jev 도입 제안",                      # agents surface Jev candidates
            "(추정, 근거:",                          # figures need a measured basis
        ],
        root / ".claude" / "rules" / "knowledge-ops.md": ["--:--"],
        agents / "pm.md": ["database → backend → frontend", "승인된 설계", "반려",
                           "`설계 변경 필요`는 재위임하지 않는다",
                           "의존이 없고 수정할 파일이 겹치지 않을 때만 병렬",
                           "새 요청이 승인된 설계를 고쳐야 하면",
                           "설계 승인은 문서에 적힌 값의 확정이다",
                           "Jev 도입 제안"],
        agents / "code-review.md": ["`구현 수정`", "`설계 변경 필요`"],
        agents / "database.md": ["backend와 조율한 내용"],
    }
    for name in ("backend", "frontend", "database"):
        want.setdefault(agents / f"{name}.md", []).extend(
            ["승인된 설계", "설계 문서와 dev-task 문서를", "`(미확정)` 표시를 지운다"])
    for path, phrases in want.items():
        text = path.read_text(encoding="utf-8")
        for p in phrases:
            expect(p in text, f"{path.name} lost rule phrase: {p}")

    settings = (root / ".claude" / "settings.json").read_text(encoding="utf-8")
    expect("design-lock" in settings, "settings.json no longer wires the design-lock hook")


CHECKS = [check_index_filter, check_git_write, check_call_graph, check_design_lock,
          check_log_order, check_rule_text]


def main():
    for check in CHECKS:
        check()
    for f in failures:
        print(f"FAIL  {f}", file=sys.stderr)
    if failures:
        print(f"{len(failures)} rule regression(s).", file=sys.stderr)
        return 1
    print(f"Rule regression checks passed ({len(CHECKS)} groups).")
    return 0


if __name__ == "__main__":
    sys.exit(main())
