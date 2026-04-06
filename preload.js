const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  // Window
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  close:    () => ipcRenderer.send('window-close'),

  // Anthropic / claude CLI
  claudeSend:       (opts) => ipcRenderer.invoke('claude-send', opts),
  claudeCancel:     ()     => ipcRenderer.send('claude-cancel'),

  // OpenAI
  openaiSend:       (opts) => ipcRenderer.invoke('openai-send', opts),
  // Google Gemini
  geminiSend:       (opts) => ipcRenderer.invoke('gemini-send', opts),
  // OpenRouter
  openrouterSend:   (opts) => ipcRenderer.invoke('openrouter-send', opts),
  // GitHub Models
  githubSend:       (opts) => ipcRenderer.invoke('github-send', opts),

  // Streams (shared for all providers)
  onClaudeStream: (cb) => {
    const h = (_, d) => cb(d);
    ipcRenderer.on('claude-stream', h);
    return () => ipcRenderer.removeListener('claude-stream', h);
  },
  onClaudeDone: (cb) => {
    const h = (_, d) => cb(d);
    ipcRenderer.on('claude-done', h);
    return () => ipcRenderer.removeListener('claude-done', h);
  },

  // Web fetch (research/deep dive)
  fetchUrl: (url) => ipcRenderer.invoke('fetch-url', url),

  // File system
  readFile:   (p)       => ipcRenderer.invoke('fs-read-file', p),
  writeFile:  (p, c)    => ipcRenderer.invoke('fs-write-file', { filePath: p, content: c }),
  readDir:    (p)       => ipcRenderer.invoke('fs-read-dir', p),
  openFolder: ()        => ipcRenderer.invoke('fs-open-folder'),
  openFile:   ()        => ipcRenderer.invoke('fs-open-file'),
  saveFile:   (dp, c)   => ipcRenderer.invoke('fs-save-file', { defaultPath: dp, content: c }),

  // Agent process monitor
  listAgentProcesses: () => ipcRenderer.invoke('list-agent-processes'),

  // Helpers
  pathJoin:        (...p) => ipcRenderer.invoke('path-join', ...p),
  pathDirname:     (p)    => ipcRenderer.invoke('path-dirname', p),
  osHomedir:       ()     => ipcRenderer.invoke('os-homedir'),
  openExternal:    (url)  => ipcRenderer.invoke('shell-open-external', url),
});
