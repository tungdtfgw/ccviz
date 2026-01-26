import type { TeamKey } from './football-team-configs-and-sprite-mappings';

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
  tableAssignments: Map<number, string>;
}
