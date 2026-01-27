import Phaser from 'phaser';
import { socketClient } from '../socket-client';
import { barState, type SessionState, type Agent } from '../state/BarState';
import { SessionCustomerManager } from '../sprites/SessionCustomerManager';
import { SubAgentManager } from '../sprites/SubAgentManager';
import { FoodIndicator } from '../sprites/FoodIndicator';
import { BarSign } from '../sprites/BarSign';
import { Bartender } from '../sprites/Bartender';
import { Waiter } from '../sprites/Waiter';
import { Chef } from '../sprites/npc-chef-food-delivery-sprite';
import { SpeechBubblePool } from '../sprites/SpeechBubble';
import { TVDisplay } from '../sprites/TVDisplay';
import { SpeakerControl } from '../sprites/SpeakerControl';
import { WallClock } from '../sprites/WallClock';
import { AudioManager } from '../managers/audio-manager';
import { DayNightController, type PhaseData } from '../managers/day-night-controller';
import type { BarEvent, SessionStartPayload, SubagentPayload, ContextPayload } from '@shared/events';
import type { TeamKey } from '@shared/teams';
import { TEAMS } from '@shared/teams';

interface TableDisplay {
  graphics: Phaser.GameObjects.Graphics;
  logo: Phaser.GameObjects.Sprite | null;
  teamKey: string | null;
}

export class BarScene extends Phaser.Scene {
  // Track table displays (graphics + logo)
  private tableDisplays: TableDisplay[] = [];

  // Default team assignments for table pre-rendering (MUST match TABLE_TEAM_MAPPING in shared/teams)
  private readonly defaultTableTeams: TeamKey[] = [
    'mu', 'chelsea', 'arsenal', 'real-madrid',
    'barcelona', 'juventus', 'ac-milan', 'liverpool'
  ];

  // 8 tables for customers (4 on each side)
  public positions = {
    barCounter: { x: 400, y: 560 },
    bartender: { x: 520, y: 560 },
    waiterHome: { x: 350, y: 500 },
    waiterCounter: { x: 450, y: 520 },
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
    kitchenDoor: { x: 700, y: 220 },
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
    // 3 photos at varied heights for visual interest
    photos: [
      { x: 120, y: 100 },   // Left high
      { x: 220, y: 130 },   // Left lower
      { x: 580, y: 115 }    // Right mid
    ],
    // Trophies - bottom aligned with speaker bottom (y=210)
    trophies: [
      { x: 200, y: 210 },  // Left cup - shifted far left
      { x: 250, y: 210 },  // Left cup - shifted far left
      { x: 540, y: 210 }
    ],
    menuBoard: { x: 200, y: 520 }
  };

  private barSign!: BarSign;
  private customerManager!: SessionCustomerManager;
  private subAgentManager!: SubAgentManager;
  private foodIndicator!: FoodIndicator;
  private bartender!: Bartender;
  private waiter!: Waiter;
  private chef!: Chef;
  private bubblePool!: SpeechBubblePool;
  private tvDisplay!: TVDisplay;
  private speakerControl!: SpeakerControl;
  private wallClock!: WallClock;
  private audioManager!: AudioManager;
  private dayNightController!: DayNightController;

  // Lighting system (Phase 3)
  private ambientOverlay!: Phaser.GameObjects.Graphics;
  private lightSprites: Phaser.GameObjects.Graphics[] = [];

  // Track MCP state for customer food
  private currentMcpSession: string | null = null;

  constructor() {
    super({ key: 'BarScene' });
  }

