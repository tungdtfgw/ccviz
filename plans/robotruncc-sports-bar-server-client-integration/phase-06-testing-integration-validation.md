---
title: "Phase 6: Testing & Integration Validation"
description: "End-to-end testing and validation of the complete system"
status: ready-for-testing
priority: P1
effort: 1h
---

# Phase 6: Testing & Integration Validation

## Context Links
- Main plan: [robotruncc-complete-server-client-integration-plan-overview.md](./robotruncc-complete-server-client-integration-plan-overview.md)
- Requires all phases: 1-5

## Overview
- **Priority**: P1 - Critical for delivery
- **Status**: Pending (blocked by all phases)
- **Effort**: 1 hour

Validate the complete system works end-to-end, from Claude Code hooks through server to browser visualization.

## Key Insights
- Test each component independently first
- Then test integration points
- Use manual curl commands to simulate hooks
- Visual inspection of Phaser game for correctness

## Requirements

### Functional
- Server health check responds
- Socket.io connections establish
- Events flow from curl to browser
- Game displays customers correctly
- Beer tower updates with context
- Subagents appear and disappear

### Non-Functional
- Latency under 500ms from event to visual
- No memory leaks after extended testing
- Graceful handling of rapid events

## Test Plan

### 1. Unit Tests (Manual)

#### Server State Manager
```bash
# Test session open/close
curl -X POST http://localhost:3847/api/events \
  -H "Content-Type: application/json" \
  -d '{"type":"session:start","timestamp":1706300000000,"payload":{"sessionId":"test-123","contextPercent":0}}'

# Verify health
curl http://localhost:3847/health
```

#### Client Socket Connection
```javascript
// In browser console
socketClient.isConnected() // should return true
```

### 2. Integration Tests

#### Test Sequence A: Session Lifecycle
```bash
# 1. Start session
curl -X POST http://localhost:3847/api/events \
  -H "Content-Type: application/json" \
  -d '{"type":"session:start","timestamp":'$(date +%s000)',"payload":{"sessionId":"session-001","contextPercent":0}}'

# Expected: Customer walks in and sits at table

# 2. Update context (drinking)
curl -X POST http://localhost:3847/api/events \
  -H "Content-Type: application/json" \
  -d '{"type":"context:update","timestamp":'$(date +%s000)',"payload":{"sessionId":"session-001","percent":25,"tokens":50000}}'

# Expected: Beer tower shows 75% remaining, customer drinks

# 3. End session
curl -X POST http://localhost:3847/api/events \
  -H "Content-Type: application/json" \
  -d '{"type":"session:end","timestamp":'$(date +%s000)',"payload":{"sessionId":"session-001"}}'

# Expected: Customer leaves, waiter picks up beer tower
```

#### Test Sequence B: Subagent Spawn
```bash
# 1. Start session first
curl -X POST http://localhost:3847/api/events \
  -H "Content-Type: application/json" \
  -d '{"type":"session:start","timestamp":'$(date +%s000)',"payload":{"sessionId":"session-002","contextPercent":0}}'

# 2. Spawn subagent
curl -X POST http://localhost:3847/api/events \
  -H "Content-Type: application/json" \
  -d '{"type":"subagent:start","timestamp":'$(date +%s000)',"payload":{"sessionId":"session-002","agentId":"agent-001","agentType":"code-reviewer","description":"Reviewing pull request"}}'

# Expected: Sub-agent walks in wearing same team colors

# 3. Complete subagent
curl -X POST http://localhost:3847/api/events \
  -H "Content-Type: application/json" \
  -d '{"type":"subagent:stop","timestamp":'$(date +%s000)',"payload":{"sessionId":"session-002","agentId":"agent-001","agentType":"code-reviewer","result":"LGTM"}}'

# Expected: Sub-agent leaves
```

#### Test Sequence C: Multi-Session
```bash
# Start 3 sessions rapidly
for i in 1 2 3; do
  curl -X POST http://localhost:3847/api/events \
    -H "Content-Type: application/json" \
    -d '{"type":"session:start","timestamp":'$(date +%s000)',"payload":{"sessionId":"multi-'$i'","contextPercent":0}}' &
done
wait

# Expected: 3 customers at different tables with different team colors
```

### 3. Visual Verification Checklist

- [ ] Customer walks from entrance to assigned table
- [ ] Customer wears correct team jersey colors
- [ ] Name tag shows short session ID
- [ ] Beer tower appears after waiter delivers
- [ ] Beer tower depletes as context increases (100% context = empty)
- [ ] Context label shows "Remaining: X%"
- [ ] Sub-agents spawn near parent's table
- [ ] Sub-agents wear same team colors as parent session
- [ ] TV display shows scrolling event feed
- [ ] HUD shows session and agent counts
- [ ] Customer leaves on session:end
- [ ] Waiter picks up beer tower after customer leaves

