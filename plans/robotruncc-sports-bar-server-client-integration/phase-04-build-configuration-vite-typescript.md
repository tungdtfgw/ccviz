---
title: "Phase 4: Build Configuration (Vite, TypeScript)"
description: "Configure build tooling, dependencies, and entry points"
status: completed
priority: P1
effort: 1h
---

# Phase 4: Build Configuration

## Context Links
- Main plan: [robotruncc-complete-server-client-integration-plan-overview.md](./robotruncc-complete-server-client-integration-plan-overview.md)
- Can run in parallel with: [phase-02-bun-socketio-server-setup.md](./phase-02-bun-socketio-server-setup.md), [phase-03-client-socket-state-management.md](./phase-03-client-socket-state-management.md)

## Overview
- **Priority**: P1 - Required for running anything
- **Status**: Pending
- **Effort**: 1 hour

Configure the project build system with Vite for client bundling, TypeScript for type checking, and npm scripts for development workflow.

## Key Insights
- Bun for server runtime and package management
- Vite for client-side bundling (fast HMR, ESM native)
- TypeScript path aliases for @shared imports
- Separate entry points: server (Bun) and client (Vite)

## Requirements

### Functional
- `bun run dev:server` - Start Bun server
- `bun run dev:client` - Start Vite dev server
- `bun run dev` - Start both server and client
- `bun run build` - Build client for production
- TypeScript compilation without errors
- Path alias `@shared` resolves to `src/shared/`

### Non-Functional
- Fast hot reload for development
- Clean console output
- Sourcemaps for debugging

## Architecture

```
/
├── package.json          # Dependencies and scripts
├── tsconfig.json         # TypeScript config
├── vite.config.ts        # Vite bundler config
├── index.html            # Client entry HTML
└── src/
    ├── shared/           # Shared types (aliased as @shared)
    ├── server/           # Bun server code
    └── client/           # Vite client code
        └── main.ts       # Client entry point
```

## Related Code Files

### Files to Create
- `package.json`
- `tsconfig.json`
- `vite.config.ts`
- `index.html`
- `src/client/main.ts`

### Existing Files to Verify
- `src/client/scenes/PreloadScene.ts`
- `src/client/scenes/BarScene.ts`
- `src/client/scenes/HUDScene.ts`

## Implementation Steps

### Step 1: Create `package.json`
```json
{
  "name": "robotruncc",
  "version": "0.1.0",
  "description": "2D pixel art visualization of Claude Code activities as a sports bar",
  "type": "module",
  "scripts": {
    "dev": "concurrently \"bun run dev:server\" \"bun run dev:client\"",
    "dev:server": "bun --watch src/server/index.ts",
    "dev:client": "vite",
    "build": "vite build",
    "build:server": "bun build src/server/index.ts --outdir dist/server --target bun",
    "preview": "vite preview",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "eventemitter3": "^5.0.1",
    "phaser": "^3.80.1",
    "socket.io": "^4.7.4",
    "socket.io-client": "^4.7.4"
  },
  "devDependencies": {
    "@types/bun": "^1.1.0",
    "concurrently": "^8.2.2",
    "typescript": "^5.4.2",
    "vite": "^5.2.0"
  }
}
```

### Step 2: Create `tsconfig.json`
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "strict": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "preserve",
    "baseUrl": ".",
    "paths": {
      "@shared/*": ["src/shared/*"],
      "@shared": ["src/shared/index.ts"]
    },
    "types": ["bun-types"]
  },
  "include": [
    "src/**/*.ts",
    "src/**/*.tsx",
    "vite.config.ts"
  ],
  "exclude": [
    "node_modules",
    "dist"
  ]
}
```

### Step 3: Create `vite.config.ts`
```typescript
import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  root: '.',
  base: '/',
  resolve: {
    alias: {
      '@shared': resolve(__dirname, 'src/shared')
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
        target: 'http://localhost:3847',
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
```

### Step 4: Create `index.html`
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Robot Runner CC</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      background-color: #1a1a2e;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      overflow: hidden;
    }
    #game-container {
      border: 4px solid #4a4e69;
      border-radius: 8px;
      box-shadow: 0 0 20px rgba(0, 0, 0, 0.5);
    }
    canvas {
      display: block;
    }
  </style>
</head>
<body>
  <div id="game-container"></div>
  <script type="module" src="/src/client/main.ts"></script>
</body>
</html>
```

### Step 5: Create `src/client/main.ts`
```typescript
import Phaser from 'phaser';
import { PreloadScene } from './scenes/PreloadScene';
import { BarScene } from './scenes/BarScene';
import { HUDScene } from './scenes/HUDScene';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  parent: 'game-container',
  backgroundColor: '#1a1a2e',
  pixelArt: true,
  scene: [PreloadScene, BarScene, HUDScene],
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 0 },
      debug: false
    }
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  }
};

const game = new Phaser.Game(config);

// Hot module replacement support
if (import.meta.hot) {
  import.meta.hot.accept(() => {
    game.destroy(true);
  });
}

console.log('[RobotRunnerCC] Game initialized');
```

### Step 6: Create `.gitignore` updates
```
# Dependencies
node_modules/

# Build outputs
dist/

# Environment
.env
.env.local

# IDE
.vscode/
.idea/

# OS
.DS_Store
Thumbs.db

# Logs
*.log

# Bun
bun.lockb
```

## Todo List
- [ ] Create `package.json` with all dependencies
- [ ] Create `tsconfig.json` with path aliases
- [ ] Create `vite.config.ts` with proxy settings
- [ ] Create `index.html` game container
- [ ] Create `src/client/main.ts` Phaser entry
- [ ] Update `.gitignore` if needed
- [ ] Run `bun install` to install dependencies
- [ ] Verify `bun run typecheck` passes
- [ ] Verify `bun run dev:client` starts Vite
- [ ] Verify `bun run dev:server` starts server

## Success Criteria
- [ ] `bun install` completes without errors
- [ ] `bun run typecheck` passes
- [ ] `bun run dev:client` starts Vite dev server
- [ ] `bun run dev:server` starts Bun server
- [ ] `bun run dev` starts both concurrently
- [ ] Browser loads game at http://localhost:5173
- [ ] @shared imports resolve correctly

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Path alias issues | Medium | High | Test with both Vite and TypeScript |
| Vite/Phaser compatibility | Low | Medium | Use tested Phaser version |
| Proxy configuration | Low | Medium | Verify WebSocket proxy works |

## Security Considerations
- No API keys in committed files
- Proxy only for localhost development
- Production build serves static files only

## Next Steps
- All phases can proceed once build config works
- Integration testing requires all phases complete
