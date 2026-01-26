import { Server as SocketServer, Socket } from 'socket.io';
import { stateManager } from './state-manager';

export function setupSocketHandlers(io: SocketServer): void {
  io.on('connection', (socket: Socket) => {
    console.log(`[Socket] Client connected: ${socket.id}`);

    // Send current state to newly connected client
    const syncPayload = stateManager.getStateSyncPayload();
    socket.emit('state:sync', {
      type: 'state:sync',
      timestamp: Date.now(),
      payload: syncPayload
    });

    socket.on('disconnect', () => {
      console.log(`[Socket] Client disconnected: ${socket.id}`);
    });

    socket.on('error', (error) => {
      console.error(`[Socket] Error for ${socket.id}:`, error);
    });
  });
}
