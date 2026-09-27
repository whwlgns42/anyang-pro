#!/usr/bin/env python3
"""Claude Code hook that enforces agent rules prose alone cannot.

Wired in .claude/settings.json. Subcommands:
  agent-call   PreToolUse on Agent: a project agent may spawn only the types in
               its own frontmatter `Agent(...)`. Claude Code ignores that list
               for subagents, so this hook is what enforces it. Forks get no
               exception: a fork might not carry the caller's agent_type and
               would then escape every other check here.
  git-write    PreToolUse on Bash: among project agents, only git-manager may
               run git commands that change the repository.
  design-lock  PreToolUse on Write/Edit: a design document listed under
               "승인된 설계" in a project document may change only its status
               line and drop "(미확정)" markers (approval confirmed those
               values). Changing an approved design needs the user's re-approval.
  stop-lint    SubagentStop: if the finishing agent owns wiki documents with
               lint FAILs, send it back once to fix them.

The main session (no agent_type) and built-in agents are never restricted.
Any internal error allows the action: a broken guard must not halt all work.
"""
import json
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
AGENTS = ROOT / ".claude" / "agents"
# Global options may sit between `git` and the subcommand (`git -C dir commit`).
# Read-only forms are let through: `stash list/show`, `tag`/`tag -l`, `branch`
# with no argument or a listing flag, `config --get/--list`.
GIT_WRITE = re.compile(
    r"\bgit(?:\s+(?:-[Cc]\s+\S+|--[\w-]+(?:=\S+)?))*\s+(?:"
    r"commit|push|pull|add|rm|mv|reset|init|rebase|merge|cherry-pick|revert|"
    r"clean|restore|checkout|switch|apply|am|worktree|update-ref|"
    r"stash(?!\s+(?:list|show)\b)|"
    r"tag(?=\s+(?!-l\b|--list\b)[^\s|;&])|"
    r"branch(?=\s+(?!-(?:a|r|v|vv|l)\b|--(?:list|all|remotes|show-current|"
    r"contains|merged|no-merged|format)\b)[^\s|;&])|"
    r"config(?=\s)(?!\s+(?:--get|--list|-l\b))"
    r")\b")
APPROVED_SECTION = "승인된 설계"
HEADING_RE = re.compile(r"^(#+)\s+(.*?)\s*$")
WIKILINK_RE = re.compile(r"\[\[([^\]]+)\]\]")
FRONTMATTER_RE = re.compile(r"\A---\s*\n(.*?\n)---\s*\n?", re.S)
STATUS_LINE_RE = re.compile(r"^status:.*$", re.M)
# Approval confirms the design's values, so dropping their "(미확정)" markers
# when the design goes active is not a content change.
UNCONFIRMED_RE = re.compile(r"[ \t]?\(미확정\)")


def project_agent(agent_type):
    return bool(agent_type) and (AGENTS / f"{agent_type}.md").is_file()


def allowed_spawns(agent_type):
    """Names inside Agent(...) on the frontmatter tools line.
    None means unrestricted (no tools line, or a bare Agent)."""
    text = (AGENTS / f"{agent_type}.md").read_text(encoding="utf-8")
    line = re.search(r"^tools:.*$", text, re.M)
    if not line:
        return None
    listed = re.search(r"\bAgent\(([^)]*)\)", line.group(0))
    if listed:
        return {n.strip() for n in listed.group(1).split(",") if n.strip()}
    return None if re.search(r"\bAgent\b", line.group(0)) else set()


def deny(reason):
    print(json.dumps({"hookSpecificOutput": {
        "hookEventName": "PreToolUse",
        "permissionDecision": "deny",
        "permissionDecisionReason": reason}}))


def agent_call(data):
    caller = data.get("agent_type")
    if not project_agent(caller):
        return
    target = (data.get("tool_input") or {}).get("subagent_type") or "general-purpose"
    allowed = allowed_spawns(caller)
    if allowed is None or target in allowed:
        return
    deny(f"{caller} cannot call {target}. Allowed: "
         f"{', '.join(sorted(allowed)) or 'none'} "
         f"(.claude/agents/{caller}.md tools). "
         f"허용 목록 밖의 에이전트는 호출하지 않는다. 필요하면 pm에게 보고한다.")


def git_write(data):
    caller = data.get("agent_type")
    if not project_agent(caller) or caller == "git-manager":
        return
    command = (data.get("tool_input") or {}).get("command", "")
    if GIT_WRITE.search(command):
        deny(f"{caller} may not run repository-changing git commands. "
             f"저장소를 바꾸는 git 명령은 git-manager만 실행한다. "
             f"바꾼 파일 목록과 함께 git-manager에게 커밋을 위임한다.")


