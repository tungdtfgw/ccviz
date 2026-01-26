# Exploration Report: Claude Code Integration Structure

**Project:** robotruncc  
**Date:** 2026-01-27  
**Focus:** Understanding CC integration for npm package creation (install/uninstall)

---

## 1. Project Structure Overview

### Directory Tree (key components)
```
robotruncc/
├── .claude/                    # CC project-level configuration (338MB)
│   ├── .ck.json               # ClaudeKit config (naming, plan validation, hooks)
│   ├── settings.json          # CC settings with hook definitions
│   ├── .env & .env.example    # Environment variables (6 different types)
│   ├── .ckignore              # Ignore rules for context management
│   ├── .mcp.json.example      # MCP server configuration template
│   ├── agents/                # 14 agent definitions (md files)
│   ├── commands/              # 21 CLI commands (md files)
│   ├── rules/                 # 4 workflow rules (development, orchestration, etc)
│   ├── scripts/               # 19 utility scripts (Python, Node.js, Bash)
│   ├── skills/                # 59+ skill directories with install scripts
│   │   ├── install.sh         # Linux/macOS universal install (1,339 lines)
│   │   ├── install.ps1        # Windows PowerShell install (1,295 lines)
│   │   ├── INSTALLATION.md    # Installation guide
│   │   ├── README.md          # Skills overview
│   │   ├── .env.example
│   │   └── [59 skill folders]
│   ├── hooks/                 # 20+ hook scripts (Node.js/Bash)
│   │   ├── session-init.cjs
│   │   ├── subagent-init.cjs
│   │   ├── post-edit-simplify-reminder.cjs
│   │   ├── scout-block.cjs
│   │   ├── privacy-block.cjs
│   │   └── [robotruncc-specific hooks for visualization]
│   ├── output-styles/         # Output formatting
│   └── schemas/               # Configuration schemas
├── hooks/                     # Project-level hooks (root)
│   └── status-line-wrapper.cjs # Custom status line for robotruncc
├── package.json              # Project dependencies
├── vite.config.ts            # Vite build config
├── tsconfig.json
└── .git/
```

### Global CC Config Location
```
~/.claude/
├── workflows/                # Global workflow definitions
├── hooks/                    # Global hooks
├── skills/                   # Global skills library
├── scripts/                  # Global utility scripts
└── CLAUDE.md                 # Global instructions (root metadata)
```

---

## 2. CC Configuration System

### A. Project-Level Config (.claude/.ck.json)
**Purpose:** Project-specific ClaudeKit settings

**Key sections:**
- `codingLevel`: -1 (auto-detect)
- `privacyBlock`: true (sensitive file protection)
- `plan.namingFormat`: `{date}-{issue}-{slug}`
- `plan.dateFormat`: `YYMMDD-HHmm`
- `paths.docs`: "docs"
- `paths.plans`: "plans"
- `kits.ClaudeKit Engineer`: Defines installed hooks for this project

**Installed Hooks** (from .ck.json):
```javascript
"hooks": [
  "node $HOME/.claude/hooks/session-init.cjs",
  "node $HOME/.claude/hooks/subagent-init.cjs",
  "node $HOME/.claude/hooks/dev-rules-reminder.cjs",
  "node $HOME/.claude/hooks/usage-context-awareness.cjs",
  "node $HOME/.claude/hooks/scout-block.cjs",
  "node $HOME/.claude/hooks/privacy-block.cjs",
  "node $HOME/.claude/hooks/post-edit-simplify-reminder.cjs"
]
```

### B. Settings Override (.claude/settings.json)
**Purpose:** Full hook configuration with fine-grained event matching

**Structure:**
```json
{
  "statusLine": { "type": "command", "command": "node \"$CLAUDE_PROJECT_DIR\"/hooks/..." },
  "hooks": {
    "SessionStart": [{ "matcher": "startup|resume|clear|compact", "hooks": [...] }],
    "SessionEnd": [...],
    "Stop": [...],
    "SubagentStart": [...],
    "SubagentStop": [...],
    "UserPromptSubmit": [...],
    "PreToolUse": [...],  // Bash, Glob, Grep, Read, Edit, Write, MCP tools
    "PostToolUse": [...]
  }
}
```

