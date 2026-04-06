// ── Chat Manager ── //

const SUGGESTIONS = [
  'Build me a React component',
  'Explain this code',
  'Write a Python script',
  'Help me debug this error',
  'Create a REST API',
  'Review my code',
];

export class ChatManager {
  constructor(homedir, usageManager, ideManager) {
    this.homedir = homedir;
    this.usageManager = usageManager;
    this.ideManager = ideManager;
    this.cwd = homedir;
    this.conversations = this.loadConversations();
    this.currentId = null;
    this.sessionId = null;
    this.activeProvider = 'anthropic';
    this.isStreaming = false;
    this.streamCleanup = null;
    this.doneCleanup = null;

    this.messagesEl = document.getElementById('chat-messages');
    this.inputEl = document.getElementById('chat-input');
    this.sendBtn = document.getElementById('btn-send');
    this.tokenCounter = document.getElementById('token-counter');

    this.setupInput();
    this.renderConversationsList();
    this.showEmptyState();

    // configure marked
    marked.setOptions({
      highlight: (code, lang) => {
        if (lang && hljs.getLanguage(lang)) {
          return hljs.highlight(code, { language: lang }).value;
        }
        return hljs.highlightAuto(code).value;
      },
      breaks: true,
    });

    // custom renderer for code blocks
    const renderer = new marked.Renderer();
    renderer.code = (code, lang) => {
      const highlighted = lang && hljs.getLanguage(lang)
        ? hljs.highlight(code, { language: lang }).value
        : hljs.highlightAuto(code).value;
      const langLabel = lang || 'text';
      return `
        <div class="code-block-wrap" data-code="${encodeURIComponent(code)}" data-lang="${langLabel}">
          <pre>
            <div class="code-block-header">
              <span class="code-lang">${langLabel}</span>
              <div class="code-actions">
                <button class="btn-copy-code">Copy</button>
                <button class="btn-open-ide">Open in IDE</button>
              </div>
            </div>
            <code class="hljs language-${langLabel}">${highlighted}</code>
          </pre>
        </div>`;
    };
    marked.use({ renderer });
  }

  setCwd(path) { this.cwd = path; }

  // ── Conversations persistence ── //
  loadConversations() {
    try {
      return JSON.parse(localStorage.getItem('conversations') || '[]');
    } catch { return []; }
  }

  saveConversations() {
    localStorage.setItem('conversations', JSON.stringify(this.conversations));
  }

  newConversation() {
    const id = Date.now().toString();
    this.conversations.unshift({ id, title: 'New Chat', messages: [], sessionId: null, ts: Date.now() });
    this.saveConversations();
    this.loadConversation(id);
    this.renderConversationsList();
    return id;
  }

  loadConversation(id) {
    const convo = this.conversations.find(c => c.id === id);
    if (!convo) return;
    this.currentId = id;
    this.sessionId = convo.sessionId;
    this.messagesEl.innerHTML = '';
    if (convo.messages.length === 0) {
      this.showEmptyState();
    } else {
      convo.messages.forEach(m => this.renderMessage(m.role, m.content, m.usage));
    }
    this.renderConversationsList();
  }

  getCurrentConvo() {
    return this.conversations.find(c => c.id === this.currentId);
  }

