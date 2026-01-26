import Phaser from 'phaser';
import { socketClient } from '../socket-client';
import { barState, type SessionState, type Agent } from '../state/BarState';
import { SessionCustomerManager } from '../sprites/SessionCustomerManager';
import { SubAgentManager } from '../sprites/SubAgentManager';
import { PhoneBooth } from '../sprites/PhoneBooth';
import { FoodIndicator } from '../sprites/FoodIndicator';
import { BarSign } from '../sprites/BarSign';
import { Bartender } from '../sprites/Bartender';
import { Waiter } from '../sprites/Waiter';
import { SpeechBubblePool } from '../sprites/SpeechBubble';
import { TVDisplay } from '../sprites/TVDisplay';
import type { BarEvent, SessionStartPayload, SubagentPayload, ContextPayload } from '@shared/events';
import type { TeamKey } from '@shared/teams';
import { TEAMS } from '@shared/teams';

export class BarScene extends Phaser.Scene {
  // 8 tables for customers (4 on each side)
  public positions = {
    barCounter: { x: 400, y: 560 },
    bartender: { x: 520, y: 560 },
    waiterHome: { x: 350, y: 500 },
    waiterCounter: { x: 450, y: 520 },
    phoneBooth: { x: 60, y: 280 },
    entrance: { x: 750, y: 450 },
    beerTower: { x: 480, y: 540 },
    // 8 tables in 2 rows
    tables: [
      // Top row (4 tables)
      { x: 120, y: 320 },
      { x: 280, y: 320 },
      { x: 440, y: 320 },
      { x: 600, y: 320 },
      // Bottom row (4 tables)
      { x: 120, y: 450 },
      { x: 280, y: 450 },
      { x: 440, y: 450 },
      { x: 600, y: 450 }
    ],
    // Kitchen door replaces fireplace
    kitchen: { x: 700, y: 240 },
    kitchenDoor: { x: 700, y: 180 },
    // Sub-agent waiting spots (near each table)
    subAgentSpots: [
      { x: 150, y: 350 },
      { x: 310, y: 350 },
      { x: 470, y: 350 },
      { x: 630, y: 350 },
      { x: 150, y: 480 },
      { x: 310, y: 480 },
      { x: 470, y: 480 },
      { x: 630, y: 480 }
    ],
    // TV and decorations
    tv: { x: 400, y: 120 },
    trophyShelf: { x: 150, y: 100 },
    scarves: [
      { x: 80, y: 150 },
      { x: 580, y: 150 }
    ],
    pennants: [
      { x: 250, y: 80 },
      { x: 550, y: 80 }
    ],
    photos: [
      { x: 320, y: 180 },
      { x: 480, y: 180 }
    ],
    menuBoard: { x: 200, y: 520 }
  };

  private barSign!: BarSign;
  private customerManager!: SessionCustomerManager;
  private subAgentManager!: SubAgentManager;
  private phoneBooth!: PhoneBooth;
  private foodIndicator!: FoodIndicator;
  private bartender!: Bartender;
  private waiter!: Waiter;
  private bubblePool!: SpeechBubblePool;
  private tvDisplay!: TVDisplay;

  constructor() {
    super({ key: 'BarScene' });
  }

  create() {
    this.createBackground();
    this.createDecorations();
    this.createFurniture();
    this.createTV();

    // Create game objects
    this.phoneBooth = new PhoneBooth(this, this.positions.phoneBooth.x, this.positions.phoneBooth.y);

    // NPCs
    this.bartender = new Bartender(this, this.positions.bartender.x, this.positions.bartender.y);
    this.waiter = new Waiter(
      this,
      this.positions.waiterHome.x,
      this.positions.waiterHome.y,
      this.positions.waiterCounter.x,
      this.positions.waiterCounter.y,
      this.positions.kitchen.x,
      this.positions.kitchen.y
    );

    // Session customer manager (replaces MainAgent for multi-session)
    this.customerManager = new SessionCustomerManager(
      this,
      this.positions.tables,
      this.positions.entrance
    );

    // Sub-agent manager for task agents
    this.subAgentManager = new SubAgentManager(
      this,
      this.positions.subAgentSpots,
      this.positions.entrance
    );

    // Food indicator near bar counter
    this.foodIndicator = new FoodIndicator(this, this.positions.barCounter.x, this.positions.barCounter.y - 40);

    // Speech bubble pool for dialog
    this.bubblePool = new SpeechBubblePool(this, 10);

    this.setupSocketListeners();
    this.setupStateListeners();

    // Connect to server
    socketClient.connect();
  }