**Project-specific hooks in settings.json:**
```bash
node "$CLAUDE_PROJECT_DIR"/.claude/hooks/session-init.cjs
node "$CLAUDE_PROJECT_DIR"/hooks/session-start.cjs
bash "$CLAUDE_PROJECT_DIR"/.claude/hooks/robotruncc-send-session-lifecycle-events-to-visualization-server.sh
bash "$CLAUDE_PROJECT_DIR"/.claude/hooks/hook-subagent-spawn-and-stop-events-to-visualization-http-server.sh
```

### C. Environment Variables (.claude/.env.example)
**Priority hierarchy** (highest to lowest):
1. `process.env` - Runtime environment
2. `.claude/skills/<skill>/.env` - Skill-specific overrides
3. `.claude/skills/.env` - Shared across all skills
4. `.claude/.env` - Global defaults (THIS FILE)

**Configuration types:**
- ClaudeKit API keys (for VidCap, ReviewWeb)
- Context7 API (doc search)
- Discord/Telegram webhook URLs
- Gemini/Vertex AI/OpenAI API keys
- Development settings (NODE_ENV, LOG_LEVEL)
- Project configuration

### D. Context Management (.ckignore)
**Purpose:** Prevents large directories from filling LLM context

**Blocked directories:**
- `node_modules`, `.next`, `.nuxt`, `__pycache__`, `.venv`, `dist`, `build`
- `.git`, `coverage`, `vendor`, `target`

**Allowed files:**
- `.env`, `.env.*` (for context despite privacy)

---

## 3. Hooks Architecture

### A. Hook Locations & Scope

**Global hooks** (~/.claude/hooks/):
- `session-init.cjs` - Project detection, config loading
- `subagent-init.cjs` - Subagent environment setup
- `dev-rules-reminder.cjs` - Development rules enforcement
- `usage-context-awareness.cjs` - Context usage tracking
- `scout-block.cjs` - Directory traversal restrictions
- `privacy-block.cjs` - Sensitive file protection
- `post-edit-simplify-reminder.cjs` - Code simplification reminder

**Project-level hooks** (robotruncc/.claude/hooks/):
- All of the above global hooks PLUS:
- `robotruncc-send-session-lifecycle-events-to-visualization-server.sh`
- `hook-subagent-spawn-and-stop-events-to-visualization-http-server.sh`
- `pre-tool-use-hook-send-mcp-tool-events-to-visualization-server.sh`
- `post-tool-use-hook-send-mcp-tool-end-events-to-visualization-server.sh`
- `status-hook-send-context-percentage-to-visualization-server.sh`

**Root-level hooks** (robotruncc/hooks/):
- `status-line-wrapper.cjs` - Custom status line communicating with visualization server
- `session-start.cjs` - Project-specific session startup
- `session-end.cjs` - Project-specific session cleanup
- `subagent-start.cjs`, `subagent-stop.cjs`
- `tool-pre.cjs`, `tool-post.cjs`

### B. Hook Event Types (from settings.json)
1. **SessionStart** - Fires on startup, resume, clear, compact
2. **SessionEnd** - Cleanup on session termination
3. **Stop** - Graceful stop signal
4. **SubagentStart/Stop** - Subagent lifecycle
5. **UserPromptSubmit** - After user input
6. **PreToolUse** - Before tool execution (Bash, Glob, Grep, Read, Edit, Write, MCP)
7. **PostToolUse** - After tool execution

### C. Key Hook Features

**Status Line Integration:**
- Sends context update to visualization server
- Shows: Model | Progress bar | Time remaining | Context used %
- Example: `🤖 Claude 4.5 ██░░░░░░░░ 25% | 📁 /robotruncc 🌱 main`

**Visualization Server Communication:**
```bash
# Hooks send HTTP POST to: http://localhost:3847/api/events
# Payload: { type: 'session:start|stop', sessionId, timestamp, payload }
```

**Privacy & Security:**
- Privacy block: Checks `.env`, `.env.local`, `.env.*.local` files
- Requires user approval to read sensitive files via AskUserQuestion
- Hook outputs privacy block JSON for user interaction

---

## 4. Skills System

### A. Install Script Architecture

**Shell Scripts (3 flavors):**
- `install.sh` - Linux/macOS universal (1,339 lines)
- `install.ps1` - Windows PowerShell (1,295 lines)
- Bash 3.2+ compatible (macOS compatibility)

**Installation Phases:**
1. System deps detection & installation (FFmpeg, ImageMagick, PostgreSQL, Docker)
2. Node.js & npm packages (rmbg-cli, pnpm, wrangler, repomix)
3. Python virtual environment setup
4. Python dependencies installation (skill-specific requirements.txt)
5. Test dependencies installation
6. Verification of all installations

