#!/usr/bin/env bash
# PreToolUse / Bash gate: block `git commit` and `git push` unless
# `npm run build` has succeeded in the current Claude session.
# Coexists with claude-flow's hook-handler.cjs (additive, separate matcher).

set -u
input=$(cat)
command=$(printf '%s' "$input" | jq -r '.tool_input.command // ""')
session_id=$(printf '%s' "$input" | jq -r '.session_id // "default"')

# Match `git commit` or `git push` as the actual git subcommand
# (allow leading whitespace, &&, ;, |, env vars, etc.)
if printf '%s' "$command" | grep -qE '(^|[[:space:];&|()])git[[:space:]]+(commit|push)([[:space:]]|$)'; then
  marker="/tmp/ge-build-ok-${session_id}"
  if [ ! -f "$marker" ]; then
    echo "Build not verified in this session. Run \`npm run build\` first." >&2
    exit 2
  fi
fi
exit 0