  private createBackground() {
    // Floor (wooden planks style)
    const floor = this.add.graphics();
    floor.fillStyle(0xA1887F);
    floor.fillRect(0, 520, 800, 80);

    // Lower floor area
    floor.fillStyle(0x8D6E63);
    floor.fillRect(0, 260, 800, 260);

    // Floor boards lines
    floor.lineStyle(1, 0x795548, 0.3);
    for (let i = 0; i < 10; i++) {
      floor.lineBetween(0, 280 + i * 30, 800, 280 + i * 30);
    }

    // Walls
    const walls = this.add.graphics();
    walls.fillStyle(0x5D4037);
    walls.fillRect(0, 0, 800, 260);

    // Wall panels
    walls.fillStyle(0x4E342E);
    walls.fillRect(0, 200, 800, 60);

    // Wall accent stripes
    walls.fillStyle(0x8D6E63);
    walls.fillRect(0, 100, 800, 6);
    walls.fillRect(0, 200, 800, 6);
  }

  private createDecorations() {
    // Trophy shelf
    this.add.sprite(this.positions.trophyShelf.x, this.positions.trophyShelf.y, 'trophy-shelf')
      .setOrigin(0.5, 0.5)
      .setDepth(10);

    // Scarves
    this.positions.scarves.forEach((pos, i) => {
      const scarf = this.add.sprite(pos.x, pos.y, 'scarf')
        .setOrigin(0.5, 0)
        .setDepth(10);
      // Vary colors for different teams
      if (i === 1) scarf.setTint(0x004D98); // Blue
    });

    // Pennants
    this.positions.pennants.forEach((pos, i) => {
      const pennant = this.add.sprite(pos.x, pos.y, 'pennant')
        .setOrigin(0.5, 0)
        .setDepth(10);
      if (i === 1) pennant.setTint(0xDA291C); // Red
    });

    // Photo frames
    this.positions.photos.forEach(pos => {
      this.add.sprite(pos.x, pos.y, 'photo-frame')
        .setOrigin(0.5, 0.5)
        .setDepth(10);
    });

    // Menu board near counter
    this.add.sprite(this.positions.menuBoard.x, this.positions.menuBoard.y, 'menu-board')
      .setOrigin(0.5, 1)
      .setDepth(90);

    // Counter decorations (beer glasses)
    for (let i = 0; i < 5; i++) {
      this.add.sprite(150 + i * 30, 515, 'beer-glass')
        .setOrigin(0.5, 1)
        .setDepth(120);
    }
  }

  private createTV() {
    // TV frame
    this.add.sprite(this.positions.tv.x, this.positions.tv.y, 'tv-frame')
      .setOrigin(0.5, 0.5)
      .setDepth(90);

    // TV display component
    this.tvDisplay = new TVDisplay(this, this.positions.tv.x, this.positions.tv.y);
  }

  private createFurniture() {
    const g = this.add.graphics();

    // Kitchen door (replaces fireplace)
    this.add.sprite(
      this.positions.kitchenDoor.x,
      this.positions.kitchenDoor.y,
      'kitchen-door'
    )
      .setOrigin(0.5, 0.5)
      .setDepth(50);

    // Draw 8 tables
    this.positions.tables.forEach((pos) => {
      // Table surface
      g.fillStyle(0x5D4037);
      g.fillRect(pos.x - 40, pos.y - 20, 80, 40);

      // Table edge
      g.fillStyle(0x4E342E);
      g.fillRect(pos.x - 40, pos.y + 16, 80, 6);

      // Chairs (left and right)
      g.fillStyle(0x8D6E63);
      g.fillRect(pos.x - 55, pos.y - 10, 14, 24);
      g.fillRect(pos.x + 41, pos.y - 10, 14, 24);
    });

    // Bar counter at bottom
    g.fillStyle(0x3E2723);
    g.fillRect(100, 530, 600, 60);
    g.fillStyle(0x5D4037);
    g.fillRect(100, 520, 600, 16);

    // Beer taps on counter
    g.fillStyle(0x795548);
    g.fillRect(this.positions.beerTower.x - 20, 490, 40, 40);
    g.fillStyle(0xFFC107);
    g.fillRect(this.positions.beerTower.x - 10, 495, 8, 20);
    g.fillRect(this.positions.beerTower.x + 2, 495, 8, 20);

    // Phone booth (base graphic, sprite added separately)
    this.add.sprite(this.positions.phoneBooth.x, this.positions.phoneBooth.y, 'phone-booth')
      .setOrigin(0.5, 0.5)
      .setDepth(100);

    // Entrance door
    const entrance = this.add.graphics();
    entrance.fillStyle(0x757575);
    entrance.fillRect(this.positions.entrance.x - 35, this.positions.entrance.y - 80, 70, 140);
    entrance.fillStyle(0x616161);
    entrance.fillRect(this.positions.entrance.x - 28, this.positions.entrance.y - 72, 56, 124);
    // Door window
    entrance.fillStyle(0x81D4FA);
    entrance.fillRect(this.positions.entrance.x - 20, this.positions.entrance.y - 60, 40, 40);
    // Door handle
    entrance.fillStyle(0xFFD54F);
    entrance.fillRect(this.positions.entrance.x + 15, this.positions.entrance.y, 6, 12);

    // Sign
    this.barSign = new BarSign(this, this.positions.entrance.x, this.positions.entrance.y - 100);
  }

