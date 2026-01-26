#!/usr/bin/env node
/**
 * ccviz Installation Script
 * Installs visualization hooks for Claude Code (CC)
 *
 * Usage:
 *   npx ccviz install          # Interactive mode
 *   npx ccviz install --project # Install to current project
 *   npx ccviz install --global  # Install to CC global config
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Hooks that ccviz needs
const CCVIZ_HOOKS = [
  'ccviz-send-session-lifecycle-events-to-visualization-server.sh',
  'hook-subagent-spawn-and-stop-events-to-visualization-http-server.sh',
  'pre-tool-use-hook-send-mcp-tool-events-to-visualization-server.sh',
  'post-tool-use-hook-send-mcp-tool-end-events-to-visualization-server.sh',
  'status-hook-send-context-percentage-to-visualization-server.sh'
];

// Hook configurations to add to settings.json
const CCVIZ_HOOK_CONFIGS = {
  SessionStart: [{
    matcher: 'startup|resume|clear|compact',
    hooks: [{
      type: 'command',
      command: 'bash "$ROBOTRUNCC_DIR"/ccviz-send-session-lifecycle-events-to-visualization-server.sh',
      _origin: 'ccviz'
    }]
  }],
  SessionEnd: [{
    // SessionEnd fires when session actually closes, NOT Stop (which fires after every response)
    hooks: [{
      type: 'command',
      command: 'bash "$ROBOTRUNCC_DIR"/ccviz-send-session-lifecycle-events-to-visualization-server.sh',
      _origin: 'ccviz'
    }]
  }],
  SubagentStart: [{
    matcher: '*',
    hooks: [{
      type: 'command',
      command: 'bash "$ROBOTRUNCC_DIR"/hook-subagent-spawn-and-stop-events-to-visualization-http-server.sh',
      _origin: 'ccviz'
    }]
  }],
  SubagentStop: [{
    matcher: '*',
    hooks: [{
      type: 'command',
      command: 'bash "$ROBOTRUNCC_DIR"/hook-subagent-spawn-and-stop-events-to-visualization-http-server.sh',
      _origin: 'ccviz'
    }]
  }],
  PreToolUse: [{
    matcher: 'mcp__.*',
    hooks: [{
      type: 'command',
      command: 'bash "$ROBOTRUNCC_DIR"/pre-tool-use-hook-send-mcp-tool-events-to-visualization-server.sh',
      _origin: 'ccviz'
    }]
  }],
  PostToolUse: [{
    matcher: 'mcp__.*',
    hooks: [{
      type: 'command',
      command: 'bash "$ROBOTRUNCC_DIR"/post-tool-use-hook-send-mcp-tool-end-events-to-visualization-server.sh',
      _origin: 'ccviz'
    }]
  }]
};

const MANIFEST_FILE = '.ccviz-manifest.json';

class Installer {
  constructor() {
    this.packageRoot = path.resolve(__dirname, '..');
    this.targetDir = null;
    this.isGlobal = false;
  }

  async run() {
    console.log('\n🍺 ccviz - Claude Code Visualization Installer\n');

    const args = process.argv.slice(2);
    if (args.includes('--global') || args.includes('-g')) {
      this.isGlobal = true;
      this.targetDir = path.join(process.env.HOME || process.env.USERPROFILE, '.claude');
    } else if (args.includes('--project') || args.includes('-p')) {
      this.isGlobal = false;
      this.targetDir = path.join(process.cwd(), '.claude');
    } else {
      await this.promptInstallLocation();
    }

    console.log(`📁 Target: ${this.targetDir}`);
    console.log(`📦 Mode: ${this.isGlobal ? 'Global (all CC projects)' : 'Project (current directory)'}\n`);

    this.ensureDirectories();
    this.copyHooks();
    this.mergeSettings();
    this.createManifest();
    this.printEnvHint();

    console.log('\n✅ Installation complete!\n');
  }

  async promptInstallLocation() {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    return new Promise((resolve) => {
      console.log('Where do you want to install ccviz hooks?\n');
      console.log('  1. Current project (./.claude/)');
      console.log('  2. Global (~/.claude/)\n');
      rl.question('Choose [1/2]: ', (answer) => {
        rl.close();
        if (answer === '2') {
          this.isGlobal = true;
          this.targetDir = path.join(process.env.HOME || process.env.USERPROFILE, '.claude');
        } else {
          this.isGlobal = false;
          this.targetDir = path.join(process.cwd(), '.claude');
        }
        resolve();
      });
    });
  }

  ensureDirectories() {
    const hooksDir = path.join(this.targetDir, 'hooks', 'ccviz');
    if (!fs.existsSync(hooksDir)) {
      fs.mkdirSync(hooksDir, { recursive: true });
      console.log(`📂 Created ${hooksDir}`);
    }
  }

  copyHooks() {
    const sourceDir = path.join(this.packageRoot, 'scripts', 'hooks');
    const targetHooksDir = path.join(this.targetDir, 'hooks', 'ccviz');

    console.log('📋 Copying hooks...');
    for (const hookFile of CCVIZ_HOOKS) {
      const sourcePath = path.join(sourceDir, hookFile);
      const targetPath = path.join(targetHooksDir, hookFile);

      if (fs.existsSync(sourcePath)) {
        fs.copyFileSync(sourcePath, targetPath);
        try { fs.chmodSync(targetPath, 0o755); } catch (e) {}
        console.log(`   ✓ ${hookFile}`);
      } else {
        console.log(`   ⚠ ${hookFile} not found, skipping`);
      }
    }
  }

  mergeSettings() {
    const settingsPath = path.join(this.targetDir, 'settings.json');
    let settings = {};

    if (fs.existsSync(settingsPath)) {
      try {
        settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
        console.log('\n📝 Merging with existing settings.json...');
      } catch (e) {
        console.log('\n⚠ Could not parse existing settings.json, creating new');
      }
    } else {
      console.log('\n📝 Creating new settings.json...');
    }

    if (!settings.hooks) settings.hooks = {};

    const hookBasePath = this.isGlobal
      ? '"$HOME"/.claude/hooks/ccviz'
      : '"$CLAUDE_PROJECT_DIR"/.claude/hooks/ccviz';

    for (const [eventType, hookConfigs] of Object.entries(CCVIZ_HOOK_CONFIGS)) {
      if (!settings.hooks[eventType]) settings.hooks[eventType] = [];

      for (const config of hookConfigs) {
        const configCopy = JSON.parse(JSON.stringify(config));
        for (const hook of configCopy.hooks) {
          if (hook.command) {
            hook.command = hook.command.replace('"$ROBOTRUNCC_DIR"', hookBasePath);
          }
        }

        const existingIndex = settings.hooks[eventType].findIndex(
          h => h.hooks?.some(hk => hk._origin === 'ccviz')
        );

        if (existingIndex >= 0) {
          settings.hooks[eventType][existingIndex] = configCopy;
        } else {
          settings.hooks[eventType].push(configCopy);
        }
      }
      console.log(`   ✓ ${eventType}`);
    }

    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
    console.log(`\n💾 Saved ${settingsPath}`);
  }

  createManifest() {
    const manifestPath = path.join(this.targetDir, MANIFEST_FILE);
    const manifest = {
      version: require(path.join(this.packageRoot, 'package.json')).version,
      installedAt: new Date().toISOString(),
      isGlobal: this.isGlobal,
      packageRoot: this.packageRoot,
      hooks: CCVIZ_HOOKS,
      hookEvents: Object.keys(CCVIZ_HOOK_CONFIGS)
    };
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
    console.log(`📋 Created manifest: ${manifestPath}`);
  }

  printEnvHint() {
    console.log('\n📌 Setup Instructions:');
    console.log('─────────────────────────────────────────────────');
    console.log('1. Start ccviz visualization server:');
    console.log(`   cd ${this.packageRoot}`);
    console.log('   bun run dev\n');
    console.log('2. Open browser: http://localhost:5173\n');
    console.log('3. Use Claude Code normally - activities will be visualized!');
    console.log('─────────────────────────────────────────────────');
  }
}

const installer = new Installer();
installer.run().catch(console.error);
