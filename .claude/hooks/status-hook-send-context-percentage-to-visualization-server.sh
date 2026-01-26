#!/bin/bash
# Robot Runner CC - Statusline hook for context percentage
# Sends context usage updates to visualization server

SERVER_URL="${ROBOTRUNCC_SERVER:-http://localhost:3847}"
TIMESTAMP=$(date +%s000)

# Read stdin JSON for context window data (provided by statusline hook)
INPUT=$(cat)
SESSION_ID=$(echo "$INPUT" | jq -r '.session_id // empty')
USED_PERCENT=$(echo "$INPUT" | jq -r '.context_window.used_percentage // 0' | awk '{printf "%.0f", $1}')
TOTAL_TOKENS=$(echo "$INPUT" | jq -r '.context_window.total_input_tokens // 0')

# Fallback values
if [ -z "$SESSION_ID" ]; then
  SESSION_ID="session-main"
fi

# Only send if we have valid context data
if [ "$USED_PERCENT" != "0" ] && [ "$USED_PERCENT" != "null" ]; then
  curl -s -X POST "$SERVER_URL/api/events" \
    -H "Content-Type: application/json" \
    -d "{
      \"type\": \"context:update\",
      \"timestamp\": $TIMESTAMP,
      \"payload\": {
        \"sessionId\": \"$SESSION_ID\",
        \"percent\": $USED_PERCENT,
        \"tokens\": $TOTAL_TOKENS
      }
    }" &>/dev/null &
fi

# Always exit 0 to not block Claude Code
exit 0
