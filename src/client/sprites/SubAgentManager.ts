// Manages sub-agents spawned by CC sessions
// Each sub-agent uses parent session's team color

import Phaser from 'phaser';
import { SubAgent } from './SubAgent';
import { barState, type Agent } from '../state/BarState';
import type { TeamKey } from '@shared/teams';

interface SpotPosition {
  x: number;
  y: number;
  occupied: boolean;
  agentId: string | null;
}

export class SubAgentManager {
  private scene: Phaser.Scene;
  private agents: Map<string, SubAgent> = new Map();
  private spots: SpotPosition[];
  private entrancePos: { x: number; y: number };

  constructor(
    scene: Phaser.Scene,
    spots: { x: number; y: number }[],
    entrance: { x: number; y: number }
  ) {
    this.scene = scene;
    this.spots = spots.map(s => ({ ...s, occupied: false, agentId: null }));
    this.entrancePos = entrance;

    this.setupStateListeners();
  }

  private setupStateListeners() {
    barState.on('agent:enter', (agent: Agent) => {
      this.spawnAgent(agent.id, agent.type, agent.sessionId, agent.teamKey);
    });

    barState.on('agent:leave', (agent: Agent) => {
      this.removeAgent(agent.id);
    });

    barState.on('bar:close', () => {
      this.clearAll();
    });
  }

  private findAvailableSpot(): SpotPosition | null {
    return this.spots.find(s => !s.occupied) || null;
  }

  spawnAgent(agentId: string, agentType: string, sessionId: string, teamKey: TeamKey) {
    if (this.agents.has(agentId)) return;

    const spot = this.findAvailableSpot();
    if (!spot) {
      console.warn('[SubAgentManager] No available spots for agent:', agentId);
      return;
    }

    spot.occupied = true;
    spot.agentId = agentId;

    const agent = new SubAgent(
      this.scene,
      this.entrancePos.x,
      this.entrancePos.y,
      agentId,
      agentType,
      spot.x,
      spot.y,
      teamKey  // Pass team key for matching colors
    );

    this.agents.set(agentId, agent);
    console.log(`[SubAgentManager] Spawned ${agentType} (${agentId}) with team ${teamKey}`);
  }

  removeAgent(agentId: string) {
    console.log(`[SubAgentManager] Removing agent ${agentId}`);
    const agent = this.agents.get(agentId);
    if (!agent) {
      console.warn(`[SubAgentManager] Agent ${agentId} not found. Active:`, Array.from(this.agents.keys()));
      return;
    }

    // Free the spot
    const spot = this.spots.find(s => s.agentId === agentId);
    if (spot) {
      spot.occupied = false;
      spot.agentId = null;
    }

    agent.leave(this.entrancePos.x, this.entrancePos.y, () => {
      this.agents.delete(agentId);
    });
  }

  clearAll() {
    this.agents.forEach((agent) => {
      agent.destroy();
    });
    this.agents.clear();
    this.spots.forEach(s => {
      s.occupied = false;
      s.agentId = null;
    });
  }

  getAgentCount(): number {
    return this.agents.size;
  }

  getAgentById(agentId: string): SubAgent | undefined {
    return this.agents.get(agentId);
  }
}
