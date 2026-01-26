# Debug Report: Session State Management Bugs

**Date:** 2026-01-27
**Reporter:** debugger
**Work Context:** /Users/tungdt/My Projects/throwable/robotruncc

---

## Executive Summary

Two critical state management bugs identified in ccviz visualization:

1. **Bug #1: Context percentage (remaining) values mixed between sessions**
   - Root cause: Fallback logic in BarScene defaulting to first session when sessionId missing/invalid
   - Impact: Wrong customer beer towers drain when context updates arrive
   - Severity: High - breaks multi-session visualization

2. **Bug #2: Subagent stop event causes wrong agent to leave**
   - Root cause: Silent failures in agentId lookup masking timing/race conditions
   - Impact: When subagent stops, may appear as wrong agent leaving
   - Severity: Medium - visual inconsistency in agent tracking

---

## Technical Analysis

### Bug #1: Context % Mixing Between Sessions

#### Evidence Chain

**Location:** `src/client/scenes/BarScene.ts:404-410`

```typescript
socketClient.on('context:update', (e: BarEvent) => {
  const p = e.payload as ContextPayload;
  const sessionId = p.sessionId || barState.getAllSessions()[0]?.sessionId;  // ⚠️ FALLBACK
  if (sessionId) {
    barState.updateContext(sessionId, p.percent, p.tokens);
  }
});
```

**Hook source:** `scripts/hooks/status-hook-send-context-percentage-to-visualization-server.sh:10-17`

```bash
SESSION_ID=$(echo "$INPUT" | jq -r '.session_id // empty')
# ...
if [ -z "$SESSION_ID" ]; then
  SESSION_ID="session-main"  # ⚠️ FALLBACK
fi
```

**Problem Flow:**

1. Hook extracts `session_id` from Claude Code stdin JSON
2. If empty/null, hook falls back to `"session-main"` hardcoded string
3. Server receives event with sessionId `"session-main"`
4. Client receives event, payload contains `sessionId: "session-main"`
5. If `"session-main"` not in barState.sessions map (common for subagent sessions), condition `p.sessionId` is truthy but **invalid**
6. Client fallback triggers: `p.sessionId || barState.getAllSessions()[0]?.sessionId`
7. **BUG:** Context update applies to **first session in map**, not the actual session

#### Root Cause

**Primary:** Dual-fallback pattern creates ambiguity:
1. Hook falls back to `"session-main"` (may not exist)
2. Client falls back to first session array position when sessionId falsy OR invalid

**Secondary:** No session existence validation before calling `updateContext()`

**Tertiary:** Hook receives incomplete/malformed session_id from Claude Code in subagent contexts

---

### Bug #2: Subagent Stop Silent Failures

#### Evidence Chain

**Server correctly uses agentId:**

`src/server/event-handlers.ts:45-49`
```typescript
case 'subagent:stop': {
  const p = payload as SubagentPayload;
  stateManager.removeAgent(p.agentId);  // ✓ Uses agentId
  io.emit('subagent:stop', event);
  break;
}
```

`src/server/state-manager.ts:85-97`
```typescript
removeAgent(agentId: string): ServerAgentState | null {
  const agent = this.state.agents.get(agentId);  // ✓ Lookup by agentId
  if (!agent) return null;  // ⚠️ Silent return

  const session = this.state.sessions.get(agent.sessionId);
  if (session) {
    session.agentIds = session.agentIds.filter(id => id !== agentId);
  }

  this.state.agents.delete(agentId);
  return agent;
}
```

**Client also uses agentId:**

`src/client/state/BarState.ts:135-146`
```typescript
removeAgentById(agentId: string, result?: string): void {
  const agent = this.state.activeAgents.get(agentId);  // ✓ Lookup by agentId
  if (!agent) return;  // ⚠️ Silent fail

  if (result) {
    agent.result = result;
  }

  this.state.activeAgents.delete(agentId);
  this.emit('agent:leave', agent);
}
```

