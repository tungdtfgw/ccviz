#!/bin/bash
# Robot Runner CC - MCP tool completion hook
# Sends MCP tool:post events to visualization server (triggered by PostToolUse with mcp__* matcher)

SERVER_URL="${ROBOTRUNCC_SERVER:-http://localhost:3847}"
TIMESTAMP=$(date +%s000)

# Read stdin JSON for tool data
INPUT=$(cat)
SESSION_ID=$(echo "$INPUT" | jq -r '.session_id // empty')
TOOL_NAME=$(echo "$INPUT" | jq -r '.tool_name // empty')

# Fallback values
if [ -z "$SESSION_ID" ]; then
  SESSION_ID="session-main"
fi

# Check if this is an MCP tool (pattern: mcp__<server>__<tool>)
if [[ "$TOOL_NAME" =~ ^mcp__([^_]+)__(.+)$ ]]; then
  MCP_SERVER="${BASH_REMATCH[1]}"

  curl -s -X POST "$SERVER_URL/api/events" \
    -H "Content-Type: application/json" \
    -d "{
      \"type\": \"tool:post\",
      \"timestamp\": $TIMESTAMP,
      \"payload\": {
        \"sessionId\": \"$SESSION_ID\",
        \"toolName\": \"$TOOL_NAME\",
        \"isMcp\": true,
        \"mcpServer\": \"$MCP_SERVER\"
      }
    }" &>/dev/null &
fi

# Always exit 0 to not block Claude Code
exit 0
