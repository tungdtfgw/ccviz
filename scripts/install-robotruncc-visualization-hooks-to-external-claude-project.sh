#!/bin/bash
# Install robotruncc visualization hooks to another Claude Code project
# Usage: ./scripts/install-robotruncc-visualization-hooks-to-external-claude-project.sh /path/to/target/project

set -e

TARGET="${1:?Usage: $0 /path/to/target/project}"
SOURCE="$(cd "$(dirname "$0")/.." && pwd)"

echo "Installing robotruncc hooks from $SOURCE to $TARGET"

# Create directories
mkdir -p "$TARGET/hooks"
mkdir -p "$TARGET/.claude/hooks"

# Copy hooks
cp "$SOURCE/hooks/status-line-wrapper.cjs" "$TARGET/hooks/"
cp "$SOURCE/.claude/hooks/robotruncc-send-session-lifecycle-events-to-visualization-server.sh" "$TARGET/.claude/hooks/"
cp "$SOURCE/.claude/hooks/hook-subagent-spawn-and-stop-events-to-visualization-http-server.sh" "$TARGET/.claude/hooks/"
cp "$SOURCE/.claude/hooks/pre-tool-use-hook-send-mcp-tool-events-to-visualization-server.sh" "$TARGET/.claude/hooks/"
cp "$SOURCE/.claude/hooks/post-tool-use-hook-send-mcp-tool-end-events-to-visualization-server.sh" "$TARGET/.claude/hooks/" 2>/dev/null || true

# Make scripts executable
chmod +x "$TARGET/.claude/hooks/"*.sh

# Create/update settings.json
SETTINGS_FILE="$TARGET/.claude/settings.json"
if [ -f "$SETTINGS_FILE" ]; then
    echo "WARNING: $SETTINGS_FILE exists. Please manually merge the following config:"
else
    mkdir -p "$TARGET/.claude"
    cat > "$SETTINGS_FILE" << 'EOF'
{
  "statusLine": {
    "type": "command",
    "command": "node \"$CLAUDE_PROJECT_DIR\"/hooks/status-line-wrapper.cjs"
  },
  "hooks": {
    "SessionStart": [{
      "matcher": "startup|resume",
      "hooks": [{
        "type": "command",
        "command": "bash \"$CLAUDE_PROJECT_DIR\"/.claude/hooks/robotruncc-send-session-lifecycle-events-to-visualization-server.sh"
      }]
    }],
    "SessionEnd": [{
      "matcher": "*",
      "hooks": [{
        "type": "command",
        "command": "bash \"$CLAUDE_PROJECT_DIR\"/.claude/hooks/robotruncc-send-session-lifecycle-events-to-visualization-server.sh"
      }]
    }],
    "SubagentStart": [{
      "matcher": "*",
      "hooks": [{
        "type": "command",
        "command": "bash \"$CLAUDE_PROJECT_DIR\"/.claude/hooks/hook-subagent-spawn-and-stop-events-to-visualization-http-server.sh"
      }]
    }],
    "SubagentStop": [{
      "matcher": "*",
      "hooks": [{
        "type": "command",
        "command": "bash \"$CLAUDE_PROJECT_DIR\"/.claude/hooks/hook-subagent-spawn-and-stop-events-to-visualization-http-server.sh"
      }]
    }],
    "PreToolUse": [{
      "matcher": "mcp__.*",
      "hooks": [{
        "type": "command",
        "command": "bash \"$CLAUDE_PROJECT_DIR\"/.claude/hooks/pre-tool-use-hook-send-mcp-tool-events-to-visualization-server.sh"
      }]
    }],
    "PostToolUse": [{
      "matcher": "mcp__.*",
      "hooks": [{
        "type": "command",
        "command": "bash \"$CLAUDE_PROJECT_DIR\"/.claude/hooks/post-tool-use-hook-send-mcp-tool-end-events-to-visualization-server.sh"
      }]
    }]
  }
}
EOF
    echo "Created $SETTINGS_FILE"
fi

echo ""
echo "Done! Files installed:"
echo "  - $TARGET/hooks/status-line-wrapper.cjs"
echo "  - $TARGET/.claude/hooks/robotruncc-send-session-lifecycle-events-to-visualization-server.sh"
echo "  - $TARGET/.claude/hooks/hook-subagent-spawn-and-stop-events-to-visualization-http-server.sh"
echo "  - $TARGET/.claude/hooks/pre-tool-use-hook-send-mcp-tool-events-to-visualization-server.sh"
echo "  - $TARGET/.claude/hooks/post-tool-use-hook-send-mcp-tool-end-events-to-visualization-server.sh"
echo ""
echo "Make sure robotruncc server is running:"
echo "  cd $SOURCE && bun run dev:server"
