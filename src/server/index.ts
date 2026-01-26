import { createServer } from 'http';
import { Server as SocketServer } from 'socket.io';
import { handleEvent } from './event-handlers';
import { setupSocketHandlers } from './socket-handlers';
import type { BarEvent } from '@shared/events';

const PORT = parseInt(process.env.PORT || '3847', 10);

// Create Socket.io server first
const httpServer = createServer();
const io = new SocketServer(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

setupSocketHandlers(io);

// Handle HTTP requests with Bun
const server = Bun.serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url);

    // CORS headers
    const headers = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    };

    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers });
    }

    // Health check
    if (url.pathname === '/health' && req.method === 'GET') {
      return new Response(JSON.stringify({ status: 'ok', timestamp: Date.now() }), {
        headers: { ...headers, 'Content-Type': 'application/json' }
      });
    }

    // Event endpoint
    if (url.pathname === '/api/events' && req.method === 'POST') {
      try {
        const body = await req.json() as BarEvent;
        handleEvent(body, io);
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...headers, 'Content-Type': 'application/json' }
        });
      } catch (error) {
        console.error('[Server] Error parsing event:', error);
        return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
          status: 400,
          headers: { ...headers, 'Content-Type': 'application/json' }
        });
      }
    }

    // 404 for unknown routes
    return new Response('Not Found', { status: 404, headers });
  }
});

// Start Socket.io server on a different port for WebSockets
const WS_PORT = PORT + 1;
httpServer.listen(WS_PORT, () => {
  console.log(`[Server] Socket.io WebSocket running on http://localhost:${WS_PORT}`);
});

console.log(`[Server] Robot Runner CC HTTP server running on http://localhost:${PORT}`);
console.log(`[Server] REST endpoint: http://localhost:${PORT}/api/events`);
console.log(`[Server] Note: Update client to connect to ws://localhost:${WS_PORT}`);
