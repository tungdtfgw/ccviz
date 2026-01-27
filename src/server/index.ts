import express from 'express';
import { createServer } from 'http';
import { Server as SocketServer } from 'socket.io';
import { handleEvent } from './event-handlers';
import { setupSocketHandlers } from './socket-handlers';
import type { BarEvent } from '@shared/events';

const PORT = parseInt(process.env.PORT || '3847', 10);

// Create Express app for HTTP endpoints
const app = express();
app.use(express.json());

// CORS middleware
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

// Create HTTP server and Socket.io server
const httpServer = createServer(app);
const io = new SocketServer(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

setupSocketHandlers(io);

// Event endpoint
app.post('/api/events', (req, res) => {
  try {
    const body = req.body as BarEvent;
    handleEvent(body, io);
    res.json({ success: true });
  } catch (error) {
    console.error('[Server] Error parsing event:', error);
    res.status(400).json({ error: 'Invalid JSON' });
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).send('Not Found');
});

// Start server (single port for both HTTP and WebSocket)
httpServer.listen(PORT, () => {
  console.log(`[Server] Robot Runner CC server running on http://localhost:${PORT}`);
  console.log(`[Server] REST endpoint: http://localhost:${PORT}/api/events`);
  console.log(`[Server] WebSocket endpoint: ws://localhost:${PORT}`);
});
