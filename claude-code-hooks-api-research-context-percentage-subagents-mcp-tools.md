# Claude Code Hooks API Research Findings

**Date**: 2026-01-26
**Research Scope**: Context percentage access, sub-agent information, skill name exposure, MCP tool names in Claude Code hooks

---

## Executive Summary

Researched Claude Code (CC) hooks documentation to identify access mechanisms for:
1. Context percentage - How to get current % of context window used
2. Sub-agent information - Agent ID, type, description when Task tool spawns subagents
3. Skill names - How to identify active skills from within hooks
4. MCP tool names - Env vars or data exposed for MCP server/tool identification

**Critical Finding**: Context percentage is NOT currently accessible via standard hooks. Feature exists only in statusline hooks as a requested but unimplemented feature for general hooks.

---

## 1. Context Window Percentage Access

### Status: PARTIAL (Statusline hook only)

Context percentage **NOT available** in PreToolUse, PostToolUse, or other standard hooks via environment variables or stdin JSON.

**Feature requests**:
- [#6577](https://github.com/anthropics/claude-code/issues/6577) - Context data in statusline hooks
- [#18664](https://github.com/anthropics/claude-code/issues/18664) - CLI flag to query session context usage

### Current workaround: Statusline Hook Only
The **Status hook** (statusline only) receives context data via stdin:

```json
{
  "context_window": {
    "used_percentage": 42,
    "remaining_percentage": 58,
    "current_usage": {
      "input_tokens": 125000,
      "output_tokens": 45000,
      "cache_creation_input_tokens": 30000,
      "cache_read_input_tokens": 0
    },
    "total_input_tokens": 155000,
    "context_window_size": 200000
  }
}
```

User can run `/context` command in main session, but hook scripts cannot access this.

---

## 2. Sub-Agent Information via Hooks

### Status: FULLY AVAILABLE (limited fields)

#### SubagentStart Hook
Fires when Task tool spawns subagent. Input via stdin:

```json
{
  "session_id": "abc123",
  "hook_event_name": "SubagentStart",
  "agent_id": "agent-abc123",
  "agent_type": "code-reviewer"
}
```

**Available fields**:
- `agent_id` - Unique session identifier
- `agent_type` - Built-in or custom agent name

#### SubagentStop Hook
Fires when subagent completes. Input via stdin:

```json
{
  "session_id": "abc123",
  "hook_event_name": "SubagentStop",
  "agent_id": "agent-def456",
  "agent_transcript_path": "~/.claude/projects/.../subagents/agent-def456.jsonl",
  "stop_hook_active": false
}
```

---

## 3. Skill Names Exposure

### Status: NOT AVAILABLE via hooks

Skill names are NOT exposed via environment variables or stdin JSON.

### Workarounds
- `/skills` command in main session
- File system: Check `.claude/skills/` directories
- Indirect: Monitor PreToolUse hooks for patterns

---

## 4. MCP Tool Names

### Status: FULLY AVAILABLE via tool_name field

MCP tool names exposed in PreToolUse and PostToolUse hooks.

#### Tool Name Pattern
Format: `mcp__<server>__<tool>`

Examples:
- `mcp__memory__create_entities`
- `mcp__filesystem__read_file`
- `mcp__github__search_repositories`

#### Hook Matcher Patterns
```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "mcp__memory__.*",
        "hooks": [{"type": "command", "command": "..."}]
      }
    ]
  }
}
```

---

## 5. All Hook Types & Environment Variables

### Hook Events (13 total)
SessionStart, PreToolUse, PermissionRequest, PostToolUse, PostToolUseFailure, UserPromptSubmit, Stop, SubagentStart, SubagentStop, PreCompact, Notification, SessionEnd, Setup

### Environment Variables
```bash
CLAUDE_PROJECT_DIR       # Project root (all hooks)
CLAUDE_CODE_REMOTE       # "true" (web) | empty (CLI)
CLAUDE_ENV_FILE          # SessionStart only
```

### Stdin JSON (All Hooks)
```json
{
  "session_id": "string",
  "transcript_path": "string",
  "cwd": "string",
  "permission_mode": "default|plan|acceptEdits|dontAsk|bypassPermissions",
  "hook_event_name": "string"
}
```

---

## 6. Hook Output Control

### Exit Codes
- `0` - Success (stdout parsed for JSON)
- `2` - Block action (stderr only)
- `1+` - Non-blocking error

### JSON Control (Exit 0)
```json
{
  "continue": true,
  "stopReason": "optional",
  "hookSpecificOutput": {
    "permissionDecision": "allow|deny|ask",
    "updatedInput": {},
    "additionalContext": "string"
  }
}
```

---

## 7. Known Bugs & Limitations

### Bug #9567: Environment Variables Empty
- Hook env vars reported as always "unknown"
- Workaround: Parse stdin JSON instead

### Bug #6577: Context Data Not Exposed
- Context percentage not in standard hooks
- Workaround: Use `/context` command in main session

### Subagent Nesting Limitation
- Subagents cannot spawn other subagents
- Workaround: Chain from main conversation

---

## Summary Table

| Feature | Available | Method | Limitations |
|---------|-----------|--------|-------------|
| **Context %** | Partial | Statusline hook only | Not in PreToolUse/PostToolUse |
| **Subagent ID** | Yes | SubagentStart/Stop | Agent ID only, no config |
| **Subagent Type** | Yes | SessionStart/SubagentStart | Name only |
| **Skill Names** | No | N/A | Use /skills |
| **MCP Tool Names** | Yes | tool_name field | Full name with mcp__ prefix |
| **MCP Server Name** | Yes | Regex extraction | Extract from pattern |

---

## Sources

- [Hooks reference](https://code.claude.com/docs/en/hooks)
- [Get started with hooks](https://code.claude.com/docs/en/hooks-guide)
- [Create custom subagents](https://code.claude.com/docs/en/sub-agents)
- [Status line configuration](https://code.claude.com/docs/en/statusline)
- [Issue #6577 - Context data access](https://github.com/anthropics/claude-code/issues/6577)
- [Issue #9567 - Hook env variables](https://github.com/anthropics/claude-code/issues/9567)
- [ccusage - Usage Analysis](https://ccusage.com/guide/statusline)
