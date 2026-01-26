# ccviz - Claude Code Visualization

A 2D pixel art visualization of Claude Code activities as a sports bar scene.

Watch your AI coding sessions come to life as customers ordering drinks at a cozy pub!

## Features

- **Real-time visualization** of Claude Code sessions
- **Sports bar theme** with bartender, waiter, chef NPCs
- **Team-based customers** representing different sessions (8 football teams)
- **Beer tower** showing context usage (fills up as context is consumed)
- **MCP tool calls** visualized as food orders from the kitchen
- **Speech bubbles** for NPC interactions
- **Subagent visualization** as helper characters

## Prerequisites

- [Bun](https://bun.sh/) runtime
- [Node.js](https://nodejs.org/) v18+
- Claude Code CLI installed

## Quick Start

```bash
# 1. Clone and install dependencies
git clone <repo-url> ccviz
cd ccviz
bun install

# 2. Link package globally (one time)
npm link

# 3. Install hooks to your project
cd /path/to/your/project
npx ccviz install --project   # For this project only
# OR
npx ccviz install --global    # For ALL Claude Code projects

# 4. Start visualization server
cd /path/to/ccviz
bun run dev

# 5. Open browser
open http://localhost:5173

# 6. Use Claude Code normally - watch the magic!
```

## Installation Options

### Install to Current Project
```bash
npx ccviz install --project
```
Installs hooks to `./.claude/` directory of current project.

### Install Globally
```bash
npx ccviz install --global
```
Installs hooks to `~/.claude/` directory, applies to ALL Claude Code projects.

### Uninstall
```bash
npx ccviz uninstall --project  # Remove from current project
npx ccviz uninstall --global   # Remove from global config
```

## How It Works

1. **Hooks** are installed into Claude Code's `.claude/settings.json`
2. When you use Claude Code, hooks send events to ccviz server (port 3847)
3. The Phaser.js frontend visualizes these events in real-time
4. Each session becomes a customer at a table with their team colors

## Visualization Elements

| Element | Represents |
|---------|------------|
| Customer (football fan) | Claude Code session |
| Beer tower | Context usage (empties as context fills) |
| Bartender "claude-code" | Main CC instance |
| Waiter "claude-kit" | Delivery of responses |
| Chef | MCP tool call handler |
| Food items | MCP tool calls / Skills |
| Team colors & logos | Session identification |

## Architecture

```
+-------------------+     HTTP Events     +-------------------+
|   Claude Code     | ------------------> |  ccviz Server     |
|   (with hooks)    |     Port 3847       |   (Bun + WS)      |
+-------------------+                     +---------+---------+
                                                    |
                                             WebSocket
                                                    |
                                          +---------v---------+
                                          |  Browser Client   |
                                          |  (Phaser.js)      |
                                          +-------------------+
```

## Development

```bash
# Run in development mode
bun run dev

# Build for production
bun run build

# Type check
bun run typecheck
```

## Project Structure

```
ccviz/
├── src/
│   ├── client/           # Phaser.js frontend
│   │   ├── scenes/       # Game scenes (BarScene, PreloadScene)
│   │   ├── sprites/      # Game objects (Customer, Bartender, etc.)
│   │   └── state/        # State management
│   ├── server/           # Bun HTTP + WebSocket server
│   └── shared/           # Shared types and constants
├── scripts/              # CLI tools (install, uninstall)
├── .claude/hooks/        # CC hooks that send events
└── public/               # Static assets
```

## License

MIT

---

*Made with Phaser.js, Bun, and lots of virtual beer*