  private setupSocketListeners() {
    // Session lifecycle
    socketClient.on('session:start', (e: BarEvent) => {
      const p = e.payload as SessionStartPayload;
      barState.openSession(
        p.sessionId,
        p.teamKey as TeamKey,
        p.contextPercent
      );
    });

    socketClient.on('session:end', (e: BarEvent) => {
      const p = e.payload as { sessionId: string };
      barState.closeSession(p.sessionId);
    });

    // Sub-agent lifecycle with description
    socketClient.on('subagent:start', (e: BarEvent) => {
      const p = e.payload as SubagentPayload;
      const sessionId = p.sessionId || barState.getAllSessions()[0]?.sessionId;
      if (sessionId) {
        barState.addAgent(sessionId, p.agentId, p.agentType, p.description);
      }
    });

    // Sub-agent stop with result
    socketClient.on('subagent:stop', (e: BarEvent) => {
      const p = e.payload as SubagentPayload;
      barState.removeAgentById(p.agentId, p.result);
    });

    // MCP tool calls
    socketClient.on('tool:pre', (e: BarEvent) => {
      const p = e.payload as { isMcp: boolean; mcpServer?: string };
      if (p.isMcp && p.mcpServer) {
        barState.startMcpCall(p.mcpServer);
      }
    });

    socketClient.on('tool:post', (e: BarEvent) => {
      const p = e.payload as { isMcp: boolean };
      if (p.isMcp) {
        barState.endMcpCall();
      }
    });

    // Context updates
    socketClient.on('context:update', (e: BarEvent) => {
      const p = e.payload as ContextPayload;
      const sessionId = p.sessionId || barState.getAllSessions()[0]?.sessionId;
      if (sessionId) {
        barState.updateContext(sessionId, p.percent, p.tokens);
      }
    });

    // Skill usage
    socketClient.on('skill:use', (e: BarEvent) => {
      const p = e.payload as { skillName: string };
      barState.useSkill(p.skillName);
    });

    // State sync on reconnect
    socketClient.on('state:sync', (e: BarEvent) => {
      const state = e.payload as {
        sessions: Array<{
          sessionId: string;
          teamKey: TeamKey;
          tableIndex: number;
          contextPercent: number;
          agentIds: string[];
        }>;
      };
      console.log('[BarScene] State sync received:', state.sessions?.length || 0, 'sessions');
      state.sessions?.forEach(s => {
        barState.openSession(s.sessionId, s.teamKey, s.contextPercent);
      });
    });

    // Forward all events to TV display
    const tvEventTypes = [
      'session:start', 'session:end',
      'subagent:start', 'subagent:stop',
      'tool:pre', 'skill:use', 'context:update'
    ];
    tvEventTypes.forEach(type => {
      socketClient.on(type, (e: BarEvent) => {
        this.tvDisplay?.addEvent(e);
      });
    });
  }

