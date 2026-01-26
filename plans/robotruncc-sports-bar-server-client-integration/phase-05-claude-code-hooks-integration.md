---
title: "Phase 5: Claude Code Hooks Integration"
description: "Create hooks to send events from Claude Code to visualization server"
status: completed
priority: P2
effort: 1.5h
---

# Phase 5: Claude Code Hooks Integration

## Context Links
- Main plan: [robotruncc-complete-server-client-integration-plan-overview.md](./robotruncc-complete-server-client-integration-plan-overview.md)
- Requires server: [phase-02-bun-socketio-server-setup.md](./phase-02-bun-socketio-server-setup.md)
- Event types: [phase-01-shared-types-module.md](./phase-01-shared-types-module.md)

## Overview
- **Priority**: P2 - Required for real-world usage
- **Status**: Pending (blocked by server being functional)
- **Effort**: 1.5 hours

Create Claude Code hooks that POST events to the visualization server, enabling real-time visualization of CC activities.

## Key Insights
- Claude Code hooks execute shell commands on various lifecycle events
- Use curl for HTTP POST (widely available, no dependencies)
- Hooks must be lightweight (non-blocking)
- Server endpoint: `http://localhost:3847/api/events`
- Session ID from `$CLAUDE_SESSION_ID` env var or generate UUID

## Research Findings Summary

Based on thorough research of Claude Code hooks API:

| Feature | Available | Method | Notes |
|---------|-----------|--------|-------|
| Context % | Yes | Status hook (statusline) | `context_window.used_percentage` |
| Subagent ID | Yes | SubagentStart/Stop | `agent_id`, `agent_type` |
| MCP Tools | Yes | PreToolUse/PostToolUse | Pattern: `mcp__<server>__<tool>` |
| Skill Names | **NO** | N/A | No global hook exists |

## Requirements

### Functional
- Hook for session start (SessionStart)
- Hook for session end (SessionStop/Stop)
- Hook for subagent spawn (SubagentStart)
- Hook for subagent completion (SubagentStop)
- Hook for MCP tool invocation (PreToolUse, PostToolUse with `mcp__` prefix detection)
- Status hook for context updates (statusline only)

### Non-Functional
- Non-blocking (background curl)
- Fail silently if server unavailable
- Minimal latency impact

## Architecture

```
.claude/hooks/
├── sessions-hook.sh       # PreSession, PostSession
├── subagent-hook.sh       # SubagentStart, SubagentStop  
├── tool-hook.sh           # PreToolUse, PostToolUse
└── context-hook.sh        # ContextUpdate (if available)
```

### Hook Configuration (settings.json)
```json
{
  "hooks": {
    "SessionStart": [{ "type": "command", "command": "bash ./.claude/hooks/sessions-hook.sh start" }],
    "Stop": [{ "type": "command", "command": "bash ./.claude/hooks/sessions-hook.sh end" }],
    "SubagentStart": [{ "type": "command", "command": "bash ./.claude/hooks/subagent-hook.sh start" }],
    "SubagentStop": [{ "type": "command", "command": "bash ./.claude/hooks/subagent-hook.sh stop" }],
    "PreToolUse": [{ "type": "command", "matcher": "mcp__.*", "command": "bash ./.claude/hooks/mcp-hook.sh" }]
  }
}
```

### Statusline Configuration (for context %)
```json
{
  "statusline": {
    "enabled": true,
    "hooks": [{
      "type": "command",
      "command": "bash ./.claude/hooks/status-hook.sh"
    }]
  }
}
```

## Related Code Files

### Files to Create
- `.claude/hooks/sessions-hook.sh`
- `.claude/hooks/subagent-hook.sh`
- `.claude/hooks/tool-hook.sh`
- `.claude/settings.local.json` (hook configuration)

### Server Endpoint
```
POST http://localhost:3847/api/events
Content-Type: application/json

{
  "type": "session:start",
  "timestamp": 1706300000000,
  "payload": { "sessionId": "abc123", "contextPercent": 0 }
}
```

## Implementation Steps

