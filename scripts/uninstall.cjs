#!/usr/bin/env node
/**
 * ccviz Uninstall Script
 * Removes visualization hooks from Claude Code (CC)
 *
 * Usage:
 *   npx ccviz uninstall          # Interactive mode
 *   npx ccviz uninstall --project # Uninstall from current project
 *   npx ccviz uninstall --global  # Uninstall from CC global config
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const MANIFEST_FILE = '.ccviz-manifest.json';

class Uninstaller {
  constructor() {
    this.targetDir = null;
    this.isGlobal = false;
    this.manifest = null;
  }

  async run() {
    console.log('\n🍺 ccviz - Claude Code Visualization Uninstaller\n');

    const args = process.argv.slice(2);
    if (args.includes('--global') || args.includes('-g')) {
      this.isGlobal = true;
      this.targetDir = path.join(process.env.HOME || process.env.USERPROFILE, '.claude');
    } else if (args.includes('--project') || args.includes('-p')) {
      this.isGlobal = false;
      this.targetDir = path.join(process.cwd(), '.claude');
    } else {
      await this.promptUninstallLocation();
    }

    console.log(`📁 Target: ${this.targetDir}`);
    console.log(`📦 Mode: ${this.isGlobal ? 'Global' : 'Project'}\n`);

    // Check manifest exists
    const manifestPath = path.join(this.targetDir, MANIFEST_FILE);
    if (!fs.existsSync(manifestPath)) {
      console.log('❌ No ccviz installation found (missing manifest)');
      console.log(`   Looking for: ${manifestPath}\n`);
      process.exit(1);
    }

    this.manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    console.log(`📋 Found installation from ${this.manifest.installedAt}`);
    console.log(`   Version: ${this.manifest.version}\n`);

    // Remove hooks from settings.json
    this.removeHooksFromSettings();

    // Remove hook files
    this.removeHookFiles();

    // Remove manifest
    fs.unlinkSync(manifestPath);
    console.log(`🗑️  Removed manifest`);

    console.log('\n✅ Uninstall complete!\n');
  }

  async promptUninstallLocation() {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    return new Promise((resolve) => {
      console.log('Where do you want to uninstall ccviz hooks from?\n');
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

  removeHooksFromSettings() {
    const settingsPath = path.join(this.targetDir, 'settings.json');
    if (!fs.existsSync(settingsPath)) {
      console.log('⚠ No settings.json found, skipping');
      return;
    }

    let settings;
    try {
      settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
    } catch (e) {
      console.log('⚠ Could not parse settings.json, skipping');
      return;
    }

    if (!settings.hooks) {
      console.log('⚠ No hooks in settings.json, skipping');
      return;
    }

    console.log('🔧 Removing hooks from settings.json...');

    let removedCount = 0;
    for (const eventType of this.manifest.hookEvents || []) {
      if (!settings.hooks[eventType]) continue;

      const originalLength = settings.hooks[eventType].length;
      
      // Filter out hooks with _origin: 'ccviz'
      settings.hooks[eventType] = settings.hooks[eventType].filter(hookConfig => {
        const hasRobotrunccOrigin = hookConfig.hooks?.some(h => h._origin === 'ccviz');
        return !hasRobotrunccOrigin;
      });

      const removed = originalLength - settings.hooks[eventType].length;
      if (removed > 0) {
        console.log(`   ✓ ${eventType} (removed ${removed} hook${removed > 1 ? 's' : ''})`);
        removedCount += removed;
      }

      // Clean up empty arrays
      if (settings.hooks[eventType].length === 0) {
        delete settings.hooks[eventType];
      }
    }

    // Clean up empty hooks object
    if (Object.keys(settings.hooks).length === 0) {
      delete settings.hooks;
    }

    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
    console.log(`\n💾 Updated ${settingsPath} (removed ${removedCount} hook${removedCount !== 1 ? 's' : ''})`);
  }

  removeHookFiles() {
    const hooksDir = path.join(this.targetDir, 'hooks', 'ccviz');
    
    if (!fs.existsSync(hooksDir)) {
      console.log('⚠ Hooks directory not found, skipping');
      return;
    }

    console.log('\n🗑️  Removing hook files...');

    for (const hookFile of this.manifest.hooks || []) {
      const hookPath = path.join(hooksDir, hookFile);
      if (fs.existsSync(hookPath)) {
        fs.unlinkSync(hookPath);
        console.log(`   ✓ ${hookFile}`);
      }
    }

    // Try to remove the ccviz hooks directory if empty
    try {
      const remaining = fs.readdirSync(hooksDir);
      if (remaining.length === 0) {
        fs.rmdirSync(hooksDir);
        console.log(`   ✓ Removed empty directory: hooks/ccviz`);
      }
    } catch (e) {
      // Directory not empty or other error, ignore
    }
  }
}

const uninstaller = new Uninstaller();
uninstaller.run().catch(console.error);
