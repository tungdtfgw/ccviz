#!/usr/bin/env node
/**
 * ccviz CLI
 * Main entry point for npx ccviz commands
 *
 * Usage:
 *   npx ccviz install [--project|--global]
 *   npx ccviz uninstall [--project|--global]
 *   npx ccviz start
 */

const { spawn } = require('child_process');
const path = require('path');

const command = process.argv[2];
const args = process.argv.slice(3);

function showHelp() {
  console.log(`
🍺 ccviz - Claude Code Visualization

Usage:
  npx ccviz <command> [options]

Commands:
  install     Install visualization hooks for Claude Code
  uninstall   Remove visualization hooks
  start       Start the visualization server

Options for install/uninstall:
  --project, -p   Target current project's .claude/ directory
  --global, -g    Target global ~/.claude/ directory
  (no flag)       Interactive mode - prompts for choice

Examples:
  npx ccviz install --project   # Install to current project
  npx ccviz install --global    # Install globally for all CC projects
  npx ccviz uninstall           # Interactive uninstall
  npx ccviz start               # Start visualization server

After installation:
  1. Run 'bun run dev' or 'npx ccviz start' to start the server
  2. Open http://localhost:5173 in your browser
  3. Use Claude Code - activities will be visualized in real-time!
`);
}

function runScript(scriptName) {
  const scriptPath = path.join(__dirname, scriptName);
  const child = spawn('node', [scriptPath, ...args], {
    stdio: 'inherit',
    cwd: process.cwd()
  });

  child.on('close', (code) => {
    process.exit(code);
  });
}

function startServer() {
  const packageRoot = path.resolve(__dirname, '..');
  console.log('\n🍺 Starting ccviz visualization server...\n');
  
  const child = spawn('bun', ['run', 'dev'], {
    stdio: 'inherit',
    cwd: packageRoot
  });

  child.on('close', (code) => {
    process.exit(code);
  });
}

switch (command) {
  case 'install':
    runScript('install.cjs');
    break;
  case 'uninstall':
    runScript('uninstall.cjs');
    break;
  case 'start':
    startServer();
    break;
  case 'help':
  case '--help':
  case '-h':
  case undefined:
    showHelp();
    break;
  default:
    console.error(`Unknown command: ${command}`);
    showHelp();
    process.exit(1);
}
