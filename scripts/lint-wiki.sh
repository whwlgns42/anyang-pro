#!/usr/bin/env bash
# Thin wrapper kept so `bash scripts/lint-wiki.sh` still works.
# The linter itself is scripts/lint_wiki.py.
exec python "$(dirname "${BASH_SOURCE[0]}")/lint_wiki.py" "$@"
