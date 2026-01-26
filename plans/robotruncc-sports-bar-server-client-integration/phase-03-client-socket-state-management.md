---
title: "Phase 3: Client Socket & State Management"
description: "Create Socket.io client and EventEmitter-based state management for Phaser"
status: completed
priority: P1
effort: 1.5h
---

# Phase 3: Client Socket & State Management

## Context Links
- Main plan: [robotruncc-complete-server-client-integration-plan-overview.md](./robotruncc-complete-server-client-integration-plan-overview.md)
- Depends on: [phase-01-shared-types-module.md](./phase-01-shared-types-module.md)
- Server for testing: [phase-02-bun-socketio-server-setup.md](./phase-02-bun-socketio-server-setup.md)

## Overview
- **Priority**: P1 - Client infrastructure
- **Status**: Pending (blocked by Phase 1)
- **Effort**: 1.5 hours

Create the client-side socket connection and state management that bridges server events to Phaser game objects.

## Key Insights
- Client code already imports `socketClient` from `../socket-client`
- Client code already imports `barState`, `SessionState`, `Agent` from `../state/BarState`
- Must match exact API expected by existing Phaser code
- EventEmitter3 pattern for reactive state updates

## Requirements

### Functional
- Socket.io client connecting to server
- Auto-reconnection handling
- State sync on connect/reconnect
- EventEmitter-based state with typed events
- Session tracking (open, close, context updates)
- Agent tracking (enter, leave)
- MCP/skill tracking for UI feedback

### Non-Functional
- Minimal latency for real-time feel
- Graceful degradation if server unavailable
- TypeScript strict mode compatible

## Architecture

```
src/client/
├── socket-client.ts      # Socket.io client wrapper
└── state/
    └── BarState.ts       # EventEmitter-based state
```

### State Events (emitted by BarState)
```
bar:open, bar:close
session:open, session:close
agent:enter, agent:leave
context:update, context:reset
skill:use
mcp:start, mcp:end
```

## Related Code Files

### Files to Create
- `src/client/socket-client.ts`
- `src/client/state/BarState.ts`

### Existing Client Usage (must match)
```typescript
// From BarScene.ts
import { socketClient } from '../socket-client';
import { barState, type SessionState, type Agent } from '../state/BarState';

socketClient.on('session:start', (e: BarEvent) => { ... });
socketClient.connect();

barState.on('session:open', (session: SessionState) => { ... });
barState.openSession(sessionId, teamKey, contextPercent);
barState.getAllSessions();
```

## Implementation Steps

### Step 1: Create `src/client/socket-client.ts`
```typescript
import { io, Socket } from 'socket.io-client';
import type { BarEvent } from '@shared/events';

type EventCallback = (event: BarEvent) => void;

class SocketClient {
  private socket: Socket | null = null;
  private listeners: Map<string, Set<EventCallback>> = new Map();
  private serverUrl: string;

  constructor(url = 'http://localhost:3847') {
    this.serverUrl = url;
  }

  connect(): void {
    if (this.socket?.connected) {
      console.log('[SocketClient] Already connected');
      return;
    }

    console.log(`[SocketClient] Connecting to ${this.serverUrl}`);
    
    this.socket = io(this.serverUrl, {
      transports: ['websocket'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000
    });

    this.socket.on('connect', () => {
      console.log('[SocketClient] Connected:', this.socket?.id);
    });

    this.socket.on('disconnect', (reason) => {
      console.log('[SocketClient] Disconnected:', reason);
    });

    this.socket.on('connect_error', (error) => {
      console.error('[SocketClient] Connection error:', error.message);
    });

    // Forward all server events to registered listeners
    const eventTypes = [
      'session:start', 'session:end',
      'subagent:start', 'subagent:stop',
      'tool:pre', 'tool:post',
      'skill:use', 'context:update',
      'state:sync'
    ];

    eventTypes.forEach(type => {
      this.socket!.on(type, (event: BarEvent) => {
        this.emit(type, event);
      });
    });
  }

  disconnect(): void {
    this.socket?.disconnect();
    this.socket = null;
  }

  on(event: string, callback: EventCallback): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }

  off(event: string, callback: EventCallback): void {
    this.listeners.get(event)?.delete(callback);
  }

  private emit(event: string, data: BarEvent): void {
    this.listeners.get(event)?.forEach(cb => cb(data));
  }

  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }
}

export const socketClient = new SocketClient();
```