### Step 1: Create `.claude/hooks/sessions-hook.sh`
```bash
#!/bin/bash
# Robot Runner CC - Session lifecycle hook
# Usage: sessions-hook.sh [start|end]

SERVER_URL="${ROBOTRUNCC_SERVER:-http://localhost:3847}"
SESSION_ID="${CLAUDE_SESSION_ID:-$(uuidgen 2>/dev/null || cat /proc/sys/kernel/random/uuid 2>/dev/null || echo "session-$$")}"
TIMESTAMP=$(date +%s000)

action="$1"

case "$action" in
  start)
    curl -s -X POST "$SERVER_URL/api/events" \
      -H "Content-Type: application/json" \
      -d "{
        \"type\": \"session:start\",
        \"timestamp\": $TIMESTAMP,
        \"payload\": {
          \"sessionId\": \"$SESSION_ID\",
          \"contextPercent\": 0
        }
      }" &>/dev/null &
    ;;
  end)
    curl -s -X POST "$SERVER_URL/api/events" \
      -H "Content-Type: application/json" \
      -d "{
        \"type\": \"session:end\",
        \"timestamp\": $TIMESTAMP,
        \"payload\": {
          \"sessionId\": \"$SESSION_ID\"
        }
      }" &>/dev/null &
    ;;
  *)
    echo "Usage: $0 [start|end]" >&2
    exit 1
    ;;
esac
```

### Step 2: Create `.claude/hooks/subagent-hook.sh`
```bash
#!/bin/bash
# Robot Runner CC - Subagent lifecycle hook
# Usage: subagent-hook.sh [start|stop]

SERVER_URL="${ROBOTRUNCC_SERVER:-http://localhost:3847}"
SESSION_ID="${CLAUDE_SESSION_ID:-default-session}"
AGENT_ID="${CLAUDE_SUBAGENT_ID:-agent-$$}"
AGENT_TYPE="${CLAUDE_SUBAGENT_TYPE:-unknown}"
DESCRIPTION="${CLAUDE_SUBAGENT_DESCRIPTION:-}"
RESULT="${CLAUDE_SUBAGENT_RESULT:-}"
TIMESTAMP=$(date +%s000)

action="$1"

case "$action" in
  start)
    curl -s -X POST "$SERVER_URL/api/events" \
      -H "Content-Type: application/json" \
      -d "{
        \"type\": \"subagent:start\",
        \"timestamp\": $TIMESTAMP,
        \"payload\": {
          \"sessionId\": \"$SESSION_ID\",
          \"agentId\": \"$AGENT_ID\",
          \"agentType\": \"$AGENT_TYPE\",
          \"description\": \"$DESCRIPTION\"
        }
      }" &>/dev/null &
    ;;
  stop)
    curl -s -X POST "$SERVER_URL/api/events" \
      -H "Content-Type: application/json" \
      -d "{
        \"type\": \"subagent:stop\",
        \"timestamp\": $TIMESTAMP,
        \"payload\": {
          \"sessionId\": \"$SESSION_ID\",
          \"agentId\": \"$AGENT_ID\",
          \"agentType\": \"$AGENT_TYPE\",
          \"result\": \"$RESULT\"
        }
      }" &>/dev/null &
    ;;
  *)
    echo "Usage: $0 [start|stop]" >&2
    exit 1
    ;;
esac
```