**Features:**
- Distro detection (Alpine, Arch, Debian, RHEL, macOS)
- Package manager abstraction (apk, pacman, apt-get, dnf/yum, brew)
- Resume support (`--resume` flag)
- State persistence (.install-state.json)
- Non-interactive mode (NON_INTERACTIVE env var)
- Granular error tracking (critical vs optional)
- Cross-platform error summary (.install-error-summary.json)

**Command-line options:**
```bash
./install.sh -y --with-sudo --resume --retry-failed
./install.ps1 -Y -WithAdmin -Resume -PreferPackageManager winget
```

### B. Skill Structure
```
skill-name/
├── SKILL.md              # Skill definition & instructions
├── scripts/
│   ├── requirements.txt  # Python dependencies
│   ├── tests/
│   │   └── requirements.txt
│   └── [utility scripts]
├── resources/            # Documentation, examples
└── node_modules/         # For skills with npm deps
```

**59+ skills include:**
- Development tools (chrome-devtools, mcp-server, mcp-management)
- AI/ML (ai-multimodal, ai-artist, code-review)
- Data processing (databases, web-testing, repomix)
- Creative tools (remotion, threejs)
- Communication (slack-gif-creator, payment-integration)

---

## 5. Package.json & Build System

### A. Project Dependencies
```json
{
  "name": "robotruncc",
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "concurrently \"bun run dev:server\" \"bun run dev:client\"",
    "dev:server": "bun --watch src/server/index.ts",
    "dev:client": "vite",
    "build": "vite build",
    "build:server": "bun build src/server/index.ts --outdir dist/server --target bun",
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

### B. Build Tools
- **Bundler:** Vite 5.2.0 (frontend)
- **Runtime:** Bun (backend server)
- **Language:** TypeScript 5.4.2
- **Concurrency:** concurrently for dev server/client
- **3D Graphics:** Phaser 3.80.1

---

## 6. Custom robotruncc Integration

### A. Visualization Server Integration
**Server:** Runs on `http://localhost:3847`

**Hooks communicate:**
- Session lifecycle events (start, stop, resume)
- Subagent spawn/stop events
- MCP tool execution events
- Context percentage updates
- Status line updates

**Event payload structure:**
```json
{
  "type": "session:start | subagent:start | context:update | tool:start",
  "timestamp": 1234567890,
  "sessionId": "session-main",
  "payload": { ... }
}
```

### B. Project-Specific Files
```
robotruncc/
├── .claude/hooks/robotruncc-send-session-lifecycle-events-to-visualization-server.sh
├── .claude/hooks/hook-subagent-spawn-and-stop-events-to-visualization-http-server.sh
├── .claude/hooks/pre-tool-use-hook-send-mcp-tool-events-to-visualization-server.sh
├── .claude/hooks/post-tool-use-hook-send-mcp-tool-end-events-to-visualization-server.sh
├── .claude/hooks/status-hook-send-context-percentage-to-visualization-server.sh
├── hooks/status-line-wrapper.cjs     # Sends context updates
├── hooks/session-start.cjs
├── hooks/session-end.cjs
└── src/                              # Sports bar visualization source
```

---

## 7. Files to Package (for npm install/uninstall)

### Core Configuration
```
.claude/.ck.json                 # Project config
.claude/settings.json            # Hook definitions
.claude/.env.example             # Environment template
.claude/.ckignore               # Context management rules
CLAUDE.md                        # Project instructions
.claude/CLAUDE.md               # (if exists)
```

### Hooks to Bundle
```
.claude/hooks/                   # All project-specific hooks
  ├── robotruncc-*.sh
  ├── hook-subagent-*.sh
  ├── pre-tool-use-hook-*.sh
  ├── post-tool-use-hook-*.sh
  ├── status-hook-*.sh
  └── lib/                       # Shared hook utilities

hooks/                           # Root-level project hooks
  ├── status-line-wrapper.cjs
  ├── session-start.cjs
  ├── session-end.cjs
  ├── subagent-start.cjs
  ├── subagent-stop.cjs
  ├── tool-pre.cjs
  └── tool-post.cjs
```

### Rules & Documentation
```
.claude/rules/                   # 4 markdown workflow files
.claude/agents/                  # 14 agent definitions
.claude/commands/                # 21 command definitions
.claude/scripts/                 # 19 utility scripts
```

### Size Reference
- `.claude/` directory: 338MB (mostly node_modules in skills/.venv)
- Excluding node_modules/venv for package: ~50-100MB
- Actual source code: ~5-10MB

