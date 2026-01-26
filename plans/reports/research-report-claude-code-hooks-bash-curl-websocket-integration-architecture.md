# Claude Code Hooks System Research Report

**Research Date:** 2026-01-26 | **Researcher:** researcher-ade870f

## Executive Summary

Claude Code's hooks system is **production-ready event-driven automation** that executes in response to development lifecycle events. Hooks run as bash commands or prompt-based LLM evaluations, making HTTP/WebSocket integration **fully supported** via bash curl/nc commands.

**Key Finding:** Hooks cannot directly use WebSocket libraries (no Node.js/Python available in hook context), but can integrate with external WebSocket servers via shell commands with curl for HTTP and netcat (nc) for UDP metrics.

---

## 1. Hook Architecture & Event Types

### Available Hook Events
```
PreToolUse      → Before any tool execution (validation, modification)
PostToolUse     → After tool completes (feedback, logging)
UserPromptSubmit→ User submits prompt (context injection, validation)
Stop            → Agent considers stopping (completion validation)
SubagentStop    → Subagent considers stopping (task validation)
SessionStart     → Session begins (environment setup, context loading)
SessionEnd      → Session ends (cleanup, logging)
PreCompact      → Before context compaction (preserve critical info)
Notification    → User receives notification (logging, reactions)
```

### Hook Type Categories

**1. Prompt-Based Hooks (LLM-Driven)**
- Use: `"type": "prompt"`
- Context-aware decision making via natural language
- Supports: PreToolUse, PostToolUse, Stop, SubagentStop, UserPromptSubmit
- Timeout: 30s default (configurable)
- Output: JSON decisions (`approve`, `deny`, `ask`)

**2. Command Hooks (Bash Scripts)**
- Use: `"type": "command"` with bash script path
- Deterministic validation, fast checks, external tool integration
- Supports: All events
- Timeout: 60s default (configurable)
- Output: Exit code (0=success, 2=blocking error) + stdout/stderr JSON

---

## 2. Hook Configuration Format

### Two Configuration Locations

**A. Plugin Hooks** (`hooks/hooks.json` in plugin)
```json
{
  "description": "Optional description",
  "hooks": {
    "PreToolUse": [...],
    "Stop": [...]
  }
}
```
- Wraps event handlers in `"hooks"` object
- Merges with user hooks at runtime
- Loaded when session starts

**B. User Settings** (`.claude/settings.json`)
```json
{
  "PreToolUse": [...],
  "Stop": [...]
}
```
- Direct format (no wrapper)
- Persists across sessions
- Per-project configuration

### Hook Structure
```json
{
  "matcher": "Write|Edit",          // Tool names or regex (regex: "mcp__.*__delete.*")
  "hooks": [
    {
      "type": "command|prompt",
      "command": "bash script.sh",   // For command hooks
      "prompt": "Natural language...",// For prompt hooks
      "timeout": 30                   // Seconds (optional)
    }
  ]
}
```

---

## 3. External Service Integration Patterns

### HTTP Integration (Curl)
**Available via command hooks:**
```bash
#!/bin/bash
input=$(cat)
tool_name=$(echo "$input" | jq -r '.tool_name')

# Send to WebSocket-compatible HTTP endpoint
curl -X POST "http://localhost:8080/api/event" \
  -H 'Content-Type: application/json' \
  -d "{\"event\": \"${tool_name}\", \"timestamp\": $(date +%s000)}" \
  2>/dev/null

exit 0
```

### Metrics Collection (UDP/StatsD)
**For lightweight event streaming:**
```bash
#!/bin/bash
input=$(cat)
tool_name=$(echo "$input" | jq -r '.tool_name')

# Send to StatsD-compatible server
echo "hook.pretooluse.${tool_name}:1|c" | nc -u -w1 localhost 8125

exit 0
```

### Slack Webhook Integration
```bash
#!/bin/bash
input=$(cat)
tool_name=$(echo "$input" | jq -r '.tool_name')

curl -X POST "$SLACK_WEBHOOK" \
  -H 'Content-Type: application/json' \
  -d "{\"text\": \"Tool used: ${tool_name}\"}" \
  2>/dev/null
```