`src/client/sprites/SubAgentManager.ts:79-93`
```typescript
removeAgent(agentId: string) {
  const agent = this.agents.get(agentId);  // ✓ Lookup by agentId
  if (!agent) return;  // ⚠️ Silent fail

  const spot = this.spots.find(s => s.agentId === agentId);
  if (spot) {
    spot.occupied = false;
    spot.agentId = null;
  }

  agent.leave(this.entrancePos.x, this.entrancePos.y, () => {
    this.agents.delete(agentId);
  });
}
```

#### Root Cause

**Architecture is CORRECT** - uses agentId throughout. Problem is **silent failures masking root issues:**

1. **AgentId mismatch** - start/stop events may have different IDs from Claude Code
2. **Race conditions** - stop event arrives before start completes client-side processing
3. **Duplicate stop events** - first removes correctly, second silently fails
4. **No logging** - impossible to debug which scenario occurred

**Real issue:** When agentId not found, returns silently. User sees visual glitch, assumes wrong agent removed.

---

## Recommended Fixes

### Fix #1: Context Update Session Resolution

**Priority:** P0 - Critical

**Files to modify:**

1. `src/client/scenes/BarScene.ts:404-410`
2. `scripts/hooks/status-hook-send-context-percentage-to-visualization-server.sh:14-17`
3. `src/client/state/BarState.ts:148-165`

**Changes:**

**1. BarScene.ts - Remove fallback, add validation**
```typescript
// BEFORE (line 404):
socketClient.on('context:update', (e: BarEvent) => {
  const p = e.payload as ContextPayload;
  const sessionId = p.sessionId || barState.getAllSessions()[0]?.sessionId;
  if (sessionId) {
    barState.updateContext(sessionId, p.percent, p.tokens);
  }
});

// AFTER:
socketClient.on('context:update', (e: BarEvent) => {
  const p = e.payload as ContextPayload;
  if (!p.sessionId) {
    console.warn('[BarScene] context:update received without sessionId, ignoring');
    return;
  }
  // Validate session exists
  if (!barState.getSession(p.sessionId)) {
    console.warn(`[BarScene] context:update for unknown session ${p.sessionId}, ignoring`);
    return;
  }
  barState.updateContext(p.sessionId, p.percent, p.tokens);
});
```

**2. Hook - Remove fallback**
```bash
# BEFORE (line 14):
if [ -z "$SESSION_ID" ]; then
  SESSION_ID="session-main"
fi

# AFTER:
if [ -z "$SESSION_ID" ]; then
  # Don't send event if session_id unavailable
  exit 0
fi
```

**3. BarState.ts - Add validation in updateContext**
```typescript
// BEFORE (line 148):
updateContext(sessionId: string, percent: number, tokens: number): void {
  const session = this.state.sessions.get(sessionId);
  if (!session) return;

  const prevPercent = session.contextPercent;
  // ...
}

// AFTER:
updateContext(sessionId: string, percent: number, tokens: number): void {
  const session = this.state.sessions.get(sessionId);
  if (!session) {
    console.warn(`[BarState] updateContext for unknown session ${sessionId}`);
    return;
  }

  const prevPercent = session.contextPercent;
  // ...
}
```

---

### Fix #2: Subagent Lifecycle Debugging

**Priority:** P1 - High

**Files to modify:**

1. `src/client/sprites/SubAgentManager.ts:79-93`
2. `src/client/state/BarState.ts:135-146`
3. `scripts/hooks/hook-subagent-spawn-and-stop-events-to-visualization-http-server.sh:36-43`
4. `src/server/event-handlers.ts:45-50`

**Changes:**