def approved_designs(root):
    """Document names linked under a "승인된 설계" heading in project documents."""
    names = set()
    for p in (root / "AI-Sessions" / "wiki" / "projects").glob("*.md"):
        level = None
        for line in p.read_text(encoding="utf-8", errors="replace").splitlines():
            h = HEADING_RE.match(line)
            if h:
                if level is not None and len(h.group(1)) <= level:
                    level = None
                if h.group(2) == APPROVED_SECTION:
                    level = len(h.group(1))
                continue
            if level is not None:
                for raw in WIKILINK_RE.findall(line):
                    names.add(raw.split("|")[0].split("#")[0].strip().rsplit("/", 1)[-1])
    return names


def proposed_text(path, tool_input):
    """File content after the Write/Edit/MultiEdit in tool_input is applied."""
    if "content" in tool_input:
        return tool_input.get("content") or ""
    text = path.read_text(encoding="utf-8", errors="replace") if path.is_file() else ""
    edits = tool_input.get("edits") or [tool_input]
    for e in edits:
        count = -1 if e.get("replace_all") else 1
        text = text.replace(e.get("old_string", ""), e.get("new_string", ""), count)
    return text


def design_lock_reason(root, tool_input):
    """A deny reason if this write changes an approved design beyond its status line."""
    file_path = tool_input.get("file_path")
    if not file_path:
        return None
    path = Path(file_path)
    if not path.is_absolute():
        path = root / path
    design_dir = (root / "AI-Sessions" / "wiki" / "design").resolve()
    if path.suffix != ".md" or design_dir not in path.resolve().parents:
        return None
    if path.stem not in approved_designs(root):
        return None
    old = path.read_text(encoding="utf-8", errors="replace") if path.is_file() else ""
    new = proposed_text(path, tool_input)
    def body(text):
        """Drop only the frontmatter's status line, never one appearing in the
        document body (e.g. a `status:` field inside an API response example),
        so content changes disguised as frontmatter edits are still caught."""
        m = FRONTMATTER_RE.match(text)
        if not m:
            return UNCONFIRMED_RE.sub("", text)
        front = STATUS_LINE_RE.sub("", m.group(0))
        rest = text[m.end():]
        return UNCONFIRMED_RE.sub("", front + rest)

    if body(old) == body(new):
        return None
    return (f"[[{path.stem}]]는 승인된 설계다. status 줄과 (미확정) 표시 말고는 고칠 수 없다. "
            f"바꿔야 하면 멈추고 '설계 변경 필요'로 pm에게 보고한다. pm이 이 문서를 "
            f"프로젝트 문서의 '승인된 설계'에서 빼고 사용자 재승인 절차를 밟는다.")


def design_lock(data):
    caller = data.get("agent_type")
    if not project_agent(caller):
        return
    reason = design_lock_reason(ROOT, data.get("tool_input") or {})
    if reason:
        deny(reason)


def stop_lint(data):
    agent = data.get("agent_type")
    if not project_agent(agent) or data.get("stop_hook_active"):
        return
    r = subprocess.run(
        [sys.executable, str(ROOT / "scripts" / "lint_wiki.py"), "--owner", agent],
        cwd=ROOT, capture_output=True, text=True, encoding="utf-8",
        errors="replace", timeout=60)
    if r.returncode == 0:
        return
    out = (r.stderr + "\n" + r.stdout).strip()[-3000:]
    print(json.dumps({"decision": "block", "reason": (
        "린트 FAIL이 남아 있다 (네가 소유한 문서 또는 소유자가 없는 문서). "
        "네 문서면 고친 뒤 끝낸다. 네 문서가 아니면 고치지 말고 보고에 적는다.\n\n" + out)}))


HANDLERS = {"agent-call": agent_call, "git-write": git_write,
            "design-lock": design_lock, "stop-lint": stop_lint}


def main():
    try:
        data = json.loads(sys.stdin.buffer.read().decode("utf-8", "replace"))
        handler = HANDLERS.get(sys.argv[1] if len(sys.argv) > 1 else "")
        if handler:
            handler(data)
    except Exception as e:  # noqa: BLE001 - fail open by design
        print(f"agent_guard: {e}; allowing", file=sys.stderr)
    return 0


if __name__ == "__main__":
    sys.exit(main())
