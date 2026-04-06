// ── Hermes Agent WebUI Integration ── //
// Hermes Agent: https://github.com/nesquena/hermes-webui
// Runs at localhost:8787 by default (Python HTTP server + SSE streaming)

const DEFAULT_HERMES_URL = 'http://localhost:8787';

export class HermesManager {
  constructor(chatManager) {
    this.chatManager = chatManager;
    this.hermesUrl   = localStorage.getItem('hermesUrl') || DEFAULT_HERMES_URL;
    this.password    = localStorage.getItem('hermesPassword') || '';
    this.sessions    = [];
    this.activeSessionId = null;
    this.isConnected = false;
    this.streamSource = null;   // EventSource for SSE

    this.wire();
    this.checkConnection();
  }

  wire() {
    // URL / connect
    document.getElementById('hermes-url-input').value = this.hermesUrl;
    document.getElementById('btn-hermes-connect').addEventListener('click', () => {
      const url = document.getElementById('hermes-url-input').value.trim();
      if (url) this.setUrl(url);
    });
    document.getElementById('hermes-url-input').addEventListener('keydown', e => {
      if (e.key === 'Enter') document.getElementById('btn-hermes-connect').click();
    });

    document.getElementById('btn-hermes-refresh').addEventListener('click', () => this.checkConnection());
    document.getElementById('btn-hermes-open-browser').addEventListener('click', () => window.api.openExternal(this.hermesUrl));

    // Inner tabs
    document.querySelectorAll('.hermes-inner-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.hermes-inner-tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.hermes-panel').forEach(p => p.classList.remove('active'));
        tab.classList.add('active');
        const panel = document.getElementById(`hermes-panel-${tab.dataset.panel}`);
        if (panel) panel.classList.add('active');
        if (tab.dataset.panel === 'app') this.loadEmbed();
        if (tab.dataset.panel === 'agents') this.loadSessions();
        if (tab.dataset.panel === 'chat') this.renderChatPanel();
      });
    });

    // New session
    document.getElementById('btn-hermes-new-session').addEventListener('click', () => this.createSession());

    // Chat send
    document.getElementById('btn-hermes-chat-send').addEventListener('click', () => this.sendMessage());
    document.getElementById('hermes-chat-input').addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); this.sendMessage(); }
    });

    // Settings save
    document.getElementById('btn-hermes-save-settings').addEventListener('click', () => {
      const pwd = document.getElementById('hermes-password').value;
      const dir = document.getElementById('hermes-workspace').value;
      if (pwd !== undefined) { this.password = pwd; localStorage.setItem('hermesPassword', pwd); }
      if (dir) localStorage.setItem('hermesWorkspace', dir);
      this.checkConnection();
    });

    // Import session to main chat
    document.getElementById('btn-hermes-import-context')?.addEventListener('click', () => this.importToChat());
  }

  setUrl(url) {
    if (!url.startsWith('http')) url = 'http://' + url;
    this.hermesUrl = url;
    localStorage.setItem('hermesUrl', url);
    this.checkConnection();
  }

  // ── Connection ──
  async checkConnection() {
    this.setStatus('checking', 'Connecting to Hermes…');
    try {
      const result = await window.api.fetchUrl(this.hermesUrl + '/health');
      if (result.status === 200 || result.content?.includes('ok') || result.content?.includes('healthy')) {
        this.isConnected = true;
        this.setStatus('connected', 'Hermes Agent running');
        this.loadSessions();
        document.getElementById('hermes-start-instructions')?.classList.add('hidden');
      } else {
        throw new Error('Not healthy');
      }
    } catch (e) {
      this.isConnected = false;
      this.setStatus('disconnected', 'Hermes not running');
      document.getElementById('hermes-start-instructions')?.classList.remove('hidden');
    }
  }

  setStatus(state, label) {
    const dot  = document.getElementById('hermes-status-dot');
    const text = document.getElementById('hermes-status-text');
    if (dot)  dot.className = `n8n-status-dot ${state}`;
    if (text) text.textContent = label;
  }

  // ── Sessions (agents) ──
  async loadSessions() {
    if (!this.isConnected) return;
    try {
      const result = await window.api.fetchUrl(this.hermesUrl + '/api/sessions');
      if (result.content && !result.error) {
        const data = JSON.parse(result.content);
        this.sessions = Array.isArray(data) ? data : (data.sessions || []);
        this.renderSessionsList();
        this.renderAgentsPanel();
      }
    } catch (e) {
      this.renderSessionsError(e.message);
    }
  }

  async createSession() {
    if (!this.isConnected) { alert('Hermes is not running.'); return; }
    try {
      const result = await window.api.fetchUrl(this.hermesUrl + '/api/sessions');
      // POST not directly available via fetchUrl, open in browser
      window.api.openExternal(this.hermesUrl);
    } catch (_) {}
  }

  renderSessionsList() {
    const list = document.getElementById('hermes-sessions-list');
    if (!list) return;

    if (!this.sessions.length) {
      list.innerHTML = `<div class="hermes-empty">No sessions. <button class="btn-link" onclick="window.api.openExternal('${this.hermesUrl}')">Open Hermes</button> to create one.</div>`;
      return;
    }

    list.innerHTML = '';
    this.sessions.forEach(s => {
      const item = document.createElement('div');
      item.className = `hermes-session-item${s.id === this.activeSessionId ? ' active' : ''}`;
      item.innerHTML = `
        <div class="hermes-session-name">${this.esc(s.name || s.id || 'Session')}</div>
        <div class="hermes-session-meta">
          ${s.model ? `<span class="hermes-model-tag">${this.esc(s.model)}</span>` : ''}
          ${s.message_count ? `<span>${s.message_count} msgs</span>` : ''}
          ${s.updated_at ? `<span>${this.fmtDate(s.updated_at)}</span>` : ''}
        </div>`;
      item.addEventListener('click', () => {
        this.activeSessionId = s.id;
        this.renderSessionsList();
        document.querySelector('.hermes-inner-tab[data-panel="chat"]').click();
      });
      list.appendChild(item);
    });
  }

  renderSessionsError(msg) {
    const el = document.getElementById('hermes-sessions-list');
    if (el) el.innerHTML = `<div class="hermes-empty" style="color:var(--red)">${this.esc(msg)}</div>`;
  }

  renderAgentsPanel() {
    const grid = document.getElementById('hermes-agents-grid');
    if (!grid) return;

    if (!this.sessions.length) {
      grid.innerHTML = `<div class="hermes-empty">No Hermes agent sessions found.</div>`;
      return;
    }

    grid.innerHTML = this.sessions.map((s, i) => {
      const colors = ['#cc785c','#5b8dd9','#3fc56b','#c792ea','#e9b143','#e06c75'];
      const color  = colors[i % colors.length];
      const name   = s.name || `Agent ${i + 1}`;
      const isActive = s.id === this.activeSessionId;

      return `
        <div class="hermes-agent-card${isActive ? ' active' : ''}" data-id="${s.id}" onclick="window.hermesManager.selectSession('${s.id}')">
          <div class="hermes-agent-avatar" style="background:${color}20;border-color:${color}40">
            <span style="color:${color}">H</span>
          </div>
          <div class="hermes-agent-info">
            <div class="hermes-agent-name">${this.esc(name)}</div>
            ${s.model ? `<div class="hermes-agent-model">${this.esc(s.model)}</div>` : ''}
            <div class="hermes-agent-stats">
              ${s.message_count || 0} messages ·
              ${s.tool_calls || 0} tool calls
            </div>
          </div>
          <div class="hermes-agent-actions">
            <button class="btn-ghost" onclick="event.stopPropagation(); window.hermesManager.openInBrowser('${s.id}')">Open</button>
            <button class="btn-ghost" onclick="event.stopPropagation(); window.hermesManager.importSession('${s.id}')">→ Chat</button>
          </div>
        </div>`;
    }).join('');
  }

  selectSession(id) {
    this.activeSessionId = id;
    this.renderAgentsPanel();
    document.querySelector('.hermes-inner-tab[data-panel="chat"]').click();
  }

  openInBrowser(sessionId) {
    window.api.openExternal(`${this.hermesUrl}?session=${sessionId}`);
  }

  // ── Chat with Hermes via SSE ──
  renderChatPanel() {
    const titleEl = document.getElementById('hermes-chat-session-label');
    const session = this.sessions.find(s => s.id === this.activeSessionId);
    if (titleEl) titleEl.textContent = session ? (session.name || 'Session') : 'No session selected';
  }

  async sendMessage() {
    if (!this.isConnected) { alert('Hermes is not running.'); return; }
    if (!this.activeSessionId) { alert('Select a session from the Agents panel first.'); return; }

    const input = document.getElementById('hermes-chat-input');
    const text  = input.value.trim();
    if (!text) return;
    input.value = '';

    const messages = document.getElementById('hermes-messages');

    // User bubble
    const userEl = document.createElement('div');
    userEl.className = 'msg-wrapper user';
    userEl.innerHTML = `<div class="msg-bubble">${this.esc(text)}</div>`;
    messages.appendChild(userEl);
    messages.scrollTop = messages.scrollHeight;

    // Assistant placeholder
    const aiEl = document.createElement('div');
    aiEl.className = 'msg-wrapper assistant';
    aiEl.innerHTML = `
      <div class="msg-assistant-inner">
        <div class="msg-avatar" style="background:#aa5533">H</div>
        <div class="msg-content">
          <div class="msg-meta"><span>Hermes Agent</span></div>
          <div class="msg-body stream-cursor"></div>
        </div>
      </div>`;
    messages.appendChild(aiEl);
    messages.scrollTop = messages.scrollHeight;

    const body = aiEl.querySelector('.msg-body');
    let fullText = '';

    // Try SSE streaming via the Hermes /api/message endpoint
    // Since we can't do real SSE from renderer without the main process, we simulate
    // by polling or using a single POST to /api/chat/start
    try {
      // Hermes uses POST /api/message with SSE response
      // We'll fetch via main process and stream chunks
      const payload = JSON.stringify({
        message: text,
        session_id: this.activeSessionId,
      });

      // For now do a single fetch and display result
      const result = await window.api.fetchUrl(`${this.hermesUrl}/api/message`);

      if (result.error) throw new Error(result.error);

      // Parse SSE chunks from the response
      const lines = (result.content || '').split('\n');
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6));
            if (data.type === 'token' || data.type === 'text') {
              fullText += data.content || data.text || '';
            } else if (data.type === 'done') {
              break;
            } else if (data.content) {
              fullText += data.content;
            }
          } catch (_) {
            const raw = line.slice(6).trim();
            if (raw && raw !== '[DONE]') fullText += raw;
          }
        }
      }

      body.innerHTML = marked.parse(fullText || '(No response — open Hermes in browser to chat directly)');
      body.classList.remove('stream-cursor');

    } catch (e) {
      body.innerHTML = `<p style="color:var(--text-muted)">Direct SSE streaming requires Hermes running locally.<br>
        <button class="btn-ghost" style="margin-top:6px" onclick="window.api.openExternal('${this.hermesUrl}')">Open Hermes WebUI →</button>
      </p>`;
      body.classList.remove('stream-cursor');
    }

    messages.scrollTop = messages.scrollHeight;
  }

  importSession(sessionId) {
    const session = this.sessions.find(s => s.id === sessionId);
    if (!session) return;
    const ctx = `[Hermes Agent Session: ${session.name || sessionId}]\nModel: ${session.model || 'default'}\nMessages: ${session.message_count || 0}`;
    document.getElementById('chat-input').value = `Context from Hermes session:\n${ctx}\n\nContinuing from here: `;
    window.chatManager?.autoResize();
    document.querySelector('[data-tab="chat"]').click();
    document.getElementById('chat-input').focus();
  }

  importToChat() {
    if (!this.activeSessionId) return;
    this.importSession(this.activeSessionId);
  }

  // ── Embed ──
  loadEmbed() {
    const webview = document.getElementById('hermes-webview');
    if (webview) {
      webview.src = this.isConnected ? this.hermesUrl : 'about:blank';
    }
  }

  // ── Helpers ──
  fmtDate(iso) {
    try { return new Date(iso).toLocaleDateString([], { month: 'short', day: 'numeric' }); }
    catch { return ''; }
  }
  esc(s) { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
}