  create() {
    this.createBackground();
    this.createDecorations();
    this.createFurniture();
    this.createTV();

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
    this.chef = new Chef(this, this.positions.kitchen.x, this.positions.kitchen.y);

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

    // Initialize audio manager (Phase 2)
    this.audioManager = new AudioManager(this);

    // Load mute preference from localStorage
    const savedMuted = localStorage.getItem('ccviz-audio-muted');
    if (savedMuted === 'true') {
      this.audioManager.muteAll();
    }

    // Attempt immediate audio playback (may be blocked by browser autoplay policy)
    const soundManager = this.sound as Phaser.Sound.WebAudioSoundManager;
    if (!soundManager.context || soundManager.context.state === 'suspended') {
      // Audio context suspended - wait for first user interaction
      this.input.once('pointerdown', () => {
        if (!this.audioManager.isMuted()) {
          this.audioManager.playBGM('bgm-80s', true, 2000);
        }
      });
    } else {
      // Audio context ready - start immediately if not muted
      if (!this.audioManager.isMuted()) {
        this.audioManager.playBGM('bgm-80s', true, 2000);
      }
    }

    // Speaker control below TV (interactive with sound waves)
    // Must be created AFTER audioManager initialization
    this.speakerControl = new SpeakerControl(
      this,
      this.positions.tv.x,
      210, // Bottom aligned with trophy cups
      this.audioManager
    );

    // Initialize day/night lighting (Phase 3)
    this.dayNightController = new DayNightController(this);
    this.createLightingOverlay();

    // Wall clock below timer (tracks game day/night cycle)
    this.wallClock = new WallClock(
      this,
      740, // Aligned with timer (700 + 40px offset)
      70,  // Below timer panel with comfortable gap (10 + 28 + 32px)
      this.dayNightController.getCycleDuration()
    );
    this.wallClock.setDepth(1000); // Above all game elements (HUD layer)

    this.setupSocketListeners();
    this.setupStateListeners();

    // Connect to server
    socketClient.connect();
  }

  private createBackground() {
    // Floor (wooden planks style) - warm maple/oak
    const floor = this.add.graphics();
    floor.fillStyle(0xC4956A); // Upper floor - warm maple
    floor.fillRect(0, 520, 800, 80);

    // Lower floor area - medium amber wood
    floor.fillStyle(0xB08050);
    floor.fillRect(0, 260, 800, 260);

    // Floor boards lines - dark goldenrod shadows
    floor.lineStyle(1, 0x8B6914, 0.4);
    for (let i = 0; i < 10; i++) {
      floor.lineBetween(0, 280 + i * 30, 800, 280 + i * 30);
    }

    // Walls - warm honey-oak tone
    const walls = this.add.graphics();
    walls.fillStyle(0xD4A574);
    walls.fillRect(0, 0, 800, 260);

    // Wall panels - rich saddle brown wainscoting
    walls.fillStyle(0x8B5A2B);
    walls.fillRect(0, 200, 800, 60);

    // Wall accent stripes - golden brass
    walls.fillStyle(0xC9A86C);
    walls.fillRect(0, 100, 800, 6);
    walls.fillRect(0, 200, 800, 6);
  }

