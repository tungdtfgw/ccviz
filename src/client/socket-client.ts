import { io, Socket } from 'socket.io-client';
import type { BarEvent } from '@shared/events';

type EventCallback = (event: BarEvent) => void;

class SocketClient {
  private socket: Socket | null = null;
  private listeners: Map<string, Set<EventCallback>> = new Map();
  private serverUrl: string;

  constructor(url = 'http://localhost:3847') {
    this.serverUrl = url;
  }

  connect(): void {
    if (this.socket?.connected) {
      console.log('[SocketClient] Already connected');
      return;
    }

    console.log(`[SocketClient] Connecting to ${this.serverUrl}`);
    
    this.socket = io(this.serverUrl, {
      transports: ['websocket'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000
    });

    this.socket.on('connect', () => {
      console.log('[SocketClient] Connected:', this.socket?.id);
    });

    this.socket.on('disconnect', (reason) => {
      console.log('[SocketClient] Disconnected:', reason);
    });

    this.socket.on('connect_error', (error) => {
      console.error('[SocketClient] Connection error:', error.message);
    });

    // Forward all server events to registered listeners
    const eventTypes = [
      'session:start', 'session:end',
      'subagent:start', 'subagent:stop',
      'tool:pre', 'tool:post',
      'skill:use', 'context:update', 'context:reset',
      'state:sync'
    ];

    eventTypes.forEach(type => {
      this.socket!.on(type, (event: BarEvent) => {
        this.emit(type, event);
      });
    });
  }

  disconnect(): void {
    this.socket?.disconnect();
    this.socket = null;
  }

  on(event: string, callback: EventCallback): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }

  off(event: string, callback: EventCallback): void {
    this.listeners.get(event)?.delete(callback);
  }

  private emit(event: string, data: BarEvent): void {
    this.listeners.get(event)?.forEach(cb => cb(data));
  }

  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }
}

export const socketClient = new SocketClient();
