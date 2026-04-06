// ── IDE / Editor Manager ── //

const FILE_ICONS = {
  js: '📄', ts: '📘', jsx: '⚛️', tsx: '⚛️',
  html: '🌐', css: '🎨', json: '📋',
  py: '🐍', md: '📝', txt: '📄',
  sh: '⚙️', rs: '🦀', go: '🐹',
};

const LANG_MAP = {
  js: 'javascript', ts: 'typescript', jsx: 'javascript', tsx: 'typescript',
  html: 'html', css: 'css', json: 'json', py: 'python',
  md: 'markdown', sh: 'shell', rs: 'rust', go: 'go',
  yml: 'yaml', yaml: 'yaml', xml: 'xml', sql: 'sql',
  txt: 'plaintext',
};

export class IDEManager {
  constructor(homedir) {
    this.homedir = homedir;
    this.rootPath = null;
    this.openFiles = [];       // { path, name, content, modified }
    this.activeIndex = -1;
    this.editor = null;
    this.treeExpanded = {};

    this.fileTreeEl = document.getElementById('file-tree');
    this.editorTabsBar = document.getElementById('editor-tabs-bar');
    this.monacoEl = document.getElementById('monaco-editor');

    this.initMonaco();
    this.wireButtons();

    // Show placeholder in file tree
    this.showTreePlaceholder();
  }

  showTreePlaceholder() {
    this.fileTreeEl.innerHTML = `
      <div class="file-tree-empty">
        Open a folder to browse files
      </div>`;
  }

  initMonaco() {
    require.config({ paths: { vs: 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.44.0/min/vs' } });
    require(['vs/editor/editor.main'], () => {
      this.editor = monaco.editor.create(this.monacoEl, {
        value: '',
        language: 'plaintext',
        theme: 'vs-dark',
        fontSize: 13,
        fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
        lineNumbers: 'on',
        minimap: { enabled: true },
        scrollBeyondLastLine: false,
        automaticLayout: true,
        wordWrap: 'off',
        renderLineHighlight: 'all',
        cursorBlinking: 'smooth',
        smoothScrolling: true,
        padding: { top: 12 },
      });

      // Custom dark theme matching our UI
      monaco.editor.defineTheme('claude-dark', {
        base: 'vs-dark',
        inherit: true,
        rules: [],
        colors: {
          'editor.background': '#1a1b26',
          'editor.lineHighlightBackground': '#252637',
          'editorLineNumber.foreground': '#585970',
          'editorLineNumber.activeForeground': '#cc785c',
          'editor.selectionBackground': '#353759',
          'editor.inactiveSelectionBackground': '#2e3050',
        },
      });
      monaco.editor.setTheme('claude-dark');

      // Track unsaved changes
      this.editor.onDidChangeModelContent(() => {
        if (this.activeIndex >= 0) {
          const f = this.openFiles[this.activeIndex];
          if (!f.modified) {
            f.modified = true;
            this.renderEditorTabs();
          }
        }
      });
    });
  }

  wireButtons() {
    document.getElementById('btn-new-file').addEventListener('click', () => this.newUntitledFile());
    document.getElementById('btn-refresh-tree').addEventListener('click', () => {
      if (this.rootPath) this.renderTree(this.rootPath, this.fileTreeEl, 0);
    });
    document.getElementById('btn-preview-refresh').addEventListener('click', () => this.refreshPreview());
    document.getElementById('btn-preview-popout').addEventListener('click', () => this.popoutPreview());

    // Save file: Ctrl+S / Cmd+S
    document.addEventListener('keydown', async (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        await this.saveActiveFile();
      }
    });
  }

  // ── File tree ── //
  async setRoot(path) {
    this.rootPath = path;
    this.treeExpanded = {};
    await this.renderTree(path, this.fileTreeEl, 0);
  }

  async renderTree(dirPath, container, depth) {
    if (depth === 0) container.innerHTML = '';

    const result = await window.api.readDir(dirPath);
    if (result.error) {
      container.innerHTML = `<div class="file-tree-empty">Error: ${result.error}</div>`;
      return;
    }

    const { entries } = result;
    // Sort: dirs first, then files
    entries.sort((a, b) => {
      if (a.isDirectory && !b.isDirectory) return -1;
      if (!a.isDirectory && b.isDirectory) return 1;
      return a.name.localeCompare(b.name);
    });

    for (const entry of entries) {
      const item = document.createElement('div');
      const ext = entry.name.split('.').pop();
      item.className = `tree-item ${entry.isDirectory ? 'tree-dir' : 'tree-file'} tree-depth-${depth}`;

      if (entry.isDirectory) {
        const isOpen = this.treeExpanded[entry.path];
        item.innerHTML = `
          <span class="tree-item-icon">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              ${isOpen
                ? '<path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/>'
                : '<path d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7z"/>'}
            </svg>
          </span>
          <span class="tree-item-name">${entry.name}</span>`;

        const subContainer = document.createElement('div');
        if (isOpen) await this.renderTree(entry.path, subContainer, depth + 1);

        item.addEventListener('click', async () => {
          this.treeExpanded[entry.path] = !this.treeExpanded[entry.path];
          await this.renderTree(this.rootPath, this.fileTreeEl, 0);
        });
        container.appendChild(item);
        container.appendChild(subContainer);
      } else {
        const icon = FILE_ICONS[ext] || '📄';
        item.innerHTML = `
          <span class="tree-item-icon">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
            </svg>
          </span>
          <span class="tree-item-name">${entry.name}</span>`;
        item.addEventListener('click', () => this.openFile(entry.path, entry.name));
        container.appendChild(item);
      }
    }
  }

  // ── Open files / tabs ── //
  async openFile(filePath, name) {
    // Check if already open
    const existing = this.openFiles.findIndex(f => f.path === filePath);
    if (existing >= 0) {
      this.setActiveTab(existing);
      return;
    }

    const result = await window.api.readFile(filePath);
    if (result.error) {
      alert('Could not open file: ' + result.error);
      return;
    }

    this.openFiles.push({ path: filePath, name, content: result.content, modified: false });
    this.setActiveTab(this.openFiles.length - 1);
  }

  openCodeSnippet(code, lang) {
    const ext = Object.entries(LANG_MAP).find(([, v]) => v === lang)?.[0] || 'txt';
    const name = `snippet.${ext}`;
    this.openFiles.push({ path: null, name, content: code, modified: false, isSnippet: true });
    this.setActiveTab(this.openFiles.length - 1);
  }

  newUntitledFile() {
    this.openFiles.push({ path: null, name: 'untitled.txt', content: '', modified: false });
    this.setActiveTab(this.openFiles.length - 1);
  }

  setActiveTab(index) {
    this.activeIndex = index;
    const file = this.openFiles[index];
    const ext = file.name.split('.').pop();
    const lang = LANG_MAP[ext] || 'plaintext';

    if (this.editor) {
      const model = monaco.editor.createModel(file.content, lang);
      this.editor.setModel(model);
      model.onDidChangeContent(() => {
        file.content = this.editor.getValue();
      });
    }

    this.renderEditorTabs();
    this.refreshPreview();

    // Highlight active in file tree
    document.querySelectorAll('.tree-item').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.tree-item').forEach(el => {
      if (el.querySelector('.tree-item-name')?.textContent === file.name) {
        el.classList.add('active');
      }
    });
  }