  private createDecorations() {
    // Photo frames - 3 different players at varied heights
    const photoTextures = ['photo-frame-1', 'photo-frame-2', 'photo-frame-3'];
    this.positions.photos.forEach((pos, i) => {
      this.add.sprite(pos.x, pos.y, photoTextures[i])
        .setOrigin(0.5, 0.5)
        .setScale(1.33)
        .setDepth(10);
    });

    // Individual trophies at speaker level - 2 left, 1 right
    const trophyTypes = ['trophy-worldcup', 'trophy-champions', 'trophy-premier'];
    this.positions.trophies.forEach((pos, i) => {
      this.add.sprite(pos.x, pos.y, trophyTypes[i])
        .setOrigin(0.5, 1)
        .setDepth(10);
    });

    // Bottles (green) - left of beer taps on counter surface
    for (let i = 0; i < 5; i++) {
      this.add.sprite(380 + i * 18, 530, 'bottle')
        .setOrigin(0.5, 1)
        .setDepth(540);  // Above counter (530)
    }

    // Beer glasses (yellow) - near bartender, on counter surface
    for (let i = 0; i < 4; i++) {
      this.add.sprite(560 + i * 18, 530, 'beer-glass')
        .setOrigin(0.5, 1)
        .setDepth(540);  // Above counter (530)
    }

    // Bar name text "Claude Code Bar Pub" in center of counter
    const barNameText = this.add.text(400, 555, 'Claude Code Bar Pub', {
      fontFamily: 'Georgia, serif',
      fontSize: '16px',
      color: '#FFD700',
      fontStyle: 'bold'
    });
    barNameText.setOrigin(0.5, 0.5);
    barNameText.setDepth(540);  // Above counter (530)
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
    // Kitchen door (replaces fireplace)
    this.add.sprite(
      this.positions.kitchenDoor.x,
      this.positions.kitchenDoor.y,
      'kitchen-door'
    )
      .setOrigin(0.5, 0.5)
      .setDepth(50);

    // Draw 8 tables - each with own graphics for proper depth sorting
    // Store in tableDisplays for team color/logo updates
    this.tableDisplays = this.positions.tables.map((pos) => {
      const tableG = this.add.graphics();
      this.drawTable(tableG, pos.x, pos.y); // Default table appearance
      tableG.setDepth(pos.y);

      return {
        graphics: tableG,
        logo: null,
        teamKey: null
      };
    });

    // Pre-render team logos on all 8 tables (FIXED - never changes)
    // Each table is permanently assigned to one team
    // Customers are assigned to tables matching their team
    this.positions.tables.forEach((pos, index) => {
      const teamKey = this.defaultTableTeams[index];
      this.setTableTeam(index, teamKey);
    });

    // Bar counter at bottom - dark mahogany
    const counterG = this.add.graphics();
    counterG.fillStyle(0x6B3A1F);
    counterG.fillRect(100, 530, 600, 60);
    counterG.fillStyle(0x8B4513); // Sienna/polished mahogany top
    counterG.fillRect(100, 520, 600, 16);
    counterG.setDepth(530);

    // Beer taps on counter
    const tapsG = this.add.graphics();
    tapsG.fillStyle(0x795548);
    tapsG.fillRect(this.positions.beerTower.x - 20, 490, 40, 40);
    tapsG.fillStyle(0xFFC107);
    tapsG.fillRect(this.positions.beerTower.x - 10, 495, 8, 20);
    tapsG.fillRect(this.positions.beerTower.x + 2, 495, 8, 20);
    tapsG.setDepth(490);


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

  // Draw table with brown wood surface (no team coloring)
  private drawTable(g: Phaser.GameObjects.Graphics, x: number, y: number, teamColor?: number) {
    g.clear();

    // Table surface - polished oak brown (always, no team color)
    g.fillStyle(0x8B4513);
    g.fillRect(x - 40, y - 20, 80, 40);

    // Table edge - brown mahogany border
    g.fillStyle(0x6B3A1F);
    g.fillRect(x - 40, y + 16, 80, 6);

    // Chairs (left and right) - warm saddle brown
    g.fillStyle(0x8B5A2B);
    g.fillRect(x - 55, y - 10, 14, 24);
    g.fillRect(x + 41, y - 10, 14, 24);
  }

  // Set table to team colors with logo
  // Initialize permanent team logo on table (called ONCE during create)
  private setTableTeam(tableIndex: number, teamKey: TeamKey) {
    if (tableIndex < 0 || tableIndex >= this.tableDisplays.length) return;

    const display = this.tableDisplays[tableIndex];

    // Skip if logo already exists (safety check - should only be called once)
    if (display.teamKey === teamKey && display.logo) return;

    const team = TEAMS.find(t => t.key === teamKey);
    if (!team) return;

    const pos = this.positions.tables[tableIndex];

    // Redraw table with brown wood surface (no team coloring)
    this.drawTable(display.graphics, pos.x, pos.y);

    // Remove old logo if exists
    if (display.logo) {
      display.logo.destroy();
      display.logo = null;
    }

    // Add team logo on table surface (thu nhỏ để không chạm cạnh bàn)
    // Table surface: 80×40px (y-20 to y+20), edge: y+16 to y+22
    // Logo: 28×28px (center tại y, top: y-14, bottom: y+14 → 2px margin từ edge)
    // All logos are PNG 100×100, scaled to 0.28× = 28px
    const logoKey = `logo-${teamKey}`;
    display.logo = this.add.sprite(pos.x, pos.y, logoKey);
    display.logo.setOrigin(0.5, 0.5);
    display.logo.setScale(0.28); // 100×100 PNG → 28×28 display
    display.logo.setDepth(pos.y + 1); // Above table surface
    display.teamKey = teamKey;
  }

  // Reset table to default appearance (keep logo displayed)
  private resetTable(tableIndex: number) {
    if (tableIndex === undefined || tableIndex < 0 || tableIndex >= this.tableDisplays.length) return;

    const display = this.tableDisplays[tableIndex];
    const pos = this.positions.tables[tableIndex];

    // Redraw table with default color
    this.drawTable(display.graphics, pos.x, pos.y);

    // Keep logo displayed - only replaced when different team arrives
    // This preserves "last team at table" visual state
  }

  private setupSocketListeners() {
    // Session lifecycle
    socketClient.on('session:start', (e: BarEvent) => {
      const p = e.payload as SessionStartPayload;
      barState.openSession(
        p.sessionId,
        p.teamKey as TeamKey,
        p.contextPercent,
        p.tableIndex
      );
    });

    socketClient.on('session:end', (e: BarEvent) => {
      const p = e.payload as { sessionId: string };
      barState.closeSession(p.sessionId);
    });

    // Sub-agent lifecycle with description
    socketClient.on('subagent:start', (e: BarEvent) => {
      const p = e.payload as SubagentPayload;
      if (!p.sessionId) {
        console.warn('[BarScene] subagent:start without sessionId, ignoring');
        return;
      }
      barState.addAgent(p.sessionId, p.agentId, p.agentType, p.description);
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
      if (!p.sessionId) {
        console.warn('[BarScene] context:update received without sessionId, ignoring');
        return;
      }
      if (!barState.getSession(p.sessionId)) {
        console.warn(`[BarScene] context:update for unknown session ${p.sessionId}, ignoring`);
        return;
      }
      barState.updateContext(p.sessionId, p.percent, p.tokens);
    });

    // Context reset (/clear or /compact) - for future use if needed
    socketClient.on('context:reset', (e: BarEvent) => {
      const p = e.payload as { sessionId: string; percent: number };
      const session = barState.getSession(p.sessionId);
      if (!session) {
        console.warn(`[BarScene] context:reset for unknown session ${p.sessionId}, ignoring`);
        return;
      }
      barState.emit('context:reset', { sessionId: p.sessionId, percent: p.percent });
      session.contextPercent = p.percent;
      session.tokensUsed = 0;
      console.log(`[BarScene] Context reset for ${p.sessionId}, new level: ${p.percent}%`);
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
        barState.openSession(s.sessionId, s.teamKey, s.contextPercent, s.tableIndex);
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

    // Beer delivery when session opens - bartender greets, customer responds
    barState.on('session:open', (session: SessionState) => {
      console.log(`[BarScene] Session opened: ${session.sessionId} (${session.teamKey})`);

      // Door open sound (Phase 2)
      this.audioManager.playSFX('door-open');

      // Get team color for speech
      const team = TEAMS.find(t => t.key === session.teamKey);
      const teamColor = team?.primary ?? '#D2691E';

      // Logo is already pre-rendered and fixed on tables (no change needed)
      // Customer is assigned to table matching their team

      // Bartender greets the new customer
      this.bartender.speak('Hi, viber!', teamColor);

      // Wait for customer to reach table, then customer greets back bartender
      const table = this.positions.tables[session.tableIndex];
      if (table) {
        this.time.delayedCall(1700, () => {
          // Customer responds to bartender: "Wsup CC?"
          const customer = this.customerManager.getCustomer(session.sessionId);
          customer?.speak('Wsup CC?');

          // After customer greeting, bartender prepares beer
          this.time.delayedCall(2500, () => {
            this.bartender.prepareBeer(() => {
              this.waiter.queueDelivery(
                table.x,
                table.y,
                session.sessionId,
                session.contextPercent
              );
            });
          });
        });
      }
    });

    barState.on('session:close', ({ sessionId, tableIndex }: { sessionId: string; tableIndex: number }) => {
      console.log(`[BarScene] Session closed: ${sessionId}`);

      // Farewell from NPCs (Phase 5) - Both Bartender and Waiter say goodbye
      const session = barState.getSession(sessionId);
      if (session) {
        const team = TEAMS.find(t => t.key === session.teamKey);
        const teamColor = team?.primary ?? '#D2691E';

        // Bartender says farewell
        this.bartender.speak('Good Vibe', teamColor);

        // Waiter says farewell (slightly delayed for natural timing)
        this.time.delayedCall(500, () => {
          this.waiter.speak('Good Vibe', teamColor);
        });
      }

      // Door close sound (Phase 2)
      this.audioManager.playSFX('door-close');

      // Reset table to default appearance
      if (tableIndex !== undefined && tableIndex >= 0) {
        this.resetTable(tableIndex);
      }
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

      // Agent communication with Unicode alien text (Phase 5)
      const parentCustomer = this.customerManager.getCustomer(agent.sessionId);
      const subAgent = this.subAgentManager.getAgentById(agent.id);

      if (parentCustomer && subAgent) {
        // Parent customer speaks alien text to sub-agent
        parentCustomer.speak('', true); // isAlien = true

        // Sub-agent responds with alien text (delayed 2s)
        this.time.delayedCall(2000, () => {
          const team = TEAMS.find(t => t.key === agent.teamKey);
          const bubble = this.bubblePool.get(subAgent.x, subAgent.y - 60);
          if (bubble) {
            bubble.setText('', team?.primary, true); // isAlien = true
          }
        });
      }

      // Show task bubble when agent enters (if description provided)
      // Delayed 4s after alien communication
      if (agent.description) {
        this.time.delayedCall(4000, () => {
          const subAgent = this.subAgentManager.getAgentById(agent.id);
          if (subAgent) {
            const team = TEAMS.find(t => t.key === agent.teamKey);
            const bubble = this.bubblePool.get(subAgent.x, subAgent.y - 60);
            if (bubble && agent.description) {
              bubble.setText(agent.description, team?.primary);
            }
          }
        });
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

    // Skill usage triggers food delivery via waiter
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

    // MCP tool call - customer orders, bartender responds, chef brings food
    barState.on('mcp:start', (serverName: string) => {
      console.log(`[BarScene] MCP call started: ${serverName}`);

      // Kitchen door sound (Phase 2)
      this.audioManager.playSFX('kitchen-door');

      // Find first session for MCP (use first customer)
      const sessions = barState.getAllSessions();
      if (sessions.length === 0) return;

      const session = sessions[0];
      this.currentMcpSession = session.sessionId;
      const customer = this.customerManager.getCustomer(session.sessionId);
      if (!customer) return;

      const team = TEAMS.find(t => t.key === session.teamKey);
      const table = this.positions.tables[session.tableIndex];
      if (!table) return;

      // 1. Customer shouts order: "One [mcp-name] please!"
      customer.speak(`One ${serverName} please!`);

      // 2. After short delay, bartender responds: "One [mcp-name] for [team-name]!"
      this.time.delayedCall(800, () => {
        this.bartender.speak(`One ${serverName} for ${team?.name}!`, team?.primary);
      });

      // 3. Chef brings food from kitchen
      this.time.delayedCall(1200, () => {
        this.chef.queueFoodDelivery(table.x, table.y, session.sessionId, serverName, () => {
          // Food delivered - add to customer's table
          const foodType = this.getRandomFoodType();
          customer.addFood(foodType);
        });
      });
    });

    // MCP tool call ends - clear all food if no more MCP calls pending
    barState.on('mcp:end', () => {
      console.log('[BarScene] MCP call ended');

      // Clear food from customer when MCP flow completes
      if (this.currentMcpSession) {
        const customer = this.customerManager.getCustomer(this.currentMcpSession);
        if (customer) {
          // Delay clearing to allow eating animation to finish
          this.time.delayedCall(1500, () => {
            customer.clearAllFoods();
          });
        }
        this.currentMcpSession = null;
      }
    });

    // Listen for waiter beer delivery - show beer tower on customer table
    this.waiter.onDelivery('beer:delivered', (sessionId: string, contextPercent: number) => {
      // Waiter speaks when delivering beer
      const teamKey = this.customerManager.getCustomerTeam(sessionId);
      const team = TEAMS.find(t => t.key === teamKey);
      this.waiter.speak('Enjoy vibing!', team?.primary);

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

          // Customer greets waiter after receiving beer: "My man, CK!"
          this.time.delayedCall(2500, () => {
            customer.speak('My man, CK!');
          });
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

  update(time: number, delta: number) {
    this.barSign.update();

    // Update day/night lighting cycle (Phase 3)
    const phaseData = this.dayNightController.update(delta);
    this.applyLighting(phaseData);

    // Update wall clock to match game time
    this.wallClock.update(this.dayNightController.getElapsed());
  }

  // Cleanup when scene shuts down
  shutdown() {
    this.audioManager?.destroy();

    // Cleanup table displays to prevent memory leaks
    this.tableDisplays.forEach(display => {
      if (display.logo) {
        display.logo.destroy();
        display.logo = null;
      }
      display.graphics.destroy();
    });
    this.tableDisplays = [];
  }

  /**
   * Create lighting overlay and light sprites (Phase 3)
   */
  private createLightingOverlay() {
    // Ambient overlay - covers entire scene for day/night tinting
    this.ambientOverlay = this.add.graphics();
    this.ambientOverlay.setDepth(1000); // Above everything
    this.ambientOverlay.setAlpha(0.3); // Subtle tint effect
    this.ambientOverlay.setBlendMode(Phaser.BlendModes.MULTIPLY);

    // Indoor light sprites (warm glow near decorations)
    // Light 1: Above left photo frames
    const light1 = this.add.graphics();
    light1.fillStyle(0xFFDC96, 0); // Warm amber, start invisible
    light1.fillCircle(170, 130, 60); // Larger radius for soft glow
    light1.setDepth(5);
    light1.setBlendMode(Phaser.BlendModes.ADD); // Additive blending
    this.lightSprites.push(light1);

    // Light 2: Above TV/speaker area
    const light2 = this.add.graphics();
    light2.fillStyle(0xFFDC96, 0);
    light2.fillCircle(400, 100, 80);
    light2.setDepth(5);
    light2.setBlendMode(Phaser.BlendModes.ADD);
    this.lightSprites.push(light2);

    // Light 3: Above right trophies
    const light3 = this.add.graphics();
    light3.fillStyle(0xFFDC96, 0);
    light3.fillCircle(550, 180, 60);
    light3.setDepth(5);
    light3.setBlendMode(Phaser.BlendModes.ADD);
    this.lightSprites.push(light3);
  }

  /**
   * Apply lighting from day/night cycle (Phase 3)
   * @param data - Current phase data with color and intensity
   */
  private applyLighting(data: PhaseData): void {
    // Update ambient overlay color
    const color = data.ambientColor.color;
    this.ambientOverlay.clear();
    this.ambientOverlay.fillStyle(color, 0.3);
    this.ambientOverlay.fillRect(0, 0, 800, 600);

    // Update indoor light intensity (alpha)
    this.lightSprites.forEach(light => {
      light.clear();
      light.fillStyle(0xFFDC96, data.lightIntensity * 0.6); // Max 60% alpha
      // Redraw at original positions
      if (light === this.lightSprites[0]) {
        light.fillCircle(170, 130, 60);
      } else if (light === this.lightSprites[1]) {
        light.fillCircle(400, 100, 80);
      } else if (light === this.lightSprites[2]) {
        light.fillCircle(550, 180, 60);
      }
    });
  }

  // Get random food type for MCP delivery
  private getRandomFoodType(): string {
    const foodTypes = ['pizza', 'burger', 'steak', 'sushi', 'sandwich', 'salad', 'cake'];
    return foodTypes[Math.floor(Math.random() * foodTypes.length)];
  }
}