---

## 8. How Global vs Project Config Works

### Resolution Order
1. **User runs `claude` CLI** in robotruncc directory
2. **CC detects git root** → finds `.claude/.ck.json`
3. **Loads `.claude/settings.json`** for hook configuration
4. **Hooks use `$CLAUDE_PROJECT_DIR`** to reference project files
5. **Environment variables** resolved from:
   - Process env → ~/.claude/CLAUDE.md → .claude/.env
6. **Skills loaded** from `.claude/skills/` (project) + `~/.claude/skills/` (global)
7. **Agents/Commands** resolved from `.claude/agents/`, `.claude/commands/`

### Variable Resolution
```bash
# Inside hooks/scripts:
$CLAUDE_PROJECT_DIR          # Project root (where .claude/ is)
$CLAUDE_CONFIG_DIR           # ~/.claude/
$CLAUDE_SCRIPTS_DIR          # ~/.claude/scripts/
$HOME/.claude/hooks/...      # Global hooks
```

---

## 9. Installation/Uninstallation Flow

### Current Install Process
1. Run `.claude/skills/install.sh` or `install.ps1`
2. Installs system tools, Node.js, Python venv
3. Installs all skill dependencies
4. Creates `.install-state.json` for resume capability

### Uninstall Challenges Identified
- **No standard uninstall script** (not provided in codebase)
- **System packages** installed to OS directories (can't easily uninstall)
- **Global npm packages** installed system-wide
- **Python venv** can be removed but dependencies may have side effects
- **Hooks** defined in config files - need to be deregistered
- **Skills** downloaded to disk - can be removed but npm registry may have cached packages

### Required for NPM Package
1. **Install hook registration** - Update `.ck.json` + `.claude/settings.json`
2. **Environment setup** - Copy/template `.env` files
3. **Configuration merge** - Combine project config with global config
4. **Uninstall hooks** - Clean registry entries + remove installed artifacts

---

## 10. Key Unresolved Questions

1. **Registry storage location**: Where does CC persist hook registration? (likely `~/.claude/.ck.json` or per-project `.claude/.ck.json`)
2. **Skill caching**: Does CC cache skills in `.claude/skills/.venv/`? How to handle during uninstall?
3. **Global npm packages**: Should we install globally or locally to project?
4. **Backward compatibility**: What if project already has different `.ck.json` version?
5. **Hook conflict resolution**: How to prevent hook name collisions when installing multiple projects?
6. **State management**: Where to store npm package metadata for uninstall reference?

---

## 11. Summary Table

| Component | Location | Size | Type | Install Needed |
|-----------|----------|------|------|-----------------|
| Config | `.claude/.ck.json` | ~2KB | YAML | Yes |
| Settings | `.claude/settings.json` | ~7KB | JSON | Yes |
| Rules | `.claude/rules/*.md` | ~10KB | Markdown | Yes |
| Hooks | `.claude/hooks/` + `./hooks/` | ~50KB | Node.js/Bash | Yes |
| Skills | `.claude/skills/` | 338MB* | Multi-format | No (user installs via install.sh) |
| Scripts | `.claude/scripts/` | ~50KB | Python/Node.js | Partial |
| Agents | `.claude/agents/*.md` | ~50KB | Markdown | Yes |
| Commands | `.claude/commands/*.md` | ~30KB | Markdown | Yes |

*includes node_modules; actual source ~5-10MB

---

## 12. Recommended Package Strategy

### Minimal Package (recommended)
- Copy `.claude/.ck.json`, `.claude/settings.json`, `CLAUDE.md`
- Copy all `.claude/hooks/*.sh`, `.claude/hooks/lib/`, `./hooks/*.cjs`
- Copy `.claude/rules/`, `.claude/agents/`, `.claude/commands/`
- Do NOT include `.claude/skills/` (too large, user can run install.sh)
- Do NOT include `.claude/scripts/` (user accesses via CC CLI)
- Do NOT include `.env` files (user configures locally)

### Install Script (postinstall hook)
- Register hooks in `~/.claude/.ck.json` or project `.claude/.ck.json`
- Prompt user to run `.claude/skills/install.sh` for dependencies
- Copy `.env.example` → `.env` with guidance

### Uninstall Script (preuninstall hook)
- Deregister hooks from `.ck.json`
- Remove project-specific hook registry entries
- Optionally remove `.claude/` directory if user confirms

---

Generated by Explore agent  
Report date: 2026-01-27 01:11
