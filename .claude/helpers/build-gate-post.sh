#!/usr/bin/env bash
# PostToolUse / Bash gate: marks build success for the current session.
# When `npm run build` completes without obvious failure indicators,
# write /tmp/ge-build-ok-<session_id>. The PreToolUse counterpart
# checks for this marker before allowing `git commit` / `git push`.

set -u
input=$(cat)
command=$(printf '%s' "$input"     | jq -r '.tool_input.command // ""')
session_id=$(printf '%s' "$input"  | jq -r '.session_id // "default"')
stdout=$(printf '%s' "$input"      | jq -r '.tool_response.stdout // ""')
stderr=$(printf '%s' "$input"      | jq -r '.tool_response.stderr // ""')
interrupted=$(printf '%s' "$input" | jq -r '.tool_response.interrupted // false')

# Match `npm run build` (and optional flags), but not `npm run build:foo` etc.
if printf '%s' "$command" | grep -qE '(^|[[:space:];&|()])npm[[:space:]]+run[[:space:]]+build([[:space:]]|$|--)'; then
  if [ "$interrupted" = "true" ]; then
    exit 0
  fi
  combined="${stdout}
${stderr}"
  if printf '%s' "$combined" | grep -qE 'error TS[0-9]+|npm ERR!|Build failed|Found [1-9][0-9]* error|tsc: error'; then
    exit 0
  fi
  marker="/tmp/ge-build-ok-${session_id}"
  touch "$marker"
fi
exit 0
