---
title: "Phase 2: Bun + Socket.io Server Setup"
description: "Create WebSocket server with REST endpoint for Claude Code hooks"
status: completed
priority: P1
effort: 2h
---

# Phase 2: Bun + Socket.io Server Setup

## Context Links
- Main plan: [robotruncc-complete-server-client-integration-plan-overview.md](./robotruncc-complete-server-client-integration-plan-overview.md)
- Depends on: [phase-01-shared-types-module.md](./phase-01-shared-types-module.md)

## Overview
- **Priority**: P1 - Core infrastructure
- **Status**: Pending (blocked by Phase 1)
- **Effort**: 2 hours

Create a Bun-based server with Socket.io for WebSocket communication and REST endpoint for Claude Code hooks.

## Key Insights
- Bun native HTTP server + Socket.io integration
- @socket.io/bun-engine provides Bun-optimized adapter
- REST endpoint receives curl POSTs from Claude Code hooks
- In-memory state management (no persistence needed)
- Socket.io rooms for session-based broadcasting

## Requirements

### Functional
- HTTP server on port 3847 (configurable via PORT env)
- REST endpoint `POST /api/events` for hook events
- WebSocket server for client connections
- Session state management (create, update, destroy)
- Event broadcasting to connected clients
- Health check endpoint `GET /health`

### Non-Functional
- Handle multiple concurrent sessions (up to 8)
- Graceful handling of disconnections
- CORS enabled for local development

## Architecture

```
src/server/
├── index.ts              # Entry point, server setup
├── state-manager.ts      # In-memory state management
├── event-handlers.ts     # Handle incoming events
└── socket-handlers.ts    # WebSocket connection handlers
```

### Data Flow
```
Hook curl POST -> /api/events -> EventHandler -> StateManager -> Socket.io broadcast -> Clients
```

## Related Code Files

### Files to Create
- `src/server/index.ts`
- `src/server/state-manager.ts`
- `src/server/event-handlers.ts`
- `src/server/socket-handlers.ts`

### Dependencies on Shared Types
```typescript
import type { BarEvent, ServerBarState, ServerSessionState } from '@shared';
import { getTeamForSession, MAX_SESSIONS } from '@shared/teams';
```

## Implementation Steps

### Step 1: Create `src/server/state-manager.ts`
```typescript
import type { ServerBarState, ServerSessionState, ServerAgentState } from '@shared/state';
import { getTeamForSession, MAX_SESSIONS, type TeamKey } from '@shared/teams';

class BarStateManager {
  private state: ServerBarState = {
    sessions: new Map(),
    agents: new Map(),
    tableAssignments: new Map()
  };

  // Find next available table (0-7)
  private findAvailableTable(): number | null {
    for (let i = 0; i < MAX_SESSIONS; i++) {
      if (!this.state.tableAssignments.has(i)) {
        return i;
      }
    }
    return null;
  }

  openSession(sessionId: string, contextPercent = 0): ServerSessionState | null {
    if (this.state.sessions.has(sessionId)) {
      return this.state.sessions.get(sessionId)!;
    }

    const tableIndex = this.findAvailableTable();
    if (tableIndex === null) {
      console.warn('[StateManager] No available tables');
      return null;
    }

    const team = getTeamForSession(sessionId);
    const session: ServerSessionState = {
      sessionId,
      teamKey: team.key,
      tableIndex,
      contextPercent,
      tokensUsed: 0,
      agentIds: [],
      createdAt: Date.now()
    };

    this.state.sessions.set(sessionId, session);
    this.state.tableAssignments.set(tableIndex, sessionId);
    
    console.log(`[StateManager] Session ${sessionId} opened at table ${tableIndex} (${team.name})`);
    return session;
  }

  closeSession(sessionId: string): boolean {
    const session = this.state.sessions.get(sessionId);
    if (!session) return false;

    // Remove all agents for this session
    session.agentIds.forEach(agentId => {
      this.state.agents.delete(agentId);
    });

    this.state.tableAssignments.delete(session.tableIndex);
    this.state.sessions.delete(sessionId);
    
    console.log(`[StateManager] Session ${sessionId} closed`);
    return true;
  }

  addAgent(sessionId: string, agentId: string, agentType: string, description?: string): ServerAgentState | null {
    const session = this.state.sessions.get(sessionId);
    if (!session) return null;

    const agent: ServerAgentState = {
      agentId,
      sessionId,
      agentType,
      description,
      createdAt: Date.now()
    };

    this.state.agents.set(agentId, agent);
    session.agentIds.push(agentId);
    
    console.log(`[StateManager] Agent ${agentType} (${agentId}) added to session ${sessionId}`);
    return agent;
  }

  removeAgent(agentId: string): ServerAgentState | null {
    const agent = this.state.agents.get(agentId);
    if (!agent) return null;

    const session = this.state.sessions.get(agent.sessionId);
    if (session) {
      session.agentIds = session.agentIds.filter(id => id !== agentId);
    }

    this.state.agents.delete(agentId);
    console.log(`[StateManager] Agent ${agentId} removed`);
    return agent;
  }

  updateContext(sessionId: string, percent: number, tokens: number): boolean {
    const session = this.state.sessions.get(sessionId);
    if (!session) return false;

    session.contextPercent = percent;
    session.tokensUsed = tokens;
    return true;
  }

  getSession(sessionId: string): ServerSessionState | undefined {
    return this.state.sessions.get(sessionId);
  }

  getAllSessions(): ServerSessionState[] {
    return Array.from(this.state.sessions.values());
  }

  getStateSyncPayload() {
    return {
      sessions: this.getAllSessions().map(s => ({
        sessionId: s.sessionId,
        teamKey: s.teamKey,
        tableIndex: s.tableIndex,
        contextPercent: s.contextPercent,
        agentIds: s.agentIds
      }))
    };
  }
}

export const stateManager = new BarStateManager();
```