  private setupStateListeners() {
    barState.on('bar:open', () => {
      console.log('[BarScene] Bar opened');
    });

    barState.on('bar:close', () => {
      console.log('[BarScene] Bar closed');
    });

    // Beer delivery when session opens
    barState.on('session:open', (session: SessionState) => {
      console.log(`[BarScene] Session opened: ${session.sessionId} (${session.teamKey})`);

      // Wait for customer to reach table (1500ms walk + 200ms buffer) before starting beer delivery
      const table = this.positions.tables[session.tableIndex];
      if (table) {
        this.time.delayedCall(1700, () => {
          this.bartender.prepareBeer(() => {
            this.waiter.queueDelivery(
              table.x,
              table.y,
              session.sessionId,
              session.contextPercent
            );
          });
        });
      }
    });

    barState.on('session:close', ({ sessionId }) => {
      console.log(`[BarScene] Session closed: ${sessionId}`);
    });

    // Context reset (clear/compact) - waiter brings fresh beer tower
    barState.on('context:reset', ({ sessionId, percent }: { sessionId: string; percent: number }) => {
      console.log(`[BarScene] Context reset for ${sessionId}, new level: ${percent}%`);

      const session = barState.getSession(sessionId);
      if (!session) return;

      const table = this.positions.tables[session.tableIndex];
      if (table) {
        // Waiter delivers fresh beer to table
        this.bartender.prepareBeer(() => {
          this.waiter.queueDelivery(table.x, table.y, sessionId, percent);
        });
      }
    });

    barState.on('agent:enter', (agent: Agent) => {
      console.log(`[BarScene] Agent entered: ${agent.type} (${agent.id})`);

      // Show task bubble when agent enters (if description provided)
      if (agent.description) {
        const subAgent = this.subAgentManager.getAgentById(agent.id);
        if (subAgent) {
          const team = TEAMS.find(t => t.key === agent.teamKey);
          const bubble = this.bubblePool.get(subAgent.x, subAgent.y - 60);
          if (bubble) {
            bubble.setText(agent.description, team?.primary);
          }
        }
      }
    });

    barState.on('agent:leave', (agent: Agent) => {
      console.log(`[BarScene] Agent left: ${agent.type}`);

      // Show result bubble before leaving (if result provided, skip if no data)
      if (agent.result) {
        const subAgent = this.subAgentManager.getAgentById(agent.id);
        if (subAgent) {
          const team = TEAMS.find(t => t.key === agent.teamKey);
          const bubble = this.bubblePool.get(subAgent.x, subAgent.y - 60);
          if (bubble) {
            bubble.setText(agent.result, team?.secondary || team?.primary);
          }
        }
      }
    });

    // Skill usage triggers food delivery
    barState.on('skill:use', (skillName: string) => {
      console.log(`[BarScene] Skill used: ${skillName}`);

      // Map skill to food type
      const skillFoodMap: Record<string, string> = {
        'commit': 'burger',
        'review-pr': 'pizza',
        'plan': 'sandwich',
        'debug': 'coffee',
        'test': 'steak',
        'docs': 'salad',
        'cook': 'pizza',
        'research': 'sushi',
        'brainstorm': 'cake'
      };

      const foodType = skillFoodMap[skillName] || 'burger';

      // Find session's table - use first session if multiple
      const sessions = barState.getAllSessions();
      if (sessions.length === 0) return;

      const session = sessions[0];
      const table = this.positions.tables[session.tableIndex];
      if (table) {
        this.waiter.queueFoodDelivery(table.x, table.y, session.sessionId, foodType);
      }
    });

    // Listen for waiter beer delivery - show beer tower on customer table
    this.waiter.onDelivery('beer:delivered', (sessionId: string, contextPercent: number) => {
      // Small delay to ensure customer sprite exists (walking to seat)
      this.time.delayedCall(100, () => {
        const customer = this.customerManager.getCustomer(sessionId);
        if (customer) {
          customer.showBeerTower();
          // Use real context from barState - skip if 0 (wait for real update)
          const session = barState.getAllSessions().find(s => s.sessionId === sessionId);
          const realPercent = session?.contextPercent ?? 0;
          if (realPercent > 0) {
            customer.updateBeerLevel(realPercent);
          }
          // If 0, beer shows full - will update when context:update arrives
        }
      });
    });

    // Listen for waiter food delivery complete
    this.waiter.onDelivery('food:delivered', (sessionId: string) => {
      // Trigger customer eating animation
      const customer = this.customerManager.getCustomer(sessionId);
      customer?.eat();
    });

    // Listen for table vacated - waiter picks up beer tower
    this.events.on('table:vacated', (data: { beerTower: Phaser.GameObjects.Sprite; tableX: number; tableY: number }) => {
      console.log('[BarScene] Table vacated, queuing beer tower pickup');
      this.waiter.queuePickup(data.tableX, data.tableY, data.beerTower);
    });
  }

  update() {
    this.barSign.update();
  }
}
