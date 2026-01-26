---
title: "Phase 1: Shared Types Module"
description: "Create shared TypeScript types for teams, events, and state interfaces"
status: completed
priority: P1
effort: 1h
---

# Phase 1: Shared Types Module

## Context Links
- Main plan: [robotruncc-complete-server-client-integration-plan-overview.md](./robotruncc-complete-server-client-integration-plan-overview.md)
- Client code expecting these: `src/client/scenes/BarScene.ts`, `src/client/sprites/*.ts`

## Overview
- **Priority**: P1 - Must complete first (all other phases depend on this)
- **Status**: Pending
- **Effort**: 1 hour

Create shared TypeScript modules that define types used by both server and client.

## Key Insights
- Client code already imports from `@shared/teams` and `@shared/events`
- Expected exports analyzed from existing client imports:
  - `@shared/teams`: `TEAMS`, `MAX_SESSIONS`, `TeamKey`, `TeamConfig`
  - `@shared/events`: `BarEvent`, `SessionStartPayload`, `SubagentPayload`, `ContextPayload`
- 8 football teams needed (MU, Chelsea, Arsenal, Real Madrid, Barcelona, Juventus, AC Milan, Liverpool)

## Requirements

### Functional
- Define 8 team configurations with colors and sprite keys
- Define all event types for Claude Code -> Server -> Client communication
- Define state interfaces for session and agent tracking

### Non-Functional
- TypeScript strict mode compatible
- Shared between server and client (path alias `@shared`)

## Architecture

```
src/shared/
├── teams.ts      # Team configs and types
├── events.ts     # BarEvent types and payloads
├── state.ts      # State interfaces
└── index.ts      # Re-exports
```

## Related Code Files

### Files to Create
- `src/shared/teams.ts`
- `src/shared/events.ts`
- `src/shared/state.ts`
- `src/shared/index.ts`

### Existing Client Imports (must match)
```typescript
// From BarScene.ts
import type { BarEvent, SessionStartPayload, SubagentPayload, ContextPayload } from '@shared/events';
import type { TeamKey } from '@shared/teams';
import { TEAMS } from '@shared/teams';

// From SessionCustomerManager.ts
import { MAX_SESSIONS, type TeamKey } from '@shared/teams';

// From PreloadScene.ts
import { TEAMS, type TeamConfig } from '@shared/teams';
```

## Implementation Steps

### Step 1: Create `src/shared/teams.ts`
```typescript
export const MAX_SESSIONS = 8;

export type TeamKey = 'mu' | 'chelsea' | 'arsenal' | 'real-madrid' | 'barcelona' | 'juventus' | 'ac-milan' | 'liverpool';

export interface TeamConfig {
  key: TeamKey;
  name: string;
  primary: string;   // Hex color for jersey
  secondary: string; // Hex color for stripes/shorts
  spriteKey: string; // Phaser sprite key
}

export const TEAMS: TeamConfig[] = [
  { key: 'mu', name: 'Manchester United', primary: '#DA291C', secondary: '#FFE500', spriteKey: 'fan-mu' },
  { key: 'chelsea', name: 'Chelsea', primary: '#034694', secondary: '#DBA111', spriteKey: 'fan-chelsea' },
  { key: 'arsenal', name: 'Arsenal', primary: '#EF0107', secondary: '#FFFFFF', spriteKey: 'fan-arsenal' },
  { key: 'real-madrid', name: 'Real Madrid', primary: '#FFFFFF', secondary: '#00529F', spriteKey: 'fan-real-madrid' },
  { key: 'barcelona', name: 'Barcelona', primary: '#004D98', secondary: '#A50044', spriteKey: 'fan-barcelona' },
  { key: 'juventus', name: 'Juventus', primary: '#000000', secondary: '#FFFFFF', spriteKey: 'fan-juventus' },
  { key: 'ac-milan', name: 'AC Milan', primary: '#FB090B', secondary: '#000000', spriteKey: 'fan-ac-milan' },
  { key: 'liverpool', name: 'Liverpool', primary: '#C8102E', secondary: '#00B2A9', spriteKey: 'fan-liverpool' }
];

// Hash session ID to team index for consistent assignment
export function getTeamForSession(sessionId: string): TeamConfig {
  let hash = 0;
  for (let i = 0; i < sessionId.length; i++) {
    hash = ((hash << 5) - hash) + sessionId.charCodeAt(i);
    hash = hash & hash; // Convert to 32-bit integer
  }
  const index = Math.abs(hash) % TEAMS.length;
  return TEAMS[index];
}
```

### Step 2: Create `src/shared/events.ts`
```typescript
import type { TeamKey } from './teams';

export type BarEventType =
  | 'session:start'
  | 'session:end'
  | 'subagent:start'
  | 'subagent:stop'
  | 'tool:pre'
  | 'tool:post'
  | 'skill:use'
  | 'context:update'
  | 'state:sync';

export interface BarEvent {
  type: BarEventType;
  timestamp: number;
  payload: Record<string, unknown>;
}

export interface SessionStartPayload {
  sessionId: string;
  teamKey: TeamKey;
  contextPercent: number;
  tokensUsed?: number;
}

export interface SessionEndPayload {
  sessionId: string;
}

export interface SubagentPayload {
  sessionId: string;
  agentId: string;
  agentType: string;
  description?: string;
  result?: string;
}

export interface ContextPayload {
  sessionId: string;
  percent: number;
  tokens: number;
}

export interface ToolPayload {
  sessionId: string;
  toolName: string;
  isMcp: boolean;
  mcpServer?: string;
}

export interface SkillPayload {
  sessionId: string;
  skillName: string;
}
```

### Step 3: Create `src/shared/state.ts`
```typescript
import type { TeamKey } from './teams';

export interface ServerSessionState {
  sessionId: string;
  teamKey: TeamKey;
  tableIndex: number;
  contextPercent: number;
  tokensUsed: number;
  agentIds: string[];
  createdAt: number;
}

export interface ServerAgentState {
  agentId: string;
  sessionId: string;
  agentType: string;
  description?: string;
  createdAt: number;
}

export interface ServerBarState {
  sessions: Map<string, ServerSessionState>;
  agents: Map<string, ServerAgentState>;
  tableAssignments: Map<number, string>; // tableIndex -> sessionId
}
```

### Step 4: Create `src/shared/index.ts`
```typescript
export * from './teams';
export * from './events';
export * from './state';
```

## Todo List
- [ ] Create `src/shared/` directory
- [ ] Implement `teams.ts` with 8 team configs
- [ ] Implement `events.ts` with all event types
- [ ] Implement `state.ts` with state interfaces
- [ ] Create `index.ts` re-exports
- [ ] Verify TypeScript compiles without errors

## Success Criteria
- [ ] All types compile without TypeScript errors
- [ ] Exports match what client code expects
- [ ] 8 teams defined with distinct colors
- [ ] Event types cover all Claude Code hooks

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Type mismatch with client | Medium | High | Match existing client imports exactly |
| Missing event types | Low | Medium | Comprehensive list from Claude Code hooks |

## Security Considerations
- No sensitive data in type definitions
- Session IDs exposed but are temporary identifiers only

## Next Steps
- After completion, Phase 2 (Server Setup) can begin
- Phase 3 and 4 can start in parallel after Phase 1