### 4. Edge Case Tests

#### Rapid Events
```bash
# Send 10 context updates rapidly
for i in {10..100..10}; do
  curl -X POST http://localhost:3847/api/events \
    -H "Content-Type: application/json" \
    -d '{"type":"context:update","timestamp":'$(date +%s000)',"payload":{"sessionId":"session-001","percent":'$i',"tokens":50000}}' &
done
wait
```

#### Max Sessions (8)
```bash
# Start 9 sessions (8 should succeed, 1 fail gracefully)
for i in {1..9}; do
  curl -X POST http://localhost:3847/api/events \
    -H "Content-Type: application/json" \
    -d '{"type":"session:start","timestamp":'$(date +%s000)',"payload":{"sessionId":"max-'$i'","contextPercent":0}}'
done
```

#### Reconnection
```bash
# Start server, connect client, stop server, wait, start server again
# Client should reconnect and receive state sync
```

## Test Scripts

### Create `scripts/test-session.sh`
```bash
#!/bin/bash
# Quick test script for session lifecycle

SERVER_URL="${1:-http://localhost:3847}"
SESSION_ID="test-$(date +%s)"

echo "Testing session lifecycle on $SERVER_URL"
echo "Session ID: $SESSION_ID"

echo "1. Starting session..."
curl -s -X POST "$SERVER_URL/api/events" \
  -H "Content-Type: application/json" \
  -d "{\"type\":\"session:start\",\"timestamp\":$(date +%s000),\"payload\":{\"sessionId\":\"$SESSION_ID\",\"contextPercent\":0}}"

sleep 2

echo "2. Updating context to 30%..."
curl -s -X POST "$SERVER_URL/api/events" \
  -H "Content-Type: application/json" \
  -d "{\"type\":\"context:update\",\"timestamp\":$(date +%s000),\"payload\":{\"sessionId\":\"$SESSION_ID\",\"percent\":30,\"tokens\":75000}}"

sleep 2

echo "3. Spawning subagent..."
curl -s -X POST "$SERVER_URL/api/events" \
  -H "Content-Type: application/json" \
  -d "{\"type\":\"subagent:start\",\"timestamp\":$(date +%s000),\"payload\":{\"sessionId\":\"$SESSION_ID\",\"agentId\":\"agent-1\",\"agentType\":\"tester\",\"description\":\"Running tests\"}}"

sleep 3

echo "4. Completing subagent..."
curl -s -X POST "$SERVER_URL/api/events" \
  -H "Content-Type: application/json" \
  -d "{\"type\":\"subagent:stop\",\"timestamp\":$(date +%s000),\"payload\":{\"sessionId\":\"$SESSION_ID\",\"agentId\":\"agent-1\",\"agentType\":\"tester\",\"result\":\"All tests passed\"}}"

sleep 2

echo "5. Updating context to 70%..."
curl -s -X POST "$SERVER_URL/api/events" \
  -H "Content-Type: application/json" \
  -d "{\"type\":\"context:update\",\"timestamp\":$(date +%s000),\"payload\":{\"sessionId\":\"$SESSION_ID\",\"percent\":70,\"tokens\":175000}}"

sleep 2

echo "6. Ending session..."
curl -s -X POST "$SERVER_URL/api/events" \
  -H "Content-Type: application/json" \
  -d "{\"type\":\"session:end\",\"timestamp\":$(date +%s000),\"payload\":{\"sessionId\":\"$SESSION_ID\"}}"

echo "Test complete!"
```

## Todo List
- [ ] Start server and verify health endpoint
- [ ] Start client and verify socket connection
- [ ] Run Test Sequence A (session lifecycle)
- [ ] Run Test Sequence B (subagent spawn)
- [ ] Run Test Sequence C (multi-session)
- [ ] Complete visual verification checklist
- [ ] Test edge cases
- [ ] Create reusable test script

## Success Criteria
- [ ] All test sequences pass
- [ ] Visual verification checklist complete
- [ ] No console errors during testing
- [ ] Events flow under 500ms latency
- [ ] System handles 8 concurrent sessions
- [ ] Reconnection works correctly

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Visual bugs | Medium | Medium | Manual inspection at each step |
| Race conditions | Low | Medium | Test rapid event sequences |
| Memory leaks | Low | High | Monitor browser memory usage |

## Security Considerations
- Test scripts only for local development
- No production credentials needed
- All traffic on localhost

## Next Steps
- Document any bugs found during testing
- Create automated test suite if needed
- Write user documentation
