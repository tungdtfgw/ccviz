#!/bin/bash
# Robot Runner CC - Test Script for Session Lifecycle
# Tests the complete flow: session start -> context update -> subagent -> session end

SERVER_URL="${1:-http://localhost:3847}"
SESSION_ID="test-$(date +%s)"

echo "========================================"
echo "Robot Runner CC - Session Lifecycle Test"
echo "========================================"
echo "Server URL: $SERVER_URL"
echo "Session ID: $SESSION_ID"
echo ""

# 1. Start session
echo "1. Starting session..."
curl -s -X POST "$SERVER_URL/api/events" \
  -H "Content-Type: application/json" \
  -d "{
    \"type\": \"session:start\",
    \"timestamp\": $(date +%s000),
    \"payload\": {
      \"sessionId\": \"$SESSION_ID\",
      \"contextPercent\": 0
    }
  }"
echo ""
echo "   -> Customer should walk in and sit at table"
sleep 2

# 2. Update context to 30%
echo ""
echo "2. Updating context to 30%..."
curl -s -X POST "$SERVER_URL/api/events" \
  -H "Content-Type: application/json" \
  -d "{
    \"type\": \"context:update\",
    \"timestamp\": $(date +%s000),
    \"payload\": {
      \"sessionId\": \"$SESSION_ID\",
      \"percent\": 30,
      \"tokens\": 75000
    }
  }"
echo ""
echo "   -> Beer tower should show 70% remaining"
sleep 2

# 3. Spawn subagent (code-reviewer)
echo ""
echo "3. Spawning subagent (code-reviewer)..."
curl -s -X POST "$SERVER_URL/api/events" \
  -H "Content-Type: application/json" \
  -d "{
    \"type\": \"subagent:start\",
    \"timestamp\": $(date +%s000),
    \"payload\": {
      \"sessionId\": \"$SESSION_ID\",
      \"agentId\": \"agent-1\",
      \"agentType\": \"code-reviewer\",
      \"description\": \"Reviewing pull request\"
    }
  }"
echo ""
echo "   -> Sub-agent should walk in wearing same team colors"
sleep 3

# 4. Update context to 50%
echo ""
echo "4. Updating context to 50%..."
curl -s -X POST "$SERVER_URL/api/events" \
  -H "Content-Type: application/json" \
  -d "{
    \"type\": \"context:update\",
    \"timestamp\": $(date +%s000),
    \"payload\": {
      \"sessionId\": \"$SESSION_ID\",
      \"percent\": 50,
      \"tokens\": 125000
    }
  }"
echo ""
echo "   -> Beer tower should show 50% remaining"
sleep 2

# 5. Complete subagent
echo ""
echo "5. Completing subagent..."
curl -s -X POST "$SERVER_URL/api/events" \
  -H "Content-Type: application/json" \
  -d "{
    \"type\": \"subagent:stop\",
    \"timestamp\": $(date +%s000),
    \"payload\": {
      \"sessionId\": \"$SESSION_ID\",
      \"agentId\": \"agent-1\",
      \"agentType\": \"code-reviewer\",
      \"result\": \"LGTM\"
    }
  }"
echo ""
echo "   -> Sub-agent should leave"
sleep 2

# 6. Update context to 80%
echo ""
echo "6. Updating context to 80%..."
curl -s -X POST "$SERVER_URL/api/events" \
  -H "Content-Type: application/json" \
  -d "{
    \"type\": \"context:update\",
    \"timestamp\": $(date +%s000),
    \"payload\": {
      \"sessionId\": \"$SESSION_ID\",
      \"percent\": 80,
      \"tokens\": 200000
    }
  }"
echo ""
echo "   -> Beer tower should show 20% remaining (almost empty)"
sleep 2

# 7. End session
echo ""
echo "7. Ending session..."
curl -s -X POST "$SERVER_URL/api/events" \
  -H "Content-Type: application/json" \
  -d "{
    \"type\": \"session:end\",
    \"timestamp\": $(date +%s000),
    \"payload\": {
      \"sessionId\": \"$SESSION_ID\"
    }
  }"
echo ""
echo "   -> Customer should leave, waiter picks up beer tower"

echo ""
echo "========================================"
echo "Test complete!"
echo "========================================"
