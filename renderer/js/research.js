// ── Deep Research / DeepWiki-style manager ── //
export class ResearchManager {
  constructor(chatManager) {
    this.chatManager = chatManager;
    this.sessions = this.loadSessions();
    this.currentSession = null;
    this.currentContext = null;

    this.wire();
    this.renderSessionsList();
  }

  // ── Persistence ──
  loadSessions() {
    try { return JSON.parse(localStorage.getItem('researchSessions') || '[]'); } catch { return []; }
  }
  saveSessions() { localStorage.setItem('researchSessions', JSON.stringify(this.sessions)); }

  getCurrentContext() { return this.currentContext; }

  // ── Wire up UI ──
  wire() {
    document.getElementById('btn-research-go').addEventListener('click', () => {
      const url = document.getElementById('research-url-input').value.trim();
      if (url) this.startResearch(url);
    });

    document.getElementById('research-url-input').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') document.getElementById('btn-research-go').click();
    });

    document.getElementById('btn-new-research').addEventListener('click', () => {
      document.getElementById('research-url-input').value = '';
      document.getElementById('research-url-input').focus();
      this.showEmptyState();
    });

    document.getElementById('btn-research-send').addEventListener('click', () => {
      this.sendResearchMessage();
    });

    document.getElementById('research-input').addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); this.sendResearchMessage(); }
    });

    // Suggestion chips
    document.querySelectorAll('#research-empty-state .suggestion-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const url = chip.dataset.url;
        document.getElementById('research-url-input').value = url === 'topic' ? '' : url;
        if (url !== 'topic') this.startResearch(url);
        else document.getElementById('research-url-input').focus();
      });
    });
  }

  // ── Start research on a URL or topic ──
  async startResearch(input) {
    const goBtn = document.getElementById('btn-research-go');
    goBtn.textContent = 'Loading…';
    goBtn.disabled = true;

    let url = input;
    // Add protocol if missing
    if (!url.startsWith('http://') && !url.startsWith('https://') && !url.includes(' ')) {
      url = 'https://' + url;
    }

    let content = '';
    let title = input;
    let isTopic = input.includes(' ') || !input.includes('.');

    if (!isTopic) {
      // Fetch the URL
      let result = await window.api.fetchUrl(url);

      // Follow single redirect
      if (result.redirect) {
        result = await window.api.fetchUrl(result.redirect);
      }

      if (result.error) {
        this.showError(`Could not fetch "${url}": ${result.error}`);
        goBtn.textContent = 'Dive';
        goBtn.disabled = false;
        return;
      }

      content = result.content;
      title = this.extractTitle(content) || url;
    }

    // Extract readable text
    const text = isTopic
      ? `Research topic: ${input}`
      : this.extractText(content);

    const summary = text.slice(0, 6000);

    // Create session
    const session = {
      id: Date.now().toString(),
      title: title.slice(0, 60),
      url: isTopic ? null : url,
      summary,
      messages: [],
      ts: Date.now(),
    };

    this.sessions.unshift(session);
    if (this.sessions.length > 50) this.sessions.pop();
    this.saveSessions();

    this.currentSession = session;
    this.currentContext = { title: session.title, summary };

    this.renderSessionsList();
    this.showDocView(session, summary, isTopic ? input : url);
    this.showChatArea();

    // Auto-summarize with AI
    await this.autoSummarize(session, summary, isTopic ? input : url);

    goBtn.textContent = 'Dive';
    goBtn.disabled = false;
  }

  async autoSummarize(session, text, source) {
    const messagesEl = document.getElementById('research-messages');

    const loadEl = document.createElement('div');
    loadEl.className = 'msg-wrapper assistant';
    loadEl.innerHTML = `
      <div class="msg-assistant-inner">
        <div class="msg-avatar">C</div>
        <div class="thinking-indicator">
          <div class="thinking-dots"><span></span><span></span><span></span></div>
          Analyzing…
        </div>
      </div>`;
    messagesEl.appendChild(loadEl);

    const prompt = `You are a research assistant. I've loaded the following content from "${source}".
Please provide a structured summary with:
1. Main topic / purpose
2. Key points (bullet list)
3. Notable details or findings
4. Questions worth exploring further

Content:
${text.slice(0, 4000)}`;

    // Use whatever the active provider is
    const account = window.usageManager?.getActiveAccount();
    let responseText = '';

    const cleanup1 = window.api.onClaudeStream((msg) => {
      if (msg.type === 'content_block_delta' && msg.delta?.type === 'text_delta') {
        responseText += msg.delta.text;
        const body = loadEl.querySelector('.thinking-indicator, .msg-body');
        if (body) {
          body.className = 'msg-body';
          body.innerHTML = marked.parse(responseText);
        }
        messagesEl.scrollTop = messagesEl.scrollHeight;
      }
    });

    const cleanup2 = window.api.onClaudeDone(() => {
      cleanup1(); cleanup2();
      // Save to session
      session.messages.push({ role: 'assistant', content: responseText });
      this.saveSessions();
    });

    try {
      await this.sendToProvider(prompt, account, session);
    } catch (e) {
      loadEl.querySelector('.msg-assistant-inner').innerHTML += `<p style="color:var(--red);font-size:12px">Could not summarize: ${e.message || 'unknown error'}</p>`;
      cleanup1(); cleanup2();
    }
  }

  async sendResearchMessage() {
    if (!this.currentSession) return;
    const input = document.getElementById('research-input');
    const text = input.value.trim();
    if (!text) return;

    input.value = '';
    const messagesEl = document.getElementById('research-messages');

    // User bubble
    const userEl = document.createElement('div');
    userEl.className = 'msg-wrapper user';
    userEl.innerHTML = `<div class="msg-bubble">${this.esc(text)}</div>`;
    messagesEl.appendChild(userEl);
    messagesEl.scrollTop = messagesEl.scrollHeight;

    this.currentSession.messages.push({ role: 'user', content: text });

    // Assistant response
    const aiEl = document.createElement('div');
    aiEl.className = 'msg-wrapper assistant';
    aiEl.innerHTML = `
      <div class="msg-assistant-inner">
        <div class="msg-avatar">C</div>
        <div class="thinking-indicator">
          <div class="thinking-dots"><span></span><span></span><span></span></div>
          Thinking…
        </div>
      </div>`;
    messagesEl.appendChild(aiEl);
    messagesEl.scrollTop = messagesEl.scrollHeight;

    const contextPrompt = `You are a research assistant helping the user understand content from "${this.currentSession.url || this.currentSession.title}".

Research context (first 3000 chars):
${this.currentSession.summary.slice(0, 3000)}

Conversation so far:
${this.currentSession.messages.slice(-6).map(m => `${m.role}: ${m.content}`).join('\n')}

User question: ${text}

Answer based on the research context above. Be specific and cite relevant parts.`;

    let responseText = '';
    const account = window.usageManager?.getActiveAccount();

    const cleanup1 = window.api.onClaudeStream((msg) => {
      if (msg.type === 'content_block_delta' && msg.delta?.type === 'text_delta') {
        responseText += msg.delta.text;
        const inner = aiEl.querySelector('.msg-assistant-inner');
        if (inner) {
          inner.innerHTML = `
            <div class="msg-avatar">C</div>
            <div class="msg-content">
              <div class="msg-body stream-cursor">${marked.parse(responseText)}</div>
            </div>`;
        }
        messagesEl.scrollTop = messagesEl.scrollHeight;
      }
    });

    const cleanup2 = window.api.onClaudeDone(() => {
      cleanup1(); cleanup2();
      aiEl.querySelector('.msg-body')?.classList.remove('stream-cursor');
      this.currentSession.messages.push({ role: 'assistant', content: responseText });
      this.saveSessions();
    });

    try {
      await this.sendToProvider(contextPrompt, account, this.currentSession);
    } catch (e) {
      cleanup1(); cleanup2();
    }
  }

  async sendToProvider(prompt, account, session) {
    if (!account || account.provider === 'anthropic') {
      return window.api.claudeSend({ prompt, apiKey: account?.key, cwd: null });
    } else if (account.provider === 'openai') {
      return window.api.openaiSend({ prompt, apiKey: account.key, model: account.model });
    } else if (account.provider === 'google') {
      return window.api.geminiSend({ prompt, apiKey: account.key, model: account.model });
    } else if (account.provider === 'openrouter') {
      return window.api.openrouterSend({ prompt, apiKey: account.key, model: account.model });
    } else if (account.provider === 'github') {
      return window.api.githubSend({ prompt, apiKey: account.key, model: account.model });
    }
  }

  // ── UI helpers ──
  showEmptyState() {
    document.getElementById('research-empty-state').classList.remove('hidden');
    document.getElementById('research-doc-view').classList.add('hidden');
    document.getElementById('research-chat-area').classList.add('hidden');
  }

  showDocView(session, text, source) {
    document.getElementById('research-empty-state').classList.add('hidden');
    const docView = document.getElementById('research-doc-view');
    docView.classList.remove('hidden');

    document.getElementById('research-doc-title').textContent = session.title;
    document.getElementById('research-doc-meta').textContent = source + ' · ' + new Date(session.ts).toLocaleString();

    // Render extracted text as markdown-ish
    const html = this.renderExtractedText(text);
    document.getElementById('research-doc-body').innerHTML = html;
  }

  showChatArea() {
    const area = document.getElementById('research-chat-area');
    area.classList.remove('hidden');
    document.getElementById('research-messages').innerHTML = '';
  }

  showError(msg) {
    document.getElementById('research-doc-view').classList.remove('hidden');
    document.getElementById('research-empty-state').classList.add('hidden');
    document.getElementById('research-doc-title').textContent = 'Error';
    document.getElementById('research-doc-body').innerHTML = `<p style="color:var(--red)">${this.esc(msg)}</p>`;
  }

  renderSessionsList() {
    const list = document.getElementById('research-sessions-list');
    if (!this.sessions.length) {
      list.innerHTML = `<div style="font-size:11px;color:var(--text-muted);text-align:center;padding:12px">No sessions yet</div>`;
      return;
    }
    list.innerHTML = '';
    this.sessions.slice(0, 20).forEach(s => {
      const el = document.createElement('div');
      el.className = `research-session-item${s.id === this.currentSession?.id ? ' active' : ''}`;
      el.textContent = s.title;
      el.title = s.url || s.title;
      el.addEventListener('click', () => {
        this.currentSession = s;
        this.currentContext = { title: s.title, summary: s.summary };
        this.showDocView(s, s.summary, s.url || s.title);
        this.showChatArea();
        s.messages.forEach(m => this.renderSavedMessage(m));
        this.renderSessionsList();
      });
      list.appendChild(el);
    });
  }

  renderSavedMessage(msg) {
    const el = document.createElement('div');
    el.className = `msg-wrapper ${msg.role}`;
    if (msg.role === 'user') {
      el.innerHTML = `<div class="msg-bubble">${this.esc(msg.content)}</div>`;
    } else {
      el.innerHTML = `
        <div class="msg-assistant-inner">
          <div class="msg-avatar">C</div>
          <div class="msg-content"><div class="msg-body">${marked.parse(msg.content)}</div></div>
        </div>`;
    }
    document.getElementById('research-messages').appendChild(el);
  }

  // ── Text extraction from HTML ──
  extractTitle(html) {
    const m = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    return m ? m[1].trim() : '';
  }

  extractText(html) {
    // Strip scripts, styles, nav, header, footer
    let text = html
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<nav[\s\S]*?<\/nav>/gi, '')
      .replace(/<header[\s\S]*?<\/header>/gi, '')
      .replace(/<footer[\s\S]*?<\/footer>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\s{3,}/g, '\n\n')
      .trim();
    return text;
  }

  renderExtractedText(text) {
    // Simple: wrap paragraphs, highlight code-like blocks
    const paras = text.split(/\n\n+/).slice(0, 80);
    return paras.map(p => {
      p = p.trim();
      if (!p) return '';
      if (p.length < 3) return '';
      return `<p>${this.esc(p)}</p>`;
    }).join('');
  }

  esc(str) {
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }
}