  // ── Rendering ── //
  showEmptyState() {
    this.messagesEl.innerHTML = `
      <div class="chat-empty">
        <div class="chat-empty-logo">C</div>
        <h2>Claude Desktop</h2>
        <p>Your AI assistant with MCP connectors, skills, and tools. What would you like to build today?</p>
        <div class="suggestion-chips">
          ${SUGGESTIONS.map(s => `<button class="suggestion-chip">${s}</button>`).join('')}
        </div>
      </div>`;
    this.messagesEl.querySelectorAll('.suggestion-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        this.inputEl.value = chip.textContent;
        this.inputEl.focus();
        this.autoResize();
      });
    });
  }

  renderMessage(role, content, usage = null) {
    // Remove empty state
    const empty = this.messagesEl.querySelector('.chat-empty');
    if (empty) empty.remove();

    const wrap = document.createElement('div');
    wrap.className = `msg-wrapper ${role}`;

    if (role === 'user') {
      wrap.innerHTML = `<div class="msg-bubble">${this.escapeHtml(content)}</div>`;
    } else {
      const usageBadge = usage
        ? `<span class="msg-usage-badge">↑${this.fmt(usage.input_tokens)} ↓${this.fmt(usage.output_tokens)}</span>`
        : '';
      const parsed = marked.parse(content || '');
      wrap.innerHTML = `
        <div class="msg-assistant-inner">
          <div class="msg-avatar">${this.getProviderAvatarLabel()}</div>
          <div class="msg-content">
            <div class="msg-meta">
              <span>Claude</span>
              ${usageBadge}
            </div>
            <div class="msg-body">${parsed}</div>
          </div>
        </div>`;
      // Wire code block buttons
      wrap.querySelectorAll('.code-block-wrap').forEach(block => {
        const code = decodeURIComponent(block.dataset.code);
        const lang = block.dataset.lang;
        block.querySelector('.btn-copy-code')?.addEventListener('click', () => {
          navigator.clipboard.writeText(code);
        });
        block.querySelector('.btn-open-ide')?.addEventListener('click', () => {
          this.ideManager.openCodeSnippet(code, lang);
          document.querySelector('[data-tab="ide"]').click();
        });
      });
    }

    this.messagesEl.appendChild(wrap);
    this.messagesEl.scrollTop = this.messagesEl.scrollHeight;
    return wrap;
  }

  renderToolBlock(name, input) {
    const block = document.createElement('div');
    block.className = 'tool-block';
    block.innerHTML = `
      <div class="tool-block-header">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"/>
        </svg>
        <span>${name}</span>
        <span class="tool-status running">Running…</span>
      </div>
      <div class="tool-block-body">${this.escapeHtml(JSON.stringify(input, null, 2))}</div>`;
    return block;
  }

  addThinkingIndicator() {
    const el = document.createElement('div');
    el.className = 'msg-wrapper assistant';
    el.id = 'thinking-indicator';
    el.innerHTML = `
      <div class="msg-assistant-inner">
        <div class="msg-avatar">${this.getProviderAvatarLabel()}</div>
        <div class="thinking-indicator">
          <div class="thinking-dots"><span></span><span></span><span></span></div>
          Thinking…
        </div>
      </div>`;
    this.messagesEl.appendChild(el);
    this.messagesEl.scrollTop = this.messagesEl.scrollHeight;
    return el;
  }

  removeThinkingIndicator() {
    document.getElementById('thinking-indicator')?.remove();
  }

  // ── Send flow ── //
  async sendMessage(text) {
    if (!text.trim() || this.isStreaming) return;

    if (!this.currentId) this.newConversation();

    const convo = this.getCurrentConvo();

    // Render user message
    this.renderMessage('user', text);
    convo.messages.push({ role: 'user', content: text });
    if (convo.messages.length === 1) {
      convo.title = text.slice(0, 40) + (text.length > 40 ? '…' : '');
      this.renderConversationsList();
    }
    this.saveConversations();
    this.inputEl.value = '';
    this.autoResize();

    this.isStreaming = true;
    this.sendBtn.disabled = true;

    const thinking = this.addThinkingIndicator();
    let assistantWrap = null;
    let assistantBody = null;
    let fullText = '';
    let activeToolBlock = null;
    let usageSummary = null;

    // Cleanup previous listeners
    this.streamCleanup?.();
    this.doneCleanup?.();

    this.streamCleanup = window.api.onClaudeStream((msg) => {
      // Remove thinking indicator on first real content
      if (thinking.parentNode) {
        this.removeThinkingIndicator();
        assistantWrap = this.renderMessage('assistant', '');
        assistantBody = assistantWrap.querySelector('.msg-body');
        if (assistantBody) assistantBody.classList.add('stream-cursor');
      }

      // Handle stream-json events
      if (msg.type === 'content_block_delta') {
        const delta = msg.delta;
        if (delta?.type === 'text_delta') {
          fullText += delta.text;
          if (assistantBody) {
            assistantBody.innerHTML = marked.parse(fullText);
            assistantBody.classList.add('stream-cursor');
          }
          this.messagesEl.scrollTop = this.messagesEl.scrollHeight;
        }
      } else if (msg.type === 'content_block_start') {
        if (msg.content_block?.type === 'tool_use') {
          activeToolBlock = this.renderToolBlock(msg.content_block.name, {});
          assistantBody?.appendChild(activeToolBlock);
        }
      } else if (msg.type === 'content_block_stop') {
        if (activeToolBlock) {
          const status = activeToolBlock.querySelector('.tool-status');
          if (status) { status.textContent = 'Done'; status.className = 'tool-status done'; }
          activeToolBlock = null;
        }
      } else if (msg.type === 'message_delta' && msg.usage) {
        usageSummary = msg.usage;
        const total = (msg.usage.input_tokens || 0) + (msg.usage.output_tokens || 0);
        this.tokenCounter.textContent = `${this.fmt(total)} tokens`;
      } else if (msg.type === 'error') {
        if (assistantBody) {
          assistantBody.innerHTML += `<p style="color:var(--red)">Error: ${this.escapeHtml(msg.error?.message || 'Unknown error')}</p>`;
        }
      }
    });

    this.doneCleanup = window.api.onClaudeDone(({ sessionId, cancelled }) => {
      this.isStreaming = false;
      this.sendBtn.disabled = false;

      if (assistantBody) assistantBody.classList.remove('stream-cursor');
      if (thinking.parentNode) this.removeThinkingIndicator();

      if (sessionId) {
        this.sessionId = sessionId;
        convo.sessionId = sessionId;
      }

      if (fullText) {
        convo.messages.push({ role: 'assistant', content: fullText, usage: usageSummary });
        this.saveConversations();
      }

      if (usageSummary) {
        this.usageManager.recordUsage({
          input: usageSummary.input_tokens || 0,
          output: usageSummary.output_tokens || 0,
          cacheRead: usageSummary.cache_read_input_tokens || 0,
        });
        // Update badge on assistant message
        const badge = assistantWrap?.querySelector('.msg-usage-badge');
        if (badge) {
          badge.textContent = `↑${this.fmt(usageSummary.input_tokens)} ↓${this.fmt(usageSummary.output_tokens)}`;
        }
      }

      this.streamCleanup?.();
      this.doneCleanup?.();
    });

    try {
      await this.sendToActiveProvider(text);
    } catch (err) {
      this.removeThinkingIndicator();
      this.isStreaming = false;
      this.sendBtn.disabled = false;
      this.renderMessage('assistant', `**Error:** Could not connect to claude CLI.\n\nMake sure \`claude\` is installed and in your PATH.\n\n\`\`\`\n${err.error || err.message || JSON.stringify(err)}\n\`\`\``);
    }
  }

  // ── Input setup ── //
  setupInput() {
    this.inputEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.sendMessage(this.inputEl.value);
      }
    });

    this.inputEl.addEventListener('input', () => this.autoResize());

    this.sendBtn.addEventListener('click', () => {
      if (this.isStreaming) {
        window.api.claudeCancel();
      } else {
        this.sendMessage(this.inputEl.value);
      }
    });

    document.getElementById('btn-attach').addEventListener('click', async () => {
      const result = await window.api.openFile();
      if (!result.cancelled) {
        const content = await window.api.readFile(result.path);
        if (content.content) {
          const name = result.path.split('/').pop();
          this.inputEl.value += `\n\n[File: ${name}]\n\`\`\`\n${content.content.slice(0, 8000)}\n\`\`\``;
          this.autoResize();
        }
      }
    });
  }

  autoResize() {
    this.inputEl.style.height = 'auto';
    this.inputEl.style.height = Math.min(this.inputEl.scrollHeight, 200) + 'px';
  }

  // ── Multi-provider routing ──
  async sendToActiveProvider(text) {
    const account = this.usageManager?.getActiveAccount();
    const provider = account?.provider || 'anthropic';
    this.activeProvider = provider;

    // Build history for context (last 10 messages)
    const convo = this.getCurrentConvo();
    const history = (convo?.messages || []).slice(-10).map(m => ({
      role: m.role, content: m.content,
    }));

    if (provider === 'openai') {
      return window.api.openaiSend({ prompt: text, apiKey: account.key, model: account.model || 'gpt-4o', history });
    } else if (provider === 'google') {
      return window.api.geminiSend({ prompt: text, apiKey: account.key, model: account.model || 'gemini-1.5-pro', history });
    } else if (provider === 'openrouter') {
      return window.api.openrouterSend({ prompt: text, apiKey: account.key, model: account.model || 'openrouter/auto', history });
    } else if (provider === 'github') {
      return window.api.githubSend({ prompt: text, apiKey: account.key, model: account.model || 'gpt-4o-github', history });
    } else {
      // Anthropic via claude CLI
      return window.api.claudeSend({
        prompt: text,
        sessionId: this.sessionId,
        cwd: this.cwd,
        apiKey: account?.key,
      });
    }
  }

  onAccountChange(account) {
    if (!account) return;
    this.activeProvider = account.provider || 'anthropic';
    // Reset session when switching providers
    this.sessionId = null;
    if (this.getCurrentConvo()) {
      this.getCurrentConvo().sessionId = null;
      this.saveConversations();
    }
    const badge = document.getElementById('model-badge');
    if (badge) badge.textContent = account.model;
  }

  // ── Conversations sidebar ── //
  renderConversationsList() {
    const list = document.getElementById('conversations-list');
    const search = document.getElementById('sidebar-search').value.toLowerCase();

    const filtered = this.conversations.filter(c =>
      c.title.toLowerCase().includes(search)
    );

    if (filtered.length === 0) {
      list.innerHTML = `<div style="padding: 16px 12px; font-size: 11px; color: var(--text-muted); text-align: center">No conversations yet</div>`;
      return;
    }

    // Group by date
    const today = new Date(); today.setHours(0,0,0,0);
    const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);

    const groups = { 'Today': [], 'Yesterday': [], 'Earlier': [] };
    filtered.forEach(c => {
      const d = new Date(c.ts); d.setHours(0,0,0,0);
      if (d.getTime() === today.getTime()) groups['Today'].push(c);
      else if (d.getTime() === yesterday.getTime()) groups['Yesterday'].push(c);
      else groups['Earlier'].push(c);
    });

    list.innerHTML = '';
    for (const [label, convos] of Object.entries(groups)) {
      if (!convos.length) continue;
      const groupEl = document.createElement('div');
      groupEl.className = 'convo-date-group';
      groupEl.textContent = label;
      list.appendChild(groupEl);

      convos.forEach(c => {
        const item = document.createElement('div');
        item.className = `convo-item${c.id === this.currentId ? ' active' : ''}`;
        item.innerHTML = `
          <svg class="convo-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
          </svg>
          <span class="convo-title">${this.escapeHtml(c.title)}</span>
          <button class="convo-delete" title="Delete">✕</button>`;
        item.addEventListener('click', (e) => {
          if (!e.target.classList.contains('convo-delete')) this.loadConversation(c.id);
        });
        item.querySelector('.convo-delete').addEventListener('click', (e) => {
          e.stopPropagation();
          this.deleteConversation(c.id);
        });
        list.appendChild(item);
      });
    }

    document.getElementById('sidebar-search').addEventListener('input', () => this.renderConversationsList());
  }

  deleteConversation(id) {
    this.conversations = this.conversations.filter(c => c.id !== id);
    this.saveConversations();
    if (this.currentId === id) {
      this.currentId = null;
      this.sessionId = null;
      this.messagesEl.innerHTML = '';
      this.showEmptyState();
    }
    this.renderConversationsList();
  }

  getProviderAvatarLabel() {
    const p = this.activeProvider || 'anthropic';
    return { anthropic: 'C', openai: 'G', google: 'AI', openrouter: 'OR', github: 'GH' }[p] || 'C';
  }

  // ── Helpers ── //
  escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  fmt(n) {
    if (!n) return '0';
    if (n >= 1000) return (n / 1000).toFixed(1) + 'k';
    return String(n);
  }
}
