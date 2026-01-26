import type { TeamKey } from './football-team-configs-and-sprite-mappings';

export type BarEventType =
  | 'session:start'
  | 'session:end'
  | 'subagent:start'
  | 'subagent:stop'
  | 'tool:pre'
  | 'tool:post'
  | 'skill:use'
  | 'context:update'
  | 'context:reset'
  | 'state:sync';

export interface BarEvent<T = unknown> {
  type: BarEventType;
  timestamp: number;
  payload: T;
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

export interface StateSyncPayload {
  sessions: Array<{
    sessionId: string;
    teamKey: TeamKey;
    tableIndex: number;
    contextPercent: number;
    tokensUsed: number;
  }>;
  agents: Array<{
    agentId: string;
    sessionId: string;
    agentType: string;
    description?: string;
  }>;
}