  renderEditorTabs() {
    this.editorTabsBar.innerHTML = '';
    this.openFiles.forEach((file, i) => {
      const tab = document.createElement('div');
      tab.className = `editor-tab${i === this.activeIndex ? ' active' : ''}${file.modified ? ' editor-tab-modified' : ''}`;
      tab.innerHTML = `
        <span class="editor-tab-name">${file.name}</span>
        <button class="editor-tab-close" title="Close">✕</button>`;
      tab.addEventListener('click', (e) => {
        if (!e.target.classList.contains('editor-tab-close')) this.setActiveTab(i);
      });
      tab.querySelector('.editor-tab-close').addEventListener('click', (e) => {
        e.stopPropagation();
        this.closeTab(i);
      });
      this.editorTabsBar.appendChild(tab);
    });
  }

  closeTab(index) {
    const file = this.openFiles[index];
    if (file.modified && !confirm(`"${file.name}" has unsaved changes. Close anyway?`)) return;
    this.openFiles.splice(index, 1);
    if (this.openFiles.length === 0) {
      this.activeIndex = -1;
      this.editor?.setValue('');
      this.editorTabsBar.innerHTML = '';
    } else {
      this.setActiveTab(Math.max(0, index - 1));
    }
  }

  async saveActiveFile() {
    if (this.activeIndex < 0) return;
    const file = this.openFiles[this.activeIndex];
    const content = this.editor?.getValue() ?? file.content;

    if (file.path) {
      const result = await window.api.writeFile(file.path, content);
      if (result.error) { alert('Save failed: ' + result.error); return; }
    } else {
      const result = await window.api.saveFile(file.name, content);
      if (result.cancelled) return;
      file.path = result.path;
      file.name = result.path.split('/').pop();
    }

    file.content = content;
    file.modified = false;
    this.renderEditorTabs();
    this.refreshPreview();
  }

  // ── Live preview ── //
  refreshPreview() {
    if (this.activeIndex < 0) return;
    const file = this.openFiles[this.activeIndex];
    const content = this.editor?.getValue() ?? file.content;
    const ext = file.name.split('.').pop().toLowerCase();
    const webview = document.getElementById('preview-webview');

    if (['html', 'htm'].includes(ext)) {
      // Live HTML preview
      webview.src = `data:text/html;charset=utf-8,${encodeURIComponent(content)}`;
      document.getElementById('preview-title').textContent = 'Preview — ' + file.name;
    } else if (ext === 'md') {
      // Markdown preview
      const rendered = marked.parse(content);
      const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
        <style>
          body { font-family: system-ui; padding: 24px; max-width: 800px; margin: 0 auto; line-height: 1.6; color: #1a1b26; }
          code { background: #f0f0f0; padding: 2px 5px; border-radius: 3px; }
          pre { background: #f0f0f0; padding: 12px; border-radius: 6px; overflow-x: auto; }
          pre code { background: none; }
        </style></head><body>${rendered}</body></html>`;
      webview.src = `data:text/html;charset=utf-8,${encodeURIComponent(html)}`;
      document.getElementById('preview-title').textContent = 'Preview — ' + file.name;
    } else if (ext === 'css') {
      // CSS preview with sample HTML
      const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${content}</style></head>
        <body><h1>CSS Preview</h1><p>Sample paragraph text.</p><button>Button</button><a href="#">Link</a></body></html>`;
      webview.src = `data:text/html;charset=utf-8,${encodeURIComponent(html)}`;
      document.getElementById('preview-title').textContent = 'Preview — ' + file.name;
    } else {
      document.getElementById('preview-title').textContent = 'Preview';
      webview.src = 'about:blank';
    }
  }

  popoutPreview() {
    if (this.activeIndex < 0) return;
    const file = this.openFiles[this.activeIndex];
    const content = this.editor?.getValue() ?? file.content;
    if (file.path) {
      window.api.openExternal(`file://${file.path}`);
    }
  }
}
