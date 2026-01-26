---
title: "Robot Runner CC - Sports Bar Visualization"
description: "Complete server & client integration for Claude Code activity visualization as a sports bar"
status: in-progress
priority: P1
effort: 8h
branch: main
tags: [websocket, phaser, bun, socket.io, visualization]
created: 2026-01-26
---

# Robot Runner CC Implementation Plan

## Overview
Build the server infrastructure and missing client modules to visualize Claude Code sessions as customers in a sports bar. Each CC session becomes a football fan with team colors, drinking beer (context usage) while watching TV (event feed).

## What Exists
- **Client-side Phaser.js** fully implemented in `src/client/`:
  - Scenes: PreloadScene, BarScene, HUDScene
  - Sprites: SessionCustomer, SubAgent, Waiter, Bartender, TVDisplay, BeerTower, etc.
  - Features: 8 tables, multi-session support, beer tower context visualization

## What Must Be Created

| Component | Location | Priority |
|-----------|----------|----------|
| Shared types | `src/shared/` | P1 |
| Bun + Socket.io server | `src/server/` | P1 |
| Client socket + state | `src/client/` | P1 |
| Build config | Root files | P1 |
| Claude Code hooks | `.claude/hooks/` | P2 |

## Phases

### Phase 1: Shared Types Module (1h)
[phase-01-shared-types-module.md](./phase-01-shared-types-module.md)
- src/shared/teams.ts - 8 football team configs
- src/shared/events.ts - BarEvent types
- src/shared/state.ts - State interfaces

### Phase 2: Server Setup (2h)
[phase-02-bun-socketio-server-setup.md](./phase-02-bun-socketio-server-setup.md)
- Bun + Socket.io WebSocket server
- REST endpoint for Claude Code hooks
- State management, broadcasting

### Phase 3: Client Socket & State (1.5h)
[phase-03-client-socket-state-management.md](./phase-03-client-socket-state-management.md)
- Socket.io client connection
- EventEmitter-based BarState
- Session, agent, context tracking

### Phase 4: Build Configuration (1h)
[phase-04-build-configuration-vite-typescript.md](./phase-04-build-configuration-vite-typescript.md)
- package.json with all deps
- Vite config for client
- TypeScript config
- index.html entry

### Phase 5: Claude Code Hooks (1.5h)
[phase-05-claude-code-hooks-integration.md](./phase-05-claude-code-hooks-integration.md)
- SessionStart/SessionStop hooks
- SubagentStart/SubagentStop hooks (agent_id, agent_type available)
- PreToolUse/PostToolUse hooks (MCP tools via `mcp__<server>__<tool>` pattern)
- Status hook for context percentage (statusline only)
- **Note**: Skill names NOT available via global hooks (per research)

### Phase 6: Testing & Integration (1h)
[phase-06-testing-integration-validation.md](./phase-06-testing-integration-validation.md)
- Manual testing workflow
- Server health checks
- End-to-end validation

## Architecture Diagram

```
Claude Code (.claude/hooks) --curl POST--> Bun Server :3847
                                              |
                                         REST API /api/events
                                              |
                                         State Manager
                                              |
                                         Socket.io
                                              |
                                         WebSocket
                                              |
Browser Client: SocketClient <--> BarState <--> Phaser.js (BarScene, HUDScene)
```

## Key Design Decisions
1. Server port: 3847 (configurable via PORT env)
2. Hooks use curl POST to http://localhost:3847/api/events
3. Socket.io rooms by session for efficient broadcasting
4. In-memory state (no persistence needed)
5. Team assignment: Hash-based from session ID for consistency

## Dependencies
- Runtime: Bun 1.x
- Server: socket.io, @socket.io/bun-engine
- Client: phaser, socket.io-client, eventemitter3
- Build: vite, typescript

## Success Criteria
- [ ] Server starts and accepts WebSocket connections
- [ ] REST endpoint receives and broadcasts events
- [ ] Client displays customers at tables on session:start
- [ ] Beer tower depletes as context increases
- [ ] Subagents appear/disappear correctly
- [ ] TV display shows event feed
