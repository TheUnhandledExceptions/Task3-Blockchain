import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const blessed = require('blessed');
import { spawn, execSync } from 'child_process';
import fs from 'fs';
import * as path from 'path';

const args = process.argv.slice(2);

const screen = blessed.screen({
    smartCSR: true,
    title: 'HH Goa 2026 Command Center'
});

const header = blessed.box({
    top: 0,
    left: 'center',
    width: '100%',
    height: 3,
    content: '{center} 🛡️ AUTONOMOUS FORENSIC PIPELINE | COMMAND CENTER {/center}',
    tags: true,
    style: {
        fg: 'green',
        bg: 'black',
        border: { fg: 'cyan' }
    },
    border: { type: 'line' }
});

const leftPanel = blessed.box({
    top: 3,
    left: 0,
    width: '30%',
    height: '80%',
    label: ' System Status ',
    content: '\n  Initializing...',
    style: {
        fg: 'green',
        bg: 'black',
        border: { fg: 'cyan' }
    },
    border: { type: 'line' }
});

const rightPanel = blessed.log({
    top: 3,
    left: '30%',
    width: '70%',
    height: '80%',
    label: ' Execution Logs & Exceptions ',
    scrollback: 100,
    scrollable: true,
    alwaysScroll: true,
    tags: true,
    style: {
        fg: 'green',
        bg: 'black',
        border: { fg: 'cyan' }
    },
    border: { type: 'line' }
});

screen.append(header);
screen.append(leftPanel);
screen.append(rightPanel);

const tempDir = path.join(process.cwd(), 'temp');
if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
}
const logStream = fs.createWriteStream(path.join(tempDir, `execution_${Date.now()}.log`), { flags: 'a' });

function addLog(msg: string) {
    let clean = msg.replace(/\x1b\[[0-9;]*m/g, '').trim();
    if (!clean) return;
    
    const highlighted = clean.replace(/(https?:\/\/[^\s]+|ipfs:\/\/[^\s]+)/g, '{cyan-fg}{underline}$1{/underline}{/cyan-fg}');
    
    rightPanel.log(highlighted);
    logStream.write(clean + '\n');
    screen.render();
}

function updateStatus(status: string) {
    leftPanel.setContent(`\n  Stage:\n  ${status}`);
    screen.render();
}

let countdownActive = false;
let countdownInterval: NodeJS.Timeout | null = null;
let pipelineFinished = false;

screen.key(['q', 'C-c'], () => {
    if (pipelineFinished && countdownActive) {
        if (countdownInterval) clearInterval(countdownInterval);
        
        const question = blessed.question({
            parent: screen,
            border: 'line',
            height: 'shrink',
            width: 'half',
            top: 'center',
            left: 'center',
            label: ' Exit Protocol ',
            tags: true,
            keys: true,
            vi: true,
            style: {
                fg: 'green',
                bg: 'black',
                border: { fg: 'cyan' }
            }
        });

        question.ask('Delete Python .venv before exiting? (y/n)', (err: any, result: any) => {
            if (result) {
                const venvPath = path.join(process.cwd(), '.venv');
                try {
                    if (fs.existsSync(venvPath)) {
                        addLog("Deleting .venv...");
                        fs.rmSync(venvPath, { recursive: true, force: true });
                        addLog(".venv deleted.");
                    }
                } catch (e: any) {
                    addLog("Error deleting .venv: " + e.message);
                }
            }
            logStream.end();
            process.exit(0);
        });
        
        screen.render();
    } else {
        process.exit(0);
    }
});

const venvPath = path.join(process.cwd(), '.venv');
if (!fs.existsSync(venvPath)) {
    addLog("Creating .venv...");
    updateStatus("Installing Python Env");
    execSync('python3 -m venv .venv');
    addLog("Installing requirements...");
    execSync('.venv/bin/pip install -r requirements.txt');
    addLog("Dependencies installed.");
} else {
    addLog(".venv detected. Utilizing existing environment.");
}

if (args.length === 0) {
    addLog("No arguments provided. Waiting...");
    updateStatus("Idle");
} else {
    addLog(`Executing: npx tsx src/index.ts ${args.join(' ')}`);
    updateStatus("Booting Pipeline...");
    
    const child = spawn('npx', ['tsx', 'src/index.ts', ...args], {
        cwd: process.cwd()
    });

    child.stdout.on('data', (data: Buffer) => {
        const lines = data.toString().split('\n');
        for (const line of lines) {
            addLog(line);
            
            const match = line.match(/\[\d+\/\d+\]\s*(.*)/);
            if (match) {
                updateStatus(match[1].replace(/[^\w\s]/g, '').trim());
            }
        }
    });

    child.stderr.on('data', (data: Buffer) => {
        const lines = data.toString().split('\n');
        for (const line of lines) {
            addLog('[STDERR] ' + line);
        }
    });

    child.on('close', (code) => {
        addLog(`Child process exited with code ${code}`);
        pipelineFinished = true;
        countdownActive = true;
        
        const countdownBox = blessed.box({
            parent: screen,
            bottom: 0,
            right: 0,
            width: 25,
            height: 3,
            border: 'line',
            content: 'Auto-exit in 60s...',
            tags: true,
            style: {
                fg: 'green',
                bg: 'black',
                border: { fg: 'cyan' }
            }
        });
        
        let timeLeft = 60;
        
        countdownInterval = setInterval(() => {
            timeLeft--;
            countdownBox.setContent(`Auto-exit in ${timeLeft}s...`);
            screen.render();
            
            if (timeLeft <= 0) {
                if (countdownInterval) clearInterval(countdownInterval);
                logStream.end();
                process.exit(0);
            }
        }, 1000);
        
        screen.render();
    });
}
