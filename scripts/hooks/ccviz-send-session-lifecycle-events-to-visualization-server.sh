#!/bin/bash
# Robot Runner CC - Session lifecycle hook
# Sends session start/end events to visualization server

SERVER_URL="${ROBOTRUNCC_SERVER:-http://localhost:3847}"
TIMESTAMP=$(date +%s000)

# Read stdin JSON for session data
INPUT=$(cat)
SESSION_ID=$(echo "$INPUT" | jq -r '.session_id // empty')
HOOK_EVENT=$(echo "$INPUT" | jq -r '.hook_event_name // empty')

# Fallback session ID if not provided
if [ -z "$SESSION_ID" ]; then
  SESSION_ID="session-$$"
fi

send_event() {
  local event_type="$1"
  local payload="$2"

  curl -s -X POST "$SERVER_URL/api/events" \
    -H "Content-Type: application/json" \
    -d "{
      \"type\": \"$event_type\",
      \"timestamp\": $TIMESTAMP,
      \"payload\": $payload
    }" &>/dev/null &
}

case "$HOOK_EVENT" in
  SessionStart)
    send_event "session:start" "{\"sessionId\": \"$SESSION_ID\", \"contextPercent\": 0}"
    ;;
  SessionEnd)
    send_event "session:end" "{\"sessionId\": \"$SESSION_ID\"}"
    ;;
esac

# Always exit 0 to not block Claude Code
exit 0
