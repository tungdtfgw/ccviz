import { Server as SocketServer } from 'socket.io';
import type { BarEvent, SessionStartPayload, SubagentPayload, ContextPayload } from '@shared/events';
import { stateManager } from './state-manager';

export function handleEvent(event: BarEvent, io: SocketServer): void {
  const { type, payload } = event;
  
  console.log(`[EventHandler] Received ${type}`, payload);

  switch (type) {
    case 'session:start': {
      const p = payload as SessionStartPayload;
      const session = stateManager.openSession(p.sessionId, p.contextPercent);
      if (session) {
        // Enrich payload with assigned team and table
        const enrichedPayload: SessionStartPayload = {
          sessionId: session.sessionId,
          teamKey: session.teamKey,
          tableIndex: session.tableIndex,
          contextPercent: session.contextPercent
        };
        io.emit('session:start', { type, timestamp: event.timestamp, payload: enrichedPayload });
      }
      break;
    }

    case 'session:end': {
      const p = payload as { sessionId: string };
      const closed = stateManager.closeSession(p.sessionId);
      if (closed) {
        io.emit('session:end', event);
      }
      break;
    }

    case 'subagent:start': {
      const p = payload as SubagentPayload;
      const session = stateManager.getSession(p.sessionId);
      if (session) {
        stateManager.addAgent(p.sessionId, p.agentId, p.agentType, p.description);
        io.emit('subagent:start', event);
      }
      break;
    }

    case 'subagent:stop': {
      const p = payload as SubagentPayload;
      if (!p.agentId) {
        console.warn('[EventHandler] subagent:stop without agentId');
        break;
      }
      const removed = stateManager.removeAgent(p.agentId);
      if (!removed) {
        console.warn(`[EventHandler] Agent ${p.agentId} not found in state`);
      }
      io.emit('subagent:stop', event);
      break;
    }

    case 'context:update': {
      const p = payload as ContextPayload;
      stateManager.updateContext(p.sessionId, p.percent, p.tokens);
      io.emit('context:update', event);
      break;
    }

    case 'context:reset': {
      // Context cleared (via /clear or /compact) - for future use if needed
      const p = payload as { sessionId: string; percent: number };
      const session = stateManager.getSession(p.sessionId);
      if (session) {
        stateManager.updateContext(p.sessionId, p.percent, 0);
        io.emit('context:reset', event);
      }
      break;
    }

    case 'tool:pre':
    case 'tool:post':
    case 'skill:use':
      // Broadcast directly to clients
      io.emit(type, event);
      break;

    default:
      console.warn(`[EventHandler] Unknown event type: ${type}`);
  }
}
