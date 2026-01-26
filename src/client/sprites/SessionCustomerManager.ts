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
  private phoneBoothPos: { x: number; y: number } = { x: 60, y: 280 };
  private customerAtPhone: SessionCustomer | null = null;
  private onMcpStartCallback: ((serverName: string) => void) | null = null;
  private onMcpEndCallback: (() => void) | null = null;

  constructor(
    scene: Phaser.Scene,
    tables: { x: number; y: number }[],
    entrance: { x: number; y: number },
    phoneBooth?: { x: number; y: number }
  ) {
    this.scene = scene;
    this.entrancePos = entrance;
    if (phoneBooth) this.phoneBoothPos = phoneBooth;

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

    barState.on('session:close', ({ sessionId }: { sessionId: string }) => {
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

    // MCP call events - customer walks to phone booth
    barState.on('mcp:start', (serverName: string) => {
      this.handleMcpStart(serverName);
    });

    barState.on('mcp:end', () => {
      this.handleMcpEnd();
    });

    // Note: Don't listen to bar:close here - session:close already handles customer exit
    // with proper walk animation. bar:close would call clearAll() which destroys immediately.
  }

  // Handle MCP call start - find a customer to walk to phone booth
  private handleMcpStart(serverName: string) {
    // If customer is walking back from phone, redirect them back to phone booth
    if (this.customerAtPhone && this.customerAtPhone.isWalkingBack()) {
      this.customerAtPhone.walkToPhoneBooth(this.phoneBoothPos.x, this.phoneBoothPos.y, () => {
        this.onMcpStartCallback?.(serverName);
      });
      return;
    }

    // If already have a customer at phone or walking to phone, just update the call display
    if (this.customerAtPhone) {
      // Customer already at phone booth - just show new server name when they arrive
      console.log('[CustomerManager] MCP call while customer already at/going to phone');
      return;
    }

    // Find first available customer
    const availableCustomer = this.getAllCustomers().find(c => c.canMakeCall());
    if (!availableCustomer) {
      console.log('[CustomerManager] No available customer for MCP call');
      return;
    }

    this.customerAtPhone = availableCustomer;
    availableCustomer.walkToPhoneBooth(this.phoneBoothPos.x, this.phoneBoothPos.y, () => {
      // Customer arrived at phone booth - notify PhoneBooth to show bubble
      this.onMcpStartCallback?.(serverName);
    });
  }

  // Handle MCP call end - customer walks back to seat
  private handleMcpEnd() {
    if (!this.customerAtPhone) return;

    const customer = this.customerAtPhone;
    customer.walkBackToSeat(() => {
      // Only hide phone booth and clear if customer actually returned to seat
      // (state is now 'seated', not 'at_phone' or 'walking_to_phone' from a new call)
      if (customer.isSeated()) {
        this.onMcpEndCallback?.();
        this.customerAtPhone = null;
      }
      // If customer is at phone or walking to phone (new call), don't hide
    });
  }

  // Set callbacks for PhoneBooth integration
  setMcpCallbacks(onStart: (serverName: string) => void, onEnd: () => void) {
    this.onMcpStartCallback = onStart;
    this.onMcpEndCallback = onEnd;
  }

  private getTable(tableIndex: number): TablePosition | null {
    if (tableIndex >= 0 && tableIndex < this.tables.length) {
      return this.tables[tableIndex];
    }
    return null;
  }

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
        // Table already occupied, find another
        const available = this.findAvailableTable();
        if (available) {
          table = available.table;
          finalTableIndex = available.index;
        } else {
          console.warn(`[CustomerManager] No tables available for ${sessionId}`);
          return;
        }
      }
    } else {
      const available = this.findAvailableTable();
      if (available) {
        table = available.table;
        finalTableIndex = available.index;
      }
    }

    if (!table) {
      console.warn(`[CustomerManager] No tables available for ${sessionId}`);
      return;
    }

    table.occupied = true;
    table.sessionId = sessionId;

    const customer = new SessionCustomer(
      this.scene,
      sessionId,
      teamKey,
      finalTableIndex,
      this.entrancePos.x,
      this.entrancePos.y,
      table.x,
      table.y
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

    // If this customer is at phone booth, clear the reference and hide phone booth
    if (this.customerAtPhone === customer) {
      this.onMcpEndCallback?.();
      this.customerAtPhone = null;
    }

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
