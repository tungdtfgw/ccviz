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
  'session:close': [data: { sessionId: string; tableIndex: number }];
  'agent:enter': [agent: Agent];
  'agent:leave': [agent: Agent];
  'context:update': [data: { sessionId: string; percent: number; tokens: number; prevPercent?: number }];
  'context:reset': [data: { sessionId: string; percent: number }];
  'skill:use': [skillName: string];
  'mcp:start': [server: string];
  'mcp:end': [];
  'rateLimit': [resetTime: number];
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

    const tableIndex = session.tableIndex;

    // Remove agents associated with this session
    this.state.activeAgents.forEach((agent, agentId) => {
      if (agent.sessionId === sessionId) {
        this.emit('agent:leave', agent);
        this.state.activeAgents.delete(agentId);
      }
    });

    this.state.sessions.delete(sessionId);
    this.emit('session:close', { sessionId, tableIndex });
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
    console.log(`[BarState] Removing agent ${agentId}`);
    const agent = this.state.activeAgents.get(agentId);
    if (!agent) {
      console.warn(`[BarState] Agent ${agentId} not found. Active:`, Array.from(this.state.activeAgents.keys()));
      return;
    }

    if (result) {
      agent.result = result;
    }

    this.state.activeAgents.delete(agentId);
    this.emit('agent:leave', agent);
    console.log(`[BarState] Agent left: ${agent.type} (${agentId})`);
  }

  updateContext(sessionId: string, percent: number, tokens: number): void {
    const session = this.state.sessions.get(sessionId);
    if (!session) {
      console.warn(`[BarState] updateContext for unknown session ${sessionId}`);
      return;
    }

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
