const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const https = require('https');

let mainWindow;
let claudeProcess = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1600,
    height: 1000,
    minWidth: 900,
    minHeight: 600,
    frame: false,
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'hidden',
    backgroundColor: '#1a1b26',
    title: 'ClaudeCodex',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webviewTag: true,
    },
    icon: path.join(__dirname, '../tailblazers-logo.png'),
  });
  mainWindow.loadFile(path.join(__dirname, 'renderer/index.html'));
  mainWindow.on('closed', () => {
    mainWindow = null;
    if (claudeProcess) { claudeProcess.kill(); claudeProcess = null; }
  });
}

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });

// ── Window controls ──
ipcMain.on('window-minimize', () => mainWindow?.minimize());
ipcMain.on('window-maximize', () => mainWindow?.isMaximized() ? mainWindow.unmaximize() : mainWindow?.maximize());
ipcMain.on('window-close', () => mainWindow?.close());

// ── Anthropic / claude CLI ──
ipcMain.handle('claude-send', async (event, { prompt, sessionId, cwd, apiKey }) => {
  return new Promise((resolve, reject) => {
    if (claudeProcess) { claudeProcess.kill(); claudeProcess = null; }

    const args = ['--output-format', 'stream-json', '--verbose', '-p', prompt];
    if (sessionId) args.push('--resume', sessionId);

    const env = { ...process.env };
    if (apiKey) env.ANTHROPIC_API_KEY = apiKey;

    try {
      claudeProcess = spawn('claude', args, { cwd: cwd || os.homedir(), env, shell: false });
    } catch (err) {
      reject({ error: 'Failed to spawn claude CLI: ' + err.message }); return;
    }

    let buffer = '';
    let newSessionId = sessionId;

    claudeProcess.stdout.on('data', (data) => {
      buffer += data.toString();
      const lines = buffer.split('\n');
      buffer = lines.pop();
      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const msg = JSON.parse(line);
          if (msg.session_id) newSessionId = msg.session_id;
          mainWindow?.webContents.send('claude-stream', msg);
        } catch (_) {
          mainWindow?.webContents.send('claude-stream', { type: 'text', text: line });
        }
      }
    });
    claudeProcess.stderr.on('data', (data) => {
      mainWindow?.webContents.send('claude-stream', { type: 'error', text: data.toString() });
    });
    claudeProcess.on('close', (code) => {
      claudeProcess = null;
      mainWindow?.webContents.send('claude-done', { code, sessionId: newSessionId });
      resolve({ code, sessionId: newSessionId });
    });
    claudeProcess.on('error', (err) => { claudeProcess = null; reject({ error: err.message }); });
  });
});

ipcMain.on('claude-cancel', () => {
  if (claudeProcess) { claudeProcess.kill('SIGINT'); claudeProcess = null; }
  mainWindow?.webContents.send('claude-done', { code: -1, cancelled: true });
});

// ── OpenAI API ──
ipcMain.handle('openai-send', async (event, { prompt, apiKey, model, history }) => {
  return new Promise((resolve, reject) => {
    const messages = [...(history || []), { role: 'user', content: prompt }];
    const body = JSON.stringify({ model: model || 'gpt-4o', messages, stream: true });

    const options = {
      hostname: 'api.openai.com',
      path: '/v1/chat/completions',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
    };

    const req = https.request(options, (res) => {
      let fullText = '';
      let inputTokens = 0, outputTokens = 0;

      res.on('data', (chunk) => {
        const lines = chunk.toString().split('\n').filter(l => l.startsWith('data: '));
        for (const line of lines) {
          const data = line.slice(6).trim();
          if (data === '[DONE]') continue;
          try {
            const parsed = JSON.parse(data);
            const delta = parsed.choices?.[0]?.delta?.content || '';
            if (delta) {
              fullText += delta;
              mainWindow?.webContents.send('claude-stream', {
                type: 'content_block_delta',
                delta: { type: 'text_delta', text: delta },
              });
            }
            if (parsed.usage) {
              inputTokens = parsed.usage.prompt_tokens || 0;
              outputTokens = parsed.usage.completion_tokens || 0;
            }
          } catch (_) {}
        }
      });

      res.on('end', () => {
        mainWindow?.webContents.send('claude-done', {
          code: 0,
          usage: { input_tokens: inputTokens, output_tokens: outputTokens },
        });
        resolve({ fullText, inputTokens, outputTokens });
      });
    });

    req.on('error', (err) => reject({ error: err.message }));
    req.write(body);
    req.end();
  });
});

