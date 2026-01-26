#!/bin/bash
# Robot Runner CC - Subagent lifecycle hook
# Sends subagent start/stop events to visualization server

SERVER_URL="${ROBOTRUNCC_SERVER:-http://localhost:3847}"
TIMESTAMP=$(date +%s000)

# Read stdin JSON for subagent data
INPUT=$(cat)
SESSION_ID=$(echo "$INPUT" | jq -r '.session_id // empty')
HOOK_EVENT=$(echo "$INPUT" | jq -r '.hook_event_name // empty')
AGENT_ID=$(echo "$INPUT" | jq -r '.agent_id // empty')
AGENT_TYPE=$(echo "$INPUT" | jq -r '.agent_type // "unknown"')

# Skip if no session ID
if [ -z "$SESSION_ID" ]; then
  exit 0
fi
# Skip if no agent ID (required for tracking)
if [ -z "$AGENT_ID" ]; then
  exit 0
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
  SubagentStart)
    send_event "subagent:start" "{\"sessionId\": \"$SESSION_ID\", \"agentId\": \"$AGENT_ID\", \"agentType\": \"$AGENT_TYPE\"}"
    ;;
  SubagentStop)
    send_event "subagent:stop" "{\"sessionId\": \"$SESSION_ID\", \"agentId\": \"$AGENT_ID\", \"agentType\": \"$AGENT_TYPE\"}"
    ;;
esac

# Always exit 0 to not block Claude Code
exit 0