### WebSocket Integration Strategy
**Recommended approach** (WebSocket is bidirectional but hooks are fire-and-forget):

1. **Direct HTTP POST** to WebSocket server's HTTP endpoint
   - Most WebSocket servers expose `/api/` REST endpoints
   - Simple curl integration in command hooks

2. **Message Queue** (indirect approach)
   - Hook → Queue (SQS, RabbitMQ via API)
   - Separate service consumes queue → WebSocket broadcast

3. **File-Based Events** (for local servers)
   - Write events to named pipe or file
   - Local server reads and broadcasts

---

## 4. Hook Input/Output Format

### Input (Stdin JSON)
```json
{
  "session_id": "abc123",
  "hook_event_name": "PreToolUse",
  "cwd": "/current/dir",
  "tool_name": "Write",
  "tool_input": {"file_path": "/path/to/file", ...},
  "tool_result": {...},
  "transcript_path": "/path/to/transcript.txt"
}
```

**Access in prompt hooks via:** `$TOOL_INPUT`, `$TOOL_RESULT`, `$USER_PROMPT`

### Output Format (Command Hooks)

**Standard format (all events):**
```json
{
  "continue": true,
  "suppressOutput": false,
  "systemMessage": "Message for Claude"
}
```

**Decision format (Stop/PreToolUse):**
```json
{
  "hookSpecificOutput": {
    "permissionDecision": "allow|deny|ask"
  },
  "systemMessage": "Reason/explanation"
}
```

**Exit codes:**
- `0` → Success (stdout shown in transcript)
- `2` → Blocking error (stderr fed to Claude)
- Other → Non-blocking error

---

## 5. Environment Variables Available

In all command hooks:
```bash
$CLAUDE_PROJECT_DIR    # Project root
$CLAUDE_PLUGIN_ROOT    # Plugin directory (use for portable paths)
$CLAUDE_ENV_FILE       # SessionStart only: persist vars
$CLAUDE_CODE_REMOTE    # Set if in remote context
```

---

## 6. Implementation Patterns for Pixel Art Bar Scene

### Pattern A: SessionStart → Initialize Connection
```json
{
  "SessionStart": [
    {
      "matcher": "*",
      "hooks": [
        {
          "type": "command",
          "command": "bash ${CLAUDE_PLUGIN_ROOT}/scripts/init-websocket.sh",
          "timeout": 5
        }
      ]
    }
  ]
}
```

**Script (`init-websocket.sh`):**
```bash
#!/bin/bash
set -euo pipefail

WS_SERVER="localhost:9000"
# Test connection
curl -s "http://${WS_SERVER}/health" > /dev/null 2>&1 || {
  echo "⚠️ WebSocket server not available at ${WS_SERVER}" >&2
  exit 0  # Non-blocking
}

# Persist for other hooks
echo "export WS_SERVER='${WS_SERVER}'" >> "$CLAUDE_ENV_FILE"

exit 0
```

### Pattern B: PostToolUse → Send Events
```json
{
  "PostToolUse": [
    {
      "matcher": "*",
      "hooks": [
        {
          "type": "command",
          "command": "bash ${CLAUDE_PLUGIN_ROOT}/scripts/send-event.sh",
          "timeout": 2
        }
      ]
    }
  ]
}
```

**Script (`send-event.sh`):**
```bash
#!/bin/bash
input=$(cat)

tool_name=$(echo "$input" | jq -r '.tool_name')
timestamp=$(date +%s%3N)  # Milliseconds
session=$(echo "$input" | jq -r '.session_id')

# Build event payload
event=$(jq -n \
  --arg tool "$tool_name" \
  --arg ts "$timestamp" \
  --arg sid "$session" \
  '{type: "tool_use", tool: $tool, timestamp: $ts | tonumber, session_id: $sid}')

# Send to WebSocket server HTTP endpoint
curl -s -X POST "http://localhost:9000/api/event" \
  -H 'Content-Type: application/json' \
  -d "$event" \
  2>/dev/null

exit 0
```

