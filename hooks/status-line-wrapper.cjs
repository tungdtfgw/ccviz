#!/usr/bin/env node
// Status line script for Claude Code
// Displays: 🤖 Model progress% ⏳ time left (used%) | 📁 dir 🌱 branch (commits↑)
// Also sends context:update to visualization server

const { execSync, spawn } = require('child_process');

// Send context update to visualization server (async, non-blocking)
function sendContextUpdate(sessionId, usedPct, tokens) {
    if (usedPct <= 0) return;
    const serverUrl = process.env.ROBOTRUNCC_SERVER || 'http://localhost:3847';
    const payload = JSON.stringify({
        type: 'context:update',
        timestamp: Date.now(),
        payload: { sessionId, percent: Math.round(usedPct), tokens: tokens || 0 }
    });
    // Fire and forget - don't block statusline
    const curl = spawn('curl', ['-s', '-X', 'POST', `${serverUrl}/api/events`,
        '-H', 'Content-Type: application/json', '-d', payload], { detached: true, stdio: 'ignore' });
    curl.unref();
}

let input = '';
process.stdin.on('data', chunk => input += chunk);
process.stdin.on('end', () => {
    try {
        const data = JSON.parse(input);

        // Model info
        const model = data.model?.display_name || 'Claude';
        const modelId = data.model?.id || '';
        const modelVersion = modelId.includes('opus-4-5') ? '4.5' :
                            modelId.includes('opus-4') ? '4' :
                            modelId.includes('sonnet') ? 'Sonnet' : '';
        const modelDisplay = modelVersion ? `${model} ${modelVersion}` : model;

        // Context window info
        const usedPct = data.context_window?.used_percentage || 0;
        const remainingPct = 100 - usedPct;
        const totalTokens = data.context_window?.total_input_tokens || 0;
        const sessionId = data.session_id || 'session-main';

        // Send context update to visualization server
        sendContextUpdate(sessionId, usedPct, totalTokens);

        // Progress bar (10 chars: filled ██░░░░░░░░)
        const filled = Math.round(usedPct / 10);
        const empty = 10 - filled;
        const bar = '█'.repeat(filled) + '░'.repeat(empty);

        // Time estimation (~5h for 100% context at normal pace)
        const totalMinutes = Math.round(remainingPct * 3);
        const hours = Math.floor(totalMinutes / 60);
        const mins = totalMinutes % 60;
        const timeLeft = hours > 0 ? `${hours}h ${mins}m left` : `${mins}m left`;

        // Directory (with ~ for home)
        const cwd = data.workspace?.current_dir || process.cwd();
        const homeDir = process.env.HOME || '';
        const dir = cwd.startsWith(homeDir)
            ? '~' + cwd.slice(homeDir.length)
            : cwd;

        // Git info
        let gitInfo = '';
        try {
            const branch = execSync('git branch --show-current 2>/dev/null', {
                cwd, encoding: 'utf8', timeout: 1000
            }).trim();
            if (branch) {
                let ahead = '';
                try {
                    const count = execSync(`git rev-list --count origin/${branch}..HEAD 2>/dev/null`, {
                        cwd, encoding: 'utf8', timeout: 1000
                    }).trim();
                    if (count && parseInt(count) > 0) ahead = `(${count}↑)`;
                } catch {}
                gitInfo = `🌱 ${branch} ${ahead}`.trim();
            }
        } catch {}

        // Build status line (2 rows)
        const row1 = `🤖 ${modelDisplay}    ${bar} ${usedPct.toFixed(0)}%  ⏳  ${timeLeft} (${usedPct.toFixed(0)}% used)`;
        let row2 = `📁 ${dir}`;
        if (gitInfo) row2 += `    ${gitInfo}`;

        console.log(row1);
        console.log(row2);
    } catch {
        console.log('🤖 Claude');
    }
});
