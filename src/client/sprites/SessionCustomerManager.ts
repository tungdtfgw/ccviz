// Manages multiple session customers (football fans) at tables
// Each CC session gets one customer at their own table

import Phaser from 'phaser';
import { SessionCustomer } from './SessionCustomer';
import { barState, type SessionState } from '../state/BarState';
import { MAX_SESSIONS, type TeamKey } from '@shared/teams';

interface TablePosition {
  x: number;
  y: number;
  occupied: boolean;
  sessionId: string | null;
}

export class SessionCustomerManager {
  private scene: Phaser.Scene;
  private customers: Map<string, SessionCustomer> = new Map();
  private tables: TablePosition[];
  private entrancePos: { x: number; y: number };

  constructor(
    scene: Phaser.Scene,
    tables: { x: number; y: number }[],
    entrance: { x: number; y: number }
  ) {
    this.scene = scene;
    this.entrancePos = entrance;

    // Initialize 8 table positions
    this.tables = tables.map(t => ({
      x: t.x,
      y: t.y,
      occupied: false,
      sessionId: null
    }));

    // Ensure we have exactly MAX_SESSIONS tables
    while (this.tables.length < MAX_SESSIONS) {
      const lastTable = this.tables[this.tables.length - 1] || { x: 200, y: 400 };
      this.tables.push({
        x: lastTable.x + 100,
        y: lastTable.y,
        occupied: false,
        sessionId: null
      });
    }

    this.setupListeners();
  }

  private setupListeners() {
    barState.on('session:open', (session: SessionState) => {
      this.addCustomer(session.sessionId, session.teamKey, session.tableIndex, session.contextPercent, session.tokensUsed);
    });

    barState.on('session:close', ({ sessionId }: { sessionId: string; tableIndex: number }) => {
      this.removeCustomer(sessionId);
    });

    barState.on('context:update', ({ sessionId, percent, tokens, prevPercent }: { sessionId: string; percent: number; tokens: number; prevPercent?: number }) => {
      const customer = this.customers.get(sessionId);
      if (customer) {
        // Drink only when context INCREASED (user asked something)
        const contextIncreased = prevPercent !== undefined && percent > prevPercent;
        customer.updateBeerLevel(percent, tokens, contextIncreased);
      }
    });

    // Note: MCP handling moved to BarScene for new food flow
    // Note: Don't listen to bar:close here - session:close already handles customer exit
    // with proper walk animation. bar:close would call clearAll() which destroys immediately.
  }

  private getTable(tableIndex: number): TablePosition | null {
    if (tableIndex >= 0 && tableIndex < this.tables.length) {
      return this.tables[tableIndex];
    }
    return null;
  }

  // DEPRECATED: Fallback logic removed to maintain logo-table matching
  private findAvailableTable(): { table: TablePosition; index: number } | null {
    for (let i = 0; i < this.tables.length; i++) {
      if (!this.tables[i].occupied) {
        return { table: this.tables[i], index: i };
      }
    }
    return null;
  }

  addCustomer(sessionId: string, teamKey: TeamKey, tableIndex?: number, contextPercent?: number, tokensUsed?: number) {
    if (this.customers.has(sessionId)) {
      console.log(`[CustomerManager] Session ${sessionId} already exists`);
      return;
    }

    // Use provided tableIndex or find available
    let table: TablePosition | null = null;
    let finalTableIndex = tableIndex ?? -1;

    if (tableIndex !== undefined && tableIndex >= 0) {
      table = this.getTable(tableIndex);
      if (table && table.occupied) {
        // Table already occupied - REJECT (no fallback to maintain logo matching)
        console.error(`[CustomerManager] Table ${tableIndex} for ${sessionId} (${teamKey}) is occupied. Server should not assign occupied tables.`);
        return;
      }
    } else {
      // No table assigned from server - should not happen
      console.error(`[CustomerManager] No table index provided for ${sessionId}`);
      return;
    }

    if (!table) {
      console.warn(`[CustomerManager] No tables available for ${sessionId}`);
      return;
    }

    table.occupied = true;
    table.sessionId = sessionId;

    // Customer sits at one of 3 positions: left, right, or below table
    // This creates variety and ensures proper depth layering (never above table)
    const seatPositions = [
      { x: table.x - 45, y: table.y },      // Left side
      { x: table.x + 45, y: table.y },      // Right side
      { x: table.x, y: table.y + 25 }       // Below/front
    ];
    const seatIndex = finalTableIndex % 3;  // Deterministic based on table index
    const seat = seatPositions[seatIndex];

    const customer = new SessionCustomer(
      this.scene,
      sessionId,
      teamKey,
      finalTableIndex,
      this.entrancePos.x,
      this.entrancePos.y,
      seat.x,
      seat.y,
      table.x // Pass table center X for smart beer positioning
    );

    // Set initial beer level
    if (contextPercent !== undefined) {
      customer.updateBeerLevel(contextPercent, tokensUsed ?? 0);
    }

    this.customers.set(sessionId, customer);
    console.log(`[CustomerManager] Added customer ${sessionId} at table ${finalTableIndex}`);
  }

  removeCustomer(sessionId: string) {
    const customer = this.customers.get(sessionId);
    if (!customer) return;

    // Free the table
    const tableIndex = customer.tableIndex;
    if (tableIndex >= 0 && tableIndex < this.tables.length) {
      this.tables[tableIndex].occupied = false;
      this.tables[tableIndex].sessionId = null;
    }

    customer.leave(this.entrancePos.x, this.entrancePos.y, (beerTower, tableX, tableY) => {
      this.customers.delete(sessionId);
      console.log(`[CustomerManager] Removed customer ${sessionId}`);

      // Emit event for waiter to pickup beer tower (if any)
      if (beerTower) {
        this.scene.events.emit('table:vacated', { beerTower, tableX, tableY });
      }
    });
  }

  clearAll() {
    this.customers.forEach((customer) => {
      customer.destroy();
    });
    this.customers.clear();
    this.tables.forEach(t => {
      t.occupied = false;
      t.sessionId = null;
    });
  }

  getCustomer(sessionId: string): SessionCustomer | undefined {
    return this.customers.get(sessionId);
  }

  getCustomerTeam(sessionId: string): TeamKey | undefined {
    return this.customers.get(sessionId)?.teamKey;
  }

  getCustomerCount(): number {
    return this.customers.size;
  }

  getAllCustomers(): SessionCustomer[] {
    return Array.from(this.customers.values());
  }
}