// ── OpenRouter API (OpenAI-compatible) ──
ipcMain.handle('openrouter-send', async (event, { prompt, apiKey, model, history }) => {
  return new Promise((resolve, reject) => {
    const messages = [...(history || []), { role: 'user', content: prompt }];
    const body = JSON.stringify({
      model: model || 'openrouter/auto',
      messages,
      stream: true,
    });

    const options = {
      hostname: 'openrouter.ai',
      path: '/api/v1/chat/completions',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://claudecodex.app',
        'X-Title': 'ClaudeCodex',
        'Content-Length': Buffer.byteLength(body),
      },
    };

    const req = https.request(options, (res) => {
      let fullText = '';
      let inputTokens = 0, outputTokens = 0;

      res.on('data', (chunk) => {
        const lines = chunk.toString().split('\n').filter(l => l.startsWith('data: '));
        for (const line of lines) {
          const data = line.slice(6).trim();
          if (data === '[DONE]') continue;
          try {
            const parsed = JSON.parse(data);
            const delta = parsed.choices?.[0]?.delta?.content || '';
            if (delta) {
              fullText += delta;
              mainWindow?.webContents.send('claude-stream', {
                type: 'content_block_delta',
                delta: { type: 'text_delta', text: delta },
              });
            }
            if (parsed.usage) {
              inputTokens = parsed.usage.prompt_tokens || 0;
              outputTokens = parsed.usage.completion_tokens || 0;
            }
          } catch (_) {}
        }
      });

      res.on('end', () => {
        mainWindow?.webContents.send('claude-done', {
          code: 0,
          usage: { input_tokens: inputTokens, output_tokens: outputTokens },
        });
        resolve({ fullText, inputTokens, outputTokens });
      });
    });

    req.on('error', (err) => reject({ error: err.message }));
    req.write(body);
    req.end();
  });
});

// ── GitHub Models API (OpenAI-compatible) ──
ipcMain.handle('github-send', async (event, { prompt, apiKey, model, history }) => {
  return new Promise((resolve, reject) => {
    // Strip -github suffix for actual model name
    const actualModel = (model || 'gpt-4o').replace('-github', '');
    const messages = [...(history || []), { role: 'user', content: prompt }];
    const body = JSON.stringify({ model: actualModel, messages, stream: true });

    const options = {
      hostname: 'models.inference.ai.azure.com',
      path: '/chat/completions',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
    };

    const req = https.request(options, (res) => {
      let fullText = '';
      let inputTokens = 0, outputTokens = 0;

      res.on('data', (chunk) => {
        const lines = chunk.toString().split('\n').filter(l => l.startsWith('data: '));
        for (const line of lines) {
          const data = line.slice(6).trim();
          if (data === '[DONE]') continue;
          try {
            const parsed = JSON.parse(data);
            const delta = parsed.choices?.[0]?.delta?.content || '';
            if (delta) {
              fullText += delta;
              mainWindow?.webContents.send('claude-stream', {
                type: 'content_block_delta',
                delta: { type: 'text_delta', text: delta },
              });
            }
            if (parsed.usage) {
              inputTokens = parsed.usage.prompt_tokens || 0;
              outputTokens = parsed.usage.completion_tokens || 0;
            }
          } catch (_) {}
        }
      });

      res.on('end', () => {
        mainWindow?.webContents.send('claude-done', {
          code: 0,
          usage: { input_tokens: inputTokens, output_tokens: outputTokens },
        });
        resolve({ fullText, inputTokens, outputTokens });
      });
    });

    req.on('error', (err) => reject({ error: err.message }));
    req.write(body);
    req.end();
  });
});

// ── Google Gemini API ──
ipcMain.handle('gemini-send', async (event, { prompt, apiKey, model, history }) => {
  return new Promise((resolve, reject) => {
    const contents = [
      ...(history || []).map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] })),
      { role: 'user', parts: [{ text: prompt }] },
    ];
    const modelName = model || 'gemini-1.5-pro';
    const body = JSON.stringify({ contents, generationConfig: { maxOutputTokens: 8192 } });
    const pathStr = `/v1beta/models/${modelName}:streamGenerateContent?key=${apiKey}&alt=sse`;

    const options = {
      hostname: 'generativelanguage.googleapis.com',
      path: pathStr,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
    };

    const req = https.request(options, (res) => {
      let buffer = '';
      let fullText = '';
      let inputTokens = 0, outputTokens = 0;

      res.on('data', (chunk) => {
        buffer += chunk.toString();
        const lines = buffer.split('\n');
        buffer = lines.pop();
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const data = line.slice(6).trim();
          try {
            const parsed = JSON.parse(data);
            const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text || '';
            if (text) {
              fullText += text;
              mainWindow?.webContents.send('claude-stream', {
                type: 'content_block_delta',
                delta: { type: 'text_delta', text },
              });
            }
            if (parsed.usageMetadata) {
              inputTokens = parsed.usageMetadata.promptTokenCount || 0;
              outputTokens = parsed.usageMetadata.candidatesTokenCount || 0;
            }
          } catch (_) {}
        }
      });

      res.on('end', () => {
        mainWindow?.webContents.send('claude-done', {
          code: 0,
          usage: { input_tokens: inputTokens, output_tokens: outputTokens },
        });
        resolve({ fullText, inputTokens, outputTokens });
      });
    });

    req.on('error', (err) => reject({ error: err.message }));
    req.write(body);
    req.end();
  });
});