### Pattern C: Multiple Events (Subagent Spawn)
For subagent spawning (via SubagentStop hook):
```bash
#!/bin/bash
input=$(cat)

# Extract subagent context
reason=$(echo "$input" | jq -r '.reason')
timestamp=$(date +%s%3N)

curl -s -X POST "http://localhost:9000/api/event" \
  -H 'Content-Type: application/json' \
  -d "{\"type\": \"subagent_stop\", \"reason\": \"${reason}\", \"timestamp\": ${timestamp}}" \
  2>/dev/null

exit 0
```

---

## 7. Critical Constraints & Best Practices

### Constraints
- **No hot-swap:** Changes to hooks require session restart
- **Parallel execution:** Hooks run in parallel, don't order dependencies
- **Timeouts:** Default 30s (prompt) / 60s (command)
- **No bidirectional:** Fire-and-forget; cannot read WebSocket responses
- **Limited environment:** Bash only, no Node.js/Python available

### Best Practices for WebSocket Integration
1. **Keep hooks fast:** Curl requests should timeout quickly (use `-m 2`)
2. **Non-blocking:** Return exit 0 even if WebSocket server unavailable
3. **Batch events:** Don't overwhelm WebSocket server with high-frequency hooks
4. **Error handling:** Suppress errors with `2>/dev/null` to avoid blocking Claude
5. **Use matchers:** Target specific tools (e.g., `"matcher": "Write|Edit"`) vs wildcard

### Example Event Batching
```bash
#!/bin/bash
input=$(cat)
CACHE_FILE="/tmp/hook-events-$$"

# Accumulate event
echo "$input" >> "$CACHE_FILE"

# Batch send every 5 events or 10 seconds
event_count=$(wc -l < "$CACHE_FILE")
if [ "$event_count" -ge 5 ]; then
  events=$(cat "$CACHE_FILE" | jq -s .)
  curl -s -X POST "http://localhost:9000/api/batch" \
    -H 'Content-Type: application/json' \
    -d "$events" 2>/dev/null
  > "$CACHE_FILE"  # Clear
fi

exit 0
```

---

## 8. Testing & Debugging

### Debug Mode
```bash
claude --debug
```
Shows hook registration, execution logs, input/output JSON, timing.

### Manual Hook Testing
```bash
echo '{"tool_name": "Write", "tool_input": {"file_path": "/test"}}' | \
  bash scripts/your-hook.sh

echo "Exit code: $?"
```

### Validate JSON Output
```bash
output=$(./your-hook.sh < test-input.json)
echo "$output" | jq .
```

---

## 9. Recommended Architecture

```
robotruncc/
├── .claude/
│   └── settings.json          # User hook config
├── hooks/
│   ├── send-event.sh          # PostToolUse → WebSocket
│   ├── init-websocket.sh      # SessionStart → verify connection
│   └── batch-events.sh        # Optional: batch sending
└── pixel-bar-scene/
    └── ws-server.js           # Local WebSocket server (separate process)
```

---

## 10. Event Payload Example for Pixel Art Scene

**Recommended format for visualization:**
```json
{
  "type": "tool_use|session_start|subagent_spawn|skill_use|code_modified",
  "timestamp": 1705104000000,
  "session_id": "abc123",
  "actor": "claude|subagent-X",
  "tool_name": "Write|Edit|Bash|Read",
  "context": {
    "file_path": "/path/to/file",
    "lines_modified": 45,
    "subagent_type": "planner|implementer",
    "skill_name": "research|debug"
  }
}
```

---

## Unresolved Questions

1. **WebSocket Server Library:** Will you build WebSocket server in Node.js or use existing library (e.g., ws, socket.io)?
2. **Event Frequency:** How many events per minute expected? (affects batching strategy)
3. **State Persistence:** Should pixel bar scene track session history or reset per session?
4. **Bidirectional:** Any need for server → hook communication (e.g., pause/resume)?

---

## References

- Official docs: https://docs.claude.com/en/docs/claude-code/hooks
- Hook development skill: `/Users/tungdt/.claude/plugins/marketplaces/claude-plugins-official/plugins/plugin-dev/skills/hook-development/`
- Advanced patterns: `references/advanced.md` (Slack, DB logging, metrics collection examples)
