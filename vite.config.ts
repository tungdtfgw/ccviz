import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  root: '.',
  base: '/',
  resolve: {
    alias: {
      '@shared/teams': resolve(__dirname, 'src/shared/football-team-configs-and-sprite-mappings.ts'),
      '@shared/events': resolve(__dirname, 'src/shared/claude-code-event-stream-types-and-payloads.ts'),
      '@shared/state': resolve(__dirname, 'src/shared/server-session-and-agent-state-interfaces.ts'),
      '@shared': resolve(__dirname, 'src/shared/robotruncc-shared-types-teams-events-state-barrel.ts')
    }
  },
  server: {
    port: 5173,
    open: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3847',
        changeOrigin: true
      },
      '/socket.io': {
        target: 'http://localhost:3848',
        ws: true
      }
    }
  },
  build: {
    outDir: 'dist/client',
    sourcemap: true
  },
  optimizeDeps: {
    include: ['phaser', 'socket.io-client', 'eventemitter3']
  }
});