// ── Web fetch (for deep dive / research) ──
ipcMain.handle('fetch-url', async (_, url) => {
  return new Promise((resolve) => {
    try {
      const urlObj = new URL(url);
      const mod = urlObj.protocol === 'https:' ? https : require('http');
      const options = {
        hostname: urlObj.hostname,
        path: urlObj.pathname + urlObj.search,
        method: 'GET',
        headers: { 'User-Agent': 'ClaudeCodex/1.0', 'Accept': 'text/html,application/json' },
      };
      const req = mod.request(options, (res) => {
        // Follow redirects
        if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location) {
          resolve({ redirect: res.headers.location });
          return;
        }
        let data = '';
        res.on('data', c => data += c.toString());
        res.on('end', () => resolve({ content: data, status: res.statusCode, contentType: res.headers['content-type'] || '' }));
      });
      req.on('error', (e) => resolve({ error: e.message }));
      req.setTimeout(15000, () => { req.destroy(); resolve({ error: 'Timeout' }); });
      req.end();
    } catch (e) {
      resolve({ error: e.message });
    }
  });
});

// ── File system ──
ipcMain.handle('fs-read-file',  (_, p) => { try { return { content: fs.readFileSync(p, 'utf-8') }; } catch (e) { return { error: e.message }; } });
ipcMain.handle('fs-write-file', (_, { filePath, content }) => { try { fs.writeFileSync(filePath, content, 'utf-8'); return { success: true }; } catch (e) { return { error: e.message }; } });
ipcMain.handle('fs-read-dir',   (_, d) => {
  try {
    const entries = fs.readdirSync(d, { withFileTypes: true });
    return { entries: entries.map(e => ({ name: e.name, isDirectory: e.isDirectory(), path: path.join(d, e.name) })).filter(e => !e.name.startsWith('.')) };
  } catch (e) { return { error: e.message }; }
});
ipcMain.handle('fs-open-folder', async () => { const r = await dialog.showOpenDialog(mainWindow, { properties: ['openDirectory'] }); return r.canceled ? { cancelled: true } : { path: r.filePaths[0] }; });
ipcMain.handle('fs-open-file',   async () => { const r = await dialog.showOpenDialog(mainWindow, { properties: ['openFile'] }); return r.canceled ? { cancelled: true } : { path: r.filePaths[0] }; });
ipcMain.handle('fs-save-file',   async (_, { defaultPath, content }) => {
  const r = await dialog.showSaveDialog(mainWindow, { defaultPath });
  if (r.canceled) return { cancelled: true };
  try { fs.writeFileSync(r.filePath, content, 'utf-8'); return { path: r.filePath }; } catch (e) { return { error: e.message }; }
});

// ── Agent process monitoring ──
ipcMain.handle('list-agent-processes', async () => {
  return new Promise((resolve) => {
    const { exec } = require('child_process');
    // List running claude processes with their command args
    const cmd = process.platform === 'win32'
      ? 'wmic process where "name=\'claude.exe\'" get ProcessId,CommandLine /format:csv'
      : 'ps aux | grep -i claude | grep -v grep';

    exec(cmd, { timeout: 5000 }, (err, stdout) => {
      if (err) { resolve({ processes: [] }); return; }
      const lines = stdout.split('\n').filter(l => l.trim());
      const processes = lines.map(line => {
        const parts = line.trim().split(/\s+/);
        const pid = parseInt(parts[1]) || 0;
        const args = parts.slice(10).join(' '); // everything after the process info
        return { pid, args, task: extractTaskFromArgs(args) };
      }).filter(p => p.pid > 0);
      resolve({ processes });
    });
  });
});

function extractTaskFromArgs(args) {
  // Try to extract -p "prompt" from claude CLI args
  const match = args.match(/-p\s+["']?([^"']+)["']?/);
  return match ? match[1].slice(0, 60) : 'Running…';
}

ipcMain.handle('path-join',     (_, ...p) => path.join(...p));
ipcMain.handle('path-dirname',  (_, p) => path.dirname(p));
ipcMain.handle('os-homedir',    () => os.homedir());
ipcMain.handle('shell-open-external', (_, url) => shell.openExternal(url));