**1. SubAgentManager.ts - Add logging**
```typescript
// BEFORE (line 79):
removeAgent(agentId: string) {
  const agent = this.agents.get(agentId);
  if (!agent) return;
  // ...
}

// AFTER:
removeAgent(agentId: string) {
  console.log(`[SubAgentManager] Removing agent ${agentId}`);
  const agent = this.agents.get(agentId);
  if (!agent) {
    console.warn(`[SubAgentManager] Agent ${agentId} not found. Active:`, 
      Array.from(this.agents.keys()));
    return;
  }
  // ...
}
```

**2. BarState.ts - Add logging**
```typescript
// BEFORE (line 135):
removeAgentById(agentId: string, result?: string): void {
  const agent = this.state.activeAgents.get(agentId);
  if (!agent) return;
  // ...
}

// AFTER:
removeAgentById(agentId: string, result?: string): void {
  console.log(`[BarState] Removing agent ${agentId}`);
  const agent = this.state.activeAgents.get(agentId);
  if (!agent) {
    console.warn(`[BarState] Agent ${agentId} not found. Active:`, 
      Array.from(this.state.activeAgents.keys()));
    return;
  }
  // ...
}
```

**3. Hook - Add validation**
```bash
# Add after line 40:
SubagentStop)
  if [ -z "$AGENT_ID" ]; then
    echo "[Hook] SubagentStop without agent_id" >&2
    exit 0
  fi
  send_event "subagent:stop" "{\"sessionId\": \"$SESSION_ID\", \"agentId\": \"$AGENT_ID\", \"agentType\": \"$AGENT_TYPE\"}"
  ;;
```

**4. Server event-handlers.ts - Add validation**
```typescript
// BEFORE (line 45):
case 'subagent:stop': {
  const p = payload as SubagentPayload;
  stateManager.removeAgent(p.agentId);
  io.emit('subagent:stop', event);
  break;
}

// AFTER:
case 'subagent:stop': {
  const p = payload as SubagentPayload;
  if (!p.agentId) {
    console.warn('[EventHandler] subagent:stop without agentId');
    break;
  }
  const removed = stateManager.removeAgent(p.agentId);
  if (!removed) {
    console.warn(`[EventHandler] Agent ${p.agentId} not found in state`);
  }
  io.emit('subagent:stop', event);
  break;
}
```

---

## Risk Assessment

### Bug #1 Risks

**If unfixed:**
- Multi-session visualization broken
- Context shows on wrong customer
- Beer towers drain unpredictably
- User cannot trust data

**Fix risks:**
- Low - validation only, no behavior change for valid data
- May expose upstream bugs (good for debugging)

### Bug #2 Risks

**If unfixed:**
- Subagent viz unreliable
- User confusion on agent disappearance
- Root cause debugging impossible

**Fix risks:**
- Very low - logging only
- May reveal Claude Code agentId bugs

---

## Security Considerations

None. Bugs are logic/state only.

---

## Next Steps

1. Implement Fix #1 (context validation) - **CRITICAL**
2. Implement Fix #2 (agent logging) - High priority
3. Test multi-session scenarios
4. Monitor logs for ID mismatches
5. Consider state health checks

---

## Unresolved Questions

1. Why does Claude Code provide empty/invalid session_id in subagent contexts?
2. Are agentIds guaranteed unique across sessions?
3. Should we add periodic state reconciliation/cleanup?
4. Consider server-side UUID generation for reliability?

---

## Supporting Evidence

### Code Locations

**Server:**
- `src/server/state-manager.ts` - Session/agent state
- `src/server/event-handlers.ts` - Event processing

**Client:**
- `src/client/state/BarState.ts` - Client session state
- `src/client/scenes/BarScene.ts` - Socket handlers with fallbacks
- `src/client/sprites/SessionCustomerManager.ts` - Customer/beer management
- `src/client/sprites/SubAgentManager.ts` - Agent lifecycle

**Hooks:**
- `scripts/hooks/status-hook-send-context-percentage-to-visualization-server.sh`
- `scripts/hooks/hook-subagent-spawn-and-stop-events-to-visualization-http-server.sh`

---

**Report End**