### Step 3: Create `.claude/hooks/tool-hook.sh`
```bash
#!/bin/bash
# Robot Runner CC - Tool usage hook
# Usage: tool-hook.sh [pre|post]

SERVER_URL="${ROBOTRUNCC_SERVER:-http://localhost:3847}"
SESSION_ID="${CLAUDE_SESSION_ID:-default-session}"
TOOL_NAME="${CLAUDE_TOOL_NAME:-unknown}"
IS_MCP="${CLAUDE_TOOL_IS_MCP:-false}"
MCP_SERVER="${CLAUDE_MCP_SERVER:-}"
TIMESTAMP=$(date +%s000)

action="$1"

case "$action" in
  pre)
    curl -s -X POST "$SERVER_URL/api/events" \
      -H "Content-Type: application/json" \
      -d "{
        \"type\": \"tool:pre\",
        \"timestamp\": $TIMESTAMP,
        \"payload\": {
          \"sessionId\": \"$SESSION_ID\",
          \"toolName\": \"$TOOL_NAME\",
          \"isMcp\": $IS_MCP,
          \"mcpServer\": \"$MCP_SERVER\"
        }
      }" &>/dev/null &
    ;;
  post)
    curl -s -X POST "$SERVER_URL/api/events" \
      -H "Content-Type: application/json" \
      -d "{
        \"type\": \"tool:post\",
        \"timestamp\": $TIMESTAMP,
        \"payload\": {
          \"sessionId\": \"$SESSION_ID\",
          \"toolName\": \"$TOOL_NAME\",
          \"isMcp\": $IS_MCP
        }
      }" &>/dev/null &
    ;;
  *)
    echo "Usage: $0 [pre|post]" >&2
    exit 1
    ;;
esac
```

### Step 4: Create `.claude/hooks/skill-hook.sh`
```bash
#!/bin/bash
# Robot Runner CC - Skill usage hook
# Usage: skill-hook.sh

SERVER_URL="${ROBOTRUNCC_SERVER:-http://localhost:3847}"
SESSION_ID="${CLAUDE_SESSION_ID:-default-session}"
SKILL_NAME="${CLAUDE_SKILL_NAME:-unknown}"
TIMESTAMP=$(date +%s000)

curl -s -X POST "$SERVER_URL/api/events" \
  -H "Content-Type: application/json" \
  -d "{
    \"type\": \"skill:use\",
    \"timestamp\": $TIMESTAMP,
    \"payload\": {
      \"sessionId\": \"$SESSION_ID\",
      \"skillName\": \"$SKILL_NAME\"
    }
  }" &>/dev/null &
```

### Step 5: Create `.claude/settings.local.json`
```json
{
  "hooks": {
    "PreSession": [
      {
        "type": "command",
        "command": "bash ./.claude/hooks/sessions-hook.sh start"
      }
    ],
    "PostSession": [
      {
        "type": "command", 
        "command": "bash ./.claude/hooks/sessions-hook.sh end"
      }
    ],
    "SubagentStart": [
      {
        "type": "command",
        "command": "bash ./.claude/hooks/subagent-hook.sh start"
      }
    ],
    "SubagentStop": [
      {
        "type": "command",
        "command": "bash ./.claude/hooks/subagent-hook.sh stop"
      }
    ],
    "PreToolUse": [
      {
        "type": "command",
        "command": "bash ./.claude/hooks/tool-hook.sh pre"
      }
    ],
    "PostToolUse": [
      {
        "type": "command",
        "command": "bash ./.claude/hooks/tool-hook.sh post"
      }
    ]
  }
}
```

### Step 6: Make hooks executable
```bash
chmod +x .claude/hooks/*.sh
```

## Todo List
- [ ] Create `.claude/hooks/` directory
- [ ] Implement `sessions-hook.sh`
- [ ] Implement `subagent-hook.sh`
- [ ] Implement `tool-hook.sh`
- [ ] Implement `skill-hook.sh`
- [ ] Create `settings.local.json` hook config
- [ ] Make all hooks executable
- [ ] Test hooks with curl manually
- [ ] Test hooks trigger from Claude Code

## Success Criteria
- [ ] All hook scripts are executable
- [ ] Session start hook fires on Claude Code session start
- [ ] Session end hook fires on session end
- [ ] Subagent hooks fire on task spawning
- [ ] Tool hooks fire on tool invocation
- [ ] Server receives and processes all events
- [ ] Visualization updates in real-time

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Missing env vars | High | Medium | Provide sensible defaults |
| Server unavailable | Medium | Low | Background curl with fail-silent |
| Hook execution delay | Low | Low | Run curl in background (&) |

## Security Considerations
- Hooks only POST to localhost
- No sensitive data in event payloads
- Session IDs are temporary identifiers
- Hooks fail silently if server down

## Next Steps
- Test end-to-end with server and client running
- Tune hook timing if needed
- Consider context update hook if env var available
