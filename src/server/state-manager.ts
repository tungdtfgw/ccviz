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