### Step 2: Create `src/client/state/BarState.ts`
```typescript
import EventEmitter from 'eventemitter3';
import type { TeamKey } from '@shared/teams';

export interface SessionState {
  sessionId: string;
  teamKey: TeamKey;
  tableIndex: number;
  contextPercent: number;
  tokensUsed: number;
}

export interface Agent {
  id: string;
  type: string;
  sessionId: string;
  teamKey: TeamKey;
  description?: string;
  result?: string;
}

interface BarStateData {
  isOpen: boolean;
  sessions: Map<string, SessionState>;
  activeAgents: Map<string, Agent>;
  currentMcp: string | null;
  lastSkill: string | null;
}

interface BarStateEvents {
  'bar:open': [];
  'bar:close': [];
  'session:open': [session: SessionState];
  'session:close': [data: { sessionId: string }];
  'agent:enter': [agent: Agent];
  'agent:leave': [agent: Agent];
  'context:update': [data: { sessionId: string; percent: number; tokens: number; prevPercent?: number }];
  'context:reset': [data: { sessionId: string; percent: number }];
  'skill:use': [skillName: string];
  'mcp:start': [server: string];
  'mcp:end': [];
}

class BarState extends EventEmitter<BarStateEvents> {
  public state: BarStateData = {
    isOpen: false,
    sessions: new Map(),
    activeAgents: new Map(),
    currentMcp: null,
    lastSkill: null
  };

  private tableCounter = 0;

  openSession(sessionId: string, teamKey: TeamKey, contextPercent = 0): SessionState | null {
    if (this.state.sessions.has(sessionId)) {
      return this.state.sessions.get(sessionId)!;
    }

    // Assign table index (0-7)
    const tableIndex = this.tableCounter % 8;
    this.tableCounter++;

    const session: SessionState = {
      sessionId,
      teamKey,
      tableIndex,
      contextPercent,
      tokensUsed: 0
    };

    this.state.sessions.set(sessionId, session);
    
    if (!this.state.isOpen) {
      this.state.isOpen = true;
      this.emit('bar:open');
    }

    this.emit('session:open', session);
    console.log(`[BarState] Session opened: ${sessionId} (${teamKey}) at table ${tableIndex}`);
    
    return session;
  }

  closeSession(sessionId: string): void {
    const session = this.state.sessions.get(sessionId);
    if (!session) return;

    // Remove agents associated with this session
    this.state.activeAgents.forEach((agent, agentId) => {
      if (agent.sessionId === sessionId) {
        this.emit('agent:leave', agent);
        this.state.activeAgents.delete(agentId);
      }
    });

    this.state.sessions.delete(sessionId);
    this.emit('session:close', { sessionId });
    console.log(`[BarState] Session closed: ${sessionId}`);

    if (this.state.sessions.size === 0) {
      this.state.isOpen = false;
      this.emit('bar:close');
    }
  }

  addAgent(sessionId: string, agentId: string, agentType: string, description?: string): Agent | null {
    const session = this.state.sessions.get(sessionId);
    if (!session) {
      // Try to find any session if sessionId not found
      const firstSession = this.getAllSessions()[0];
      if (!firstSession) return null;
      sessionId = firstSession.sessionId;
    }

    const resolvedSession = this.state.sessions.get(sessionId)!;
    
    const agent: Agent = {
      id: agentId,
      type: agentType,
      sessionId,
      teamKey: resolvedSession.teamKey,
      description
    };

    this.state.activeAgents.set(agentId, agent);
    this.emit('agent:enter', agent);
    console.log(`[BarState] Agent entered: ${agentType} (${agentId})`);
    
    return agent;
  }

  removeAgentById(agentId: string, result?: string): void {
    const agent = this.state.activeAgents.get(agentId);
    if (!agent) return;

    if (result) {
      agent.result = result;
    }

    this.state.activeAgents.delete(agentId);
    this.emit('agent:leave', agent);
    console.log(`[BarState] Agent left: ${agent.type} (${agentId})`);
  }

  updateContext(sessionId: string, percent: number, tokens: number): void {
    const session = this.state.sessions.get(sessionId);
    if (!session) return;

    const prevPercent = session.contextPercent;
    
    // Detect context reset (significant drop in usage)
    const isReset = prevPercent > 50 && percent < 20;
    
    session.contextPercent = percent;
    session.tokensUsed = tokens;

    if (isReset) {
      this.emit('context:reset', { sessionId, percent });
    } else {
      this.emit('context:update', { sessionId, percent, tokens, prevPercent });
    }
  }

  useSkill(skillName: string): void {
    this.state.lastSkill = skillName;
    this.emit('skill:use', skillName);
    console.log(`[BarState] Skill used: ${skillName}`);
  }

  startMcpCall(server: string): void {
    this.state.currentMcp = server;
    this.emit('mcp:start', server);
  }

  endMcpCall(): void {
    this.state.currentMcp = null;
    this.emit('mcp:end');
  }

  getSession(sessionId: string): SessionState | undefined {
    return this.state.sessions.get(sessionId);
  }

  getAllSessions(): SessionState[] {
    return Array.from(this.state.sessions.values());
  }

  getAgent(agentId: string): Agent | undefined {
    return this.state.activeAgents.get(agentId);
  }
}

export const barState = new BarState();
```

## Todo List
- [ ] Create `src/client/state/` directory
- [ ] Implement `socket-client.ts` with Socket.io client
- [ ] Implement `BarState.ts` with EventEmitter pattern
- [ ] Verify exports match existing client imports
- [ ] Test socket connection to server
- [ ] Test state events fire correctly

## Success Criteria
- [ ] `socketClient.connect()` establishes WebSocket connection
- [ ] Server events forwarded to registered listeners
- [ ] `barState` emits events matching Phaser listener expectations
- [ ] Session open/close tracked correctly
- [ ] Agent enter/leave tracked correctly
- [ ] Context updates trigger appropriate events

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| API mismatch with Phaser code | High | High | Match existing imports exactly |
| Socket reconnection issues | Medium | Medium | Implement reconnection with backoff |
| State desync on reconnect | Medium | Medium | Request state sync on reconnect |

## Security Considerations
- Socket connection to localhost only
- No sensitive data stored in state
- Session IDs are temporary identifiers

## Next Steps
- After server (Phase 2) running, test full integration
- Phase 4 (Build Config) required before browser testing