### Step 2: Create `src/server/event-handlers.ts`
```typescript
import { Server as SocketServer } from 'socket.io';
import type { BarEvent, SessionStartPayload, SubagentPayload, ContextPayload } from '@shared/events';
import { stateManager } from './state-manager';

export function handleEvent(event: BarEvent, io: SocketServer): void {
  const { type, payload } = event;
  
  console.log(`[EventHandler] Received ${type}`, payload);

  switch (type) {
    case 'session:start': {
      const p = payload as SessionStartPayload;
      const session = stateManager.openSession(p.sessionId, p.contextPercent);
      if (session) {
        // Enrich payload with assigned team and table
        const enrichedPayload: SessionStartPayload = {
          sessionId: session.sessionId,
          teamKey: session.teamKey,
          contextPercent: session.contextPercent
        };
        io.emit('session:start', { type, timestamp: event.timestamp, payload: enrichedPayload });
      }
      break;
    }

    case 'session:end': {
      const p = payload as { sessionId: string };
      const closed = stateManager.closeSession(p.sessionId);
      if (closed) {
        io.emit('session:end', event);
      }
      break;
    }

    case 'subagent:start': {
      const p = payload as SubagentPayload;
      const session = stateManager.getSession(p.sessionId);
      if (session) {
        stateManager.addAgent(p.sessionId, p.agentId, p.agentType, p.description);
        io.emit('subagent:start', event);
      }
      break;
    }

    case 'subagent:stop': {
      const p = payload as SubagentPayload;
      stateManager.removeAgent(p.agentId);
      io.emit('subagent:stop', event);
      break;
    }

    case 'context:update': {
      const p = payload as ContextPayload;
      stateManager.updateContext(p.sessionId, p.percent, p.tokens);
      io.emit('context:update', event);
      break;
    }

    case 'tool:pre':
    case 'tool:post':
    case 'skill:use':
      // Broadcast directly to clients
      io.emit(type, event);
      break;

    default:
      console.warn(`[EventHandler] Unknown event type: ${type}`);
  }
}
```

### Step 3: Create `src/server/socket-handlers.ts`
```typescript
import { Server as SocketServer, Socket } from 'socket.io';
import { stateManager } from './state-manager';

export function setupSocketHandlers(io: SocketServer): void {
  io.on('connection', (socket: Socket) => {
    console.log(`[Socket] Client connected: ${socket.id}`);

    // Send current state to newly connected client
    const syncPayload = stateManager.getStateSyncPayload();
    socket.emit('state:sync', {
      type: 'state:sync',
      timestamp: Date.now(),
      payload: syncPayload
    });

    socket.on('disconnect', () => {
      console.log(`[Socket] Client disconnected: ${socket.id}`);
    });

    socket.on('error', (error) => {
      console.error(`[Socket] Error for ${socket.id}:`, error);
    });
  });
}
```

### Step 4: Create `src/server/index.ts`
```typescript
import { Server as SocketServer } from 'socket.io';
import { handleEvent } from './event-handlers';
import { setupSocketHandlers } from './socket-handlers';
import type { BarEvent } from '@shared/events';

const PORT = parseInt(process.env.PORT || '3847', 10);

// Create HTTP server with Bun
const server = Bun.serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url);
    
    // CORS headers
    const headers = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    };

    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers });
    }

    // Health check
    if (url.pathname === '/health' && req.method === 'GET') {
      return new Response(JSON.stringify({ status: 'ok', timestamp: Date.now() }), {
        headers: { ...headers, 'Content-Type': 'application/json' }
      });
    }

    // Event endpoint
    if (url.pathname === '/api/events' && req.method === 'POST') {
      try {
        const body = await req.json() as BarEvent;
        handleEvent(body, io);
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...headers, 'Content-Type': 'application/json' }
        });
      } catch (error) {
        console.error('[Server] Error parsing event:', error);
        return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
          status: 400,
          headers: { ...headers, 'Content-Type': 'application/json' }
        });
      }
    }

    // 404 for unknown routes
    return new Response('Not Found', { status: 404, headers });
  }
});

// Create Socket.io server
const io = new SocketServer(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

setupSocketHandlers(io);

console.log(`[Server] Robot Runner CC server running on http://localhost:${PORT}`);
console.log(`[Server] WebSocket endpoint: ws://localhost:${PORT}`);
console.log(`[Server] REST endpoint: http://localhost:${PORT}/api/events`);
```

## Todo List
- [ ] Create `src/server/` directory
- [ ] Implement `state-manager.ts`
- [ ] Implement `event-handlers.ts`
- [ ] Implement `socket-handlers.ts`
- [ ] Implement `index.ts` entry point
- [ ] Test server starts without errors
- [ ] Test health endpoint responds
- [ ] Test event endpoint accepts POST

## Success Criteria
- [ ] Server starts on port 3847
- [ ] `GET /health` returns `{status: 'ok'}`
- [ ] `POST /api/events` accepts and processes events
- [ ] WebSocket connections establish
- [ ] State sync sent on client connect
- [ ] Events broadcast to connected clients

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Socket.io Bun compatibility | Low | High | Use @socket.io/bun-engine adapter |
| Memory leaks from unclosed sessions | Medium | Medium | Implement session timeout cleanup |
| CORS issues | Low | Low | Enable all origins for dev |

## Security Considerations
- Server listens only on localhost by default
- No authentication (local dev tool only)
- CORS enabled for all origins (acceptable for local tool)

## Next Steps
- Phase 3 (Client Socket) can begin after server is functional
- Phase 5 (Hooks) depends on server being testable
