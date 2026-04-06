/* ============================================================
   ClaudeCodex — NotebookManager (NotebookLM-style)
   ============================================================ */

class NotebookManager {
  constructor() {
    this.storageKey = 'claudecodex_notebooks';
    this.notebooks = this._load();
    this.currentId = null;
    this._init();
  }

  /* ---------- persistence ---------- */
  _load() {
    try { return JSON.parse(localStorage.getItem(this.storageKey)) || []; }
    catch { return []; }
  }
  _save() {
    localStorage.setItem(this.storageKey, JSON.stringify(this.notebooks));
  }
  _find(id) { return this.notebooks.find(n => n.id === id); }
  _generateId() { return Math.random().toString(16).slice(2, 10); }

  /* ---------- active API key ---------- */
  _getActiveApiKey() {
    try {
      const accounts = JSON.parse(localStorage.getItem('claudecodex_accounts')) || [];
      const active = accounts.find(a => a.active) || accounts[0];
      return active ? active.apiKey : null;
    } catch { return null; }
  }

  /* ---------- init ---------- */
  _init() {
    this._renderSidebar();
    this._bindGlobal();
  }

  _bindGlobal() {
    const $ = id => document.getElementById(id);

    // New notebook buttons
    const newBtn = $('btn-new-notebook');
    const newBtnMain = $('btn-new-notebook-main');
    if (newBtn) newBtn.addEventListener('click', () => this.createNotebook());
    if (newBtnMain) newBtnMain.addEventListener('click', () => this.createNotebook());

    // Content tab switching
    document.querySelectorAll('.nb-content-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.nb-content-tab').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.nb-content-panel').forEach(p => p.classList.add('hidden'));
        btn.classList.add('active');
        const panel = $('nb-panel-' + btn.dataset.panel);
        if (panel) panel.classList.remove('hidden');
      });
    });

    // Source type switcher
    document.querySelectorAll('.nb-add-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.nb-add-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.nb-input-group').forEach(g => g.classList.add('hidden'));
        btn.classList.add('active');
        const group = $('nb-input-' + btn.dataset.type);
        if (group) group.classList.remove('hidden');
      });
    });

    // Source add actions
    $('btn-nb-fetch-url') && $('btn-nb-fetch-url').addEventListener('click', () => {
      const url = $('nb-url-input').value.trim();
      if (url) { this.addSourceUrl(url); $('nb-url-input').value = ''; }
    });

    $('btn-nb-add-text') && $('btn-nb-add-text').addEventListener('click', () => {
      const text = $('nb-text-input').value.trim();
      if (text) { this.addSourceText(text); $('nb-text-input').value = ''; }
    });

    const fileInput = $('nb-file-input');
    const fileDrop = $('nb-file-drop');
    if (fileDrop) fileDrop.addEventListener('click', () => fileInput && fileInput.click());
    if (fileInput) fileInput.addEventListener('change', e => {
      const file = e.target.files[0];
      if (file) this.addSourceFile(file);
    });

    $('btn-nb-add-youtube') && $('btn-nb-add-youtube').addEventListener('click', () => {
      const url = $('nb-youtube-input').value.trim();
      if (url) { this.addSourceYouTube(url); $('nb-youtube-input').value = ''; }
    });

    $('btn-nb-add-gdoc') && $('btn-nb-add-gdoc').addEventListener('click', () => {
      const url = $('nb-gdoc-input').value.trim();
      if (url) { this.addSourceGDoc(url); $('nb-gdoc-input').value = ''; }
    });

    // Chat send
    const chatInput = $('nb-chat-input');
    const sendBtn = $('btn-nb-send');
    if (sendBtn) sendBtn.addEventListener('click', () => this._submitChat());
    if (chatInput) chatInput.addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); this._submitChat(); }
    });

    // Generate buttons
    $('btn-generate-studyguide') && $('btn-generate-studyguide').addEventListener('click', () => this.generateStudyGuide());
    $('btn-generate-mindmap') && $('btn-generate-mindmap').addEventListener('click', () => this.generateMindMap());
    $('btn-generate-audio') && $('btn-generate-audio').addEventListener('click', () => this.generateAudioOverview());

    // Export / delete
    $('btn-notebook-export') && $('btn-notebook-export').addEventListener('click', () => this.exportNotebook());
    $('btn-notebook-delete') && $('btn-notebook-delete').addEventListener('click', () => {
      if (this.currentId && confirm('Delete this notebook?')) this.deleteNotebook(this.currentId);
    });

    // Title rename
    const titleInput = $('notebook-title-input');
    if (titleInput) titleInput.addEventListener('input', () => {
      const nb = this._find(this.currentId);
      if (nb) { nb.name = titleInput.value; this._save(); this._renderSidebar(); }
    });
  }

  /* ---------- sidebar ---------- */
  _renderSidebar() {
    const list = document.getElementById('notebooks-list');
    if (!list) return;
    list.innerHTML = '';
    if (!this.notebooks.length) {
      list.innerHTML = '<div style="padding:16px;font-size:12px;color:var(--text-muted)">No notebooks yet.</div>';
      return;
    }
    this.notebooks.slice().reverse().forEach(nb => {
      const item = document.createElement('div');
      item.className = 'notebook-list-item' + (nb.id === this.currentId ? ' active' : '');
      item.innerHTML = `
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
        <span class="nb-item-name">${this._esc(nb.name || 'Untitled')}</span>
        <span class="nb-item-date">${this._relDate(nb.created)}</span>
      `;
      item.addEventListener('click', () => this.openNotebook(nb.id));
      list.appendChild(item);
    });
  }

  /* ---------- CRUD ---------- */
  createNotebook() {
    const nb = {
      id: this._generateId(),
      name: 'Untitled Notebook',
      created: Date.now(),
      sources: [],
      chats: [],
      studyGuide: null,
      mindMap: null,
      audioOverview: null
    };
    this.notebooks.push(nb);
    this._save();
    this._renderSidebar();
    this.openNotebook(nb.id);
  }

  openNotebook(id) {
    this.currentId = id;
    const nb = this._find(id);
    if (!nb) return;

    const ws = document.getElementById('notebook-workspace');
    const empty = document.getElementById('notebooks-empty-state');
    if (ws) ws.classList.remove('hidden');
    if (empty) empty.style.display = 'none';

    const titleInput = document.getElementById('notebook-title-input');
    if (titleInput) titleInput.value = nb.name || '';

    this._renderSidebar();
    this.renderSourcesList();
    this._renderChatHistory();

    // Reset study guide
    const sgContent = document.getElementById('nb-studyguide-content');
    const sgEmpty = document.getElementById('nb-studyguide-empty');
    if (nb.studyGuide) {
      if (sgContent) sgContent.classList.remove('hidden');
      if (sgEmpty) sgEmpty.classList.add('hidden');
      this._renderStudyGuide(nb.studyGuide);
    } else {
      if (sgContent) sgContent.classList.add('hidden');
      if (sgEmpty) sgEmpty.classList.remove('hidden');
    }

    // Reset mind map
    const mmContainer = document.getElementById('nb-mindmap-svg-container');
    const mmEmpty = document.getElementById('nb-mindmap-empty');
    if (nb.mindMap && mmContainer) {
      mmContainer.innerHTML = this._buildMindMapSVG(nb.mindMap);
      if (mmEmpty) mmEmpty.classList.add('hidden');
    } else {
      if (mmContainer) mmContainer.innerHTML = '';
      if (mmEmpty) mmEmpty.classList.remove('hidden');
    }

    // Reset audio
    const audioTranscript = document.getElementById('nb-audio-transcript');
    const audioEmpty = document.getElementById('nb-audio-empty');
    if (nb.audioOverview && nb.audioOverview.length && audioTranscript) {
      audioTranscript.innerHTML = '';
      nb.audioOverview.forEach(turn => audioTranscript.appendChild(this._buildAudioTurn(turn)));
      if (audioEmpty) audioEmpty.classList.add('hidden');
    } else {
      if (audioTranscript) audioTranscript.innerHTML = '';
      if (audioEmpty) audioEmpty.classList.remove('hidden');
    }
  }

  deleteNotebook(id) {
    this.notebooks = this.notebooks.filter(n => n.id !== id);
    this._save();
    this.currentId = null;
    this._renderSidebar();
    const ws = document.getElementById('notebook-workspace');
    const empty = document.getElementById('notebooks-empty-state');
    if (ws) ws.classList.add('hidden');
    if (empty) empty.style.display = '';
  }

  /* ---------- sources ---------- */
  async addSourceUrl(url) {
    if (!this.currentId) return;
    const nb = this._find(this.currentId);
    const srcId = this._generateId();
    // Add a pending placeholder immediately so the user sees it
    nb.sources.push({ id: srcId, type: 'url', title: url, content: '[Loading…]', url, pending: true });
    this._save();
    this.renderSourcesList();

    try {
      const result = await window.api.fetchUrl(url);
      const src = nb.sources.find(s => s.id === srcId);
      if (!src) return;
      if (result.error) {
        src.content = '[Error fetching URL: ' + result.error + ']';
      } else {
        // Extract title from HTML if available
        const titleMatch = result.content?.match(/<title[^>]*>([^<]+)<\/title>/i);
        if (titleMatch) src.title = titleMatch[1].trim().slice(0, 80);
        // Strip HTML tags for plain text content
        src.content = (result.content || '')
          .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
          .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
          .replace(/<[^>]+>/g, ' ')
          .replace(/\s{2,}/g, ' ')
          .trim()
          .slice(0, 8000);
      }
      src.pending = false;
    } catch (e) {
      const src = nb.sources.find(s => s.id === srcId);
      if (src) { src.content = '[Error: ' + (e.message || String(e)) + ']'; src.pending = false; }
    }
    this._save();
    this.renderSourcesList();
  }

  addSourceText(text) {
    if (!this.currentId) return;
    const nb = this._find(this.currentId);
    nb.sources.push({ id: this._generateId(), type: 'text', title: 'Text snippet', content: text });
    this._save();
    this.renderSourcesList();
  }

  addSourceFile(file) {
    if (!this.currentId) return;
    const reader = new FileReader();
    reader.onload = e => {
      const nb = this._find(this.currentId);
      const content = file.type === 'application/pdf'
        ? '[PDF content: ' + file.name + '] — PDF text extraction requires a backend service.'
        : e.target.result;
      nb.sources.push({ id: this._generateId(), type: 'file', title: file.name, content });
      this._save();
      this.renderSourcesList();
    };
    if (file.type === 'application/pdf') reader.readAsDataURL(file);
    else reader.readAsText(file);
  }

  addSourceYouTube(url) {
    if (!this.currentId) return;
    const match = url.match(/(?:v=|youtu\.be\/)([A-Za-z0-9_-]{11})/);
    const videoId = match ? match[1] : url;
    const nb = this._find(this.currentId);
    nb.sources.push({ id: this._generateId(), type: 'youtube', title: 'YouTube: ' + videoId, content: '[YouTube transcript: ' + videoId + '] — Transcript extraction requires YouTube API access.', url });
    this._save();
    this.renderSourcesList();
  }

  addSourceGDoc(url) {
    if (!this.currentId) return;
    const nb = this._find(this.currentId);
    nb.sources.push({ id: this._generateId(), type: 'gdoc', title: 'Google Doc', content: '[Google Doc: ' + url + '] — Content requires Google Docs API access.', url });
    this._save();
    this.renderSourcesList();
  }

  deleteSource(sourceId) {
    const nb = this._find(this.currentId);
    if (!nb) return;
    nb.sources = nb.sources.filter(s => s.id !== sourceId);
    this._save();
    this.renderSourcesList();
  }

  renderSourcesList() {
    const list = document.getElementById('nb-sources-list');
    const count = document.getElementById('nb-source-count');
    if (!list) return;
    const nb = this._find(this.currentId);
    const sources = nb ? nb.sources : [];
    if (count) count.textContent = sources.length;

    list.innerHTML = '';
    sources.forEach((src, idx) => {
      const card = document.createElement('div');
      card.className = 'nb-source-card';
      card.dataset.sourceId = src.id;
      const icons = { url: '🌐', text: '📄', file: '📁', youtube: '🎥', gdoc: '📋' };
      const snippet = src.content.replace(/\[.*?\]/g, '').trim().slice(0, 80) || src.title;
      card.innerHTML = `
        <div class="nb-source-card-header">
          <span class="nb-source-icon">${icons[src.type] || '📄'}</span>
          <span class="nb-source-title" title="${this._esc(src.title)}">${this._esc(src.title)}</span>
          <button class="nb-source-delete" title="Remove source">✕</button>
        </div>
        <div class="nb-source-snippet">${this._esc(snippet)}…</div>
      `;
      card.querySelector('.nb-source-delete').addEventListener('click', e => {
        e.stopPropagation();
        this.deleteSource(src.id);
      });
      list.appendChild(card);
    });

    // Update chat empty state
    const chatEmpty = document.getElementById('nb-chat-empty');
    if (chatEmpty) chatEmpty.style.display = sources.length ? 'none' : '';
  }

  /* ---------- chat ---------- */
  _renderChatHistory() {
    const msgs = document.getElementById('nb-chat-messages');
    if (!msgs) return;
    msgs.innerHTML = '';
    const nb = this._find(this.currentId);
    if (!nb) return;
    nb.chats.forEach(msg => msgs.appendChild(this._buildMessageEl(msg)));
    msgs.scrollTop = msgs.scrollHeight;
  }

  _submitChat() {
    const input = document.getElementById('nb-chat-input');
    if (!input) return;
    const question = input.value.trim();
    if (!question || !this.currentId) return;
    input.value = '';
    this.sendChatMessage(question);
  }

  async sendChatMessage(question) {
    const nb = this._find(this.currentId);
    if (!nb) return;

    const msgs = document.getElementById('nb-chat-messages');
    const chatEmpty = document.getElementById('nb-chat-empty');
    if (chatEmpty) chatEmpty.style.display = 'none';

    // User bubble
    const userMsg = { role: 'user', content: question, citations: [] };
    nb.chats.push(userMsg);
    if (msgs) msgs.appendChild(this._buildMessageEl(userMsg));

    // Loading bubble
    const loadingEl = document.createElement('div');
    loadingEl.className = 'nb-loading';
    loadingEl.textContent = 'Searching sources…';
    if (msgs) msgs.appendChild(loadingEl);
    if (msgs) msgs.scrollTop = msgs.scrollHeight;

    const sourcesText = nb.sources.map((s, i) => `[Source ${i+1}] ${s.title}:\n${s.content}`).join('\n\n---\n\n');

    let answer = '';
    let citations = [];
    const apiKey = this._getActiveApiKey();

    if (apiKey && nb.sources.length) {
      try {
        const resp = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01'
          },
          body: JSON.stringify({
            model: 'claude-sonnet-4-6',
            max_tokens: 1024,
            system: 'Answer ONLY based on the provided sources. Cite sources inline as [Source 1], [Source 2], etc. If the answer is not in the sources, say so.',
            messages: [{
              role: 'user',
              content: question + '\n\nSources:\n' + sourcesText
            }]
          })
        });
        const data = await resp.json();
        answer = data.content && data.content[0] ? data.content[0].text : 'No response received.';
        // Parse citation indices
        const citMatches = answer.matchAll(/\[Source (\d+)\]/g);
        const seen = new Set();
        for (const m of citMatches) {
          const idx = parseInt(m[1]) - 1;
          if (!seen.has(idx) && nb.sources[idx]) { seen.add(idx); citations.push(idx); }
        }
      } catch (err) {
        answer = 'Error contacting API: ' + err.message;
      }
    } else if (nb.sources.length) {
      // Keyword fallback
      const words = question.toLowerCase().split(/\s+/).filter(w => w.length > 3);
      const results = [];
      nb.sources.forEach((src, idx) => {
        const lower = src.content.toLowerCase();
        const hits = words.filter(w => lower.includes(w)).length;
        if (hits > 0) results.push({ idx, hits, src });
      });
      results.sort((a, b) => b.hits - a.hits);
      if (results.length) {
        const top = results.slice(0, 2);
        answer = top.map(r => {
          const sentences = r.src.content.split(/[.!?]+/).filter(s => {
            const sl = s.toLowerCase();
            return words.some(w => sl.includes(w));
          });
          const excerpt = sentences.slice(0, 2).join('. ').trim();
          citations.push(r.idx);
          return `[Source ${r.idx + 1}] ${excerpt || r.src.content.slice(0, 120)}`;
        }).join('\n\n');
      } else {
        answer = 'No relevant content found in your sources for this question.';
      }
    } else {
      answer = 'Add sources to your notebook first, then ask questions about them.';
    }

    if (loadingEl.parentNode) loadingEl.parentNode.removeChild(loadingEl);

    const assistantMsg = { role: 'assistant', content: answer, citations };
    nb.chats.push(assistantMsg);
    this._save();
    if (msgs) {
      msgs.appendChild(this._buildMessageEl(assistantMsg));
      msgs.scrollTop = msgs.scrollHeight;
    }
  }

  _buildMessageEl(msg) {
    const wrap = document.createElement('div');
    wrap.className = 'nb-message ' + (msg.role === 'user' ? 'user' : 'assistant');
    let html = msg.content;
    // Convert [Source N] to citation spans
    html = html.replace(/\[Source (\d+)\]/g, (_, n) => {
      const idx = parseInt(n) - 1;
      return `<span class="nb-citation" data-source-idx="${idx}" title="Source ${n}">${n}</span>`;
    });
    wrap.innerHTML = `<div class="nb-message-bubble">${html.replace(/\n/g, '<br>')}</div>`;
    // Citation click highlights source card
    wrap.querySelectorAll('.nb-citation').forEach(cite => {
      cite.addEventListener('click', () => {
        const idx = parseInt(cite.dataset.sourceIdx);
        const cards = document.querySelectorAll('.nb-source-card');
        cards.forEach(c => c.classList.remove('highlighted'));
        if (cards[idx]) {
          cards[idx].classList.add('highlighted');
          cards[idx].scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          setTimeout(() => cards[idx].classList.remove('highlighted'), 2000);
        }
      });
    });
    return wrap;
  }

  /* ---------- Study Guide ---------- */
  async generateStudyGuide() {
    const nb = this._find(this.currentId);
    if (!nb) return;
    if (!nb.sources.length) { alert('Add sources first.'); return; }

    const sgContent = document.getElementById('nb-studyguide-content');
    const sgEmpty = document.getElementById('nb-studyguide-empty');
    if (sgEmpty) sgEmpty.classList.add('hidden');
    if (sgContent) { sgContent.classList.remove('hidden'); sgContent.innerHTML = '<div class="nb-loading">Generating study guide…</div>'; }

    const sourcesText = nb.sources.map((s, i) => `[Source ${i+1}] ${s.title}:\n${s.content}`).join('\n\n---\n\n');
    let guide = null;
    const apiKey = this._getActiveApiKey();

    if (apiKey) {
      try {
        const resp = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
          body: JSON.stringify({
            model: 'claude-sonnet-4-6',
            max_tokens: 2048,
            messages: [{
              role: 'user',
              content: `Based on these sources, generate a study guide as JSON with this exact structure:
{"summary":"one paragraph summary","keyTopics":["topic1","topic2"],"glossary":[{"term":"word","definition":"meaning"}],"faqs":[{"question":"q","answer":"a"}]}

Return ONLY valid JSON, no markdown.

Sources:\n${sourcesText}`
            }]
          })
        });
        const data = await resp.json();
        const raw = data.content && data.content[0] ? data.content[0].text : '{}';
        const jsonMatch = raw.match(/\{[\s\S]*\}/);
        guide = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
      } catch (e) { guide = null; }
    }

    if (!guide) {
      // Fallback: generate from source content
      const allContent = nb.sources.map(s => s.content).join(' ');
      const firstPara = allContent.slice(0, 300).replace(/\[.*?\]/g, '').trim();
      const words = allContent.match(/\b[A-Z][a-z]{4,}\b/g) || [];
      const uniqueWords = [...new Set(words)].slice(0, 6);
      guide = {
        summary: firstPara || 'Summary generated from ' + nb.sources.length + ' source(s).',
        keyTopics: uniqueWords.length ? uniqueWords : nb.sources.map(s => s.title),
        glossary: nb.sources.slice(0, 3).map(s => ({ term: s.title.slice(0, 20), definition: s.content.slice(0, 80).replace(/\[.*?\]/g, '').trim() })),
        faqs: [
          { question: 'What are the main topics covered?', answer: uniqueWords.join(', ') || 'See key topics above.' },
          { question: 'How many sources are included?', answer: nb.sources.length + ' source(s) in this notebook.' }
        ]
      };
    }

    nb.studyGuide = guide;
    this._save();
    if (sgContent) { sgContent.innerHTML = ''; this._renderStudyGuide(guide); }
  }

  _renderStudyGuide(guide) {
    const sgContent = document.getElementById('nb-studyguide-content');
    if (!sgContent) return;
    sgContent.classList.remove('hidden');
    sgContent.innerHTML = `
      <div class="nb-sg-section">
        <h4 class="nb-sg-heading">Summary</h4>
        <div id="nb-sg-summary">${this._esc(guide.summary || '')}</div>
      </div>
      <div class="nb-sg-section">
        <h4 class="nb-sg-heading">Key Topics</h4>
        <div id="nb-sg-topics" class="nb-topics-grid">
          ${(guide.keyTopics || []).map(t => `<span class="nb-topic-chip">${this._esc(t)}</span>`).join('')}
        </div>
      </div>
      <div class="nb-sg-section">
        <h4 class="nb-sg-heading">Glossary</h4>
        <table class="nb-glossary-table">
          <thead><tr><th>Term</th><th>Definition</th></tr></thead>
          <tbody>
            ${(guide.glossary || []).map(g => `<tr><td>${this._esc(g.term)}</td><td>${this._esc(g.definition)}</td></tr>`).join('')}
          </tbody>
        </table>
      </div>
      <div class="nb-sg-section">
        <h4 class="nb-sg-heading">FAQs</h4>
        <div class="nb-faqs-list">
          ${(guide.faqs || []).map(f => `
            <div class="nb-faq-item">
              <div class="nb-faq-q">Q: ${this._esc(f.question)}</div>
              <div class="nb-faq-a">${this._esc(f.answer)}</div>
            </div>`).join('')}
        </div>
      </div>
    `;
  }

  /* ---------- Mind Map ---------- */
  async generateMindMap() {
    const nb = this._find(this.currentId);
    if (!nb) return;
    if (!nb.sources.length) { alert('Add sources first.'); return; }

    const container = document.getElementById('nb-mindmap-svg-container');
    const mmEmpty = document.getElementById('nb-mindmap-empty');
    if (mmEmpty) mmEmpty.classList.add('hidden');
    if (container) container.innerHTML = '<div class="nb-loading">Generating mind map…</div>';

    const sourcesText = nb.sources.map((s, i) => `[Source ${i+1}] ${s.title}:\n${s.content.slice(0, 300)}`).join('\n\n');
    let mapData = null;
    const apiKey = this._getActiveApiKey();

    if (apiKey) {
      try {
        const resp = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
          body: JSON.stringify({
            model: 'claude-sonnet-4-6',
            max_tokens: 1024,
            messages: [{
              role: 'user',
              content: `Create a mind map from these sources. Return ONLY valid JSON:
{"center":"Main Topic","nodes":[{"id":"n1","label":"Subtopic","parentId":"center","depth":1},{"id":"n2","label":"Detail","parentId":"n1","depth":2}]}
Include 4-6 depth-1 nodes and 0-2 depth-2 nodes per branch.

Sources:\n${sourcesText}`
            }]
          })
        });
        const data = await resp.json();
        const raw = data.content && data.content[0] ? data.content[0].text : '{}';
        const jsonMatch = raw.match(/\{[\s\S]*\}/);
        mapData = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
      } catch { mapData = null; }
    }

    if (!mapData) {
      mapData = {
        center: nb.name || 'Main Topic',
        nodes: nb.sources.slice(0, 5).map((s, i) => ({ id: 'n' + i, label: s.title.slice(0, 20), parentId: 'center', depth: 1 }))
      };
    }

    nb.mindMap = mapData;
    this._save();
    if (container) container.innerHTML = this._buildMindMapSVG(mapData);
  }

  _buildMindMapSVG(data) {
    const W = 800, H = 600, cx = 400, cy = 300;
    const depth1 = data.nodes.filter(n => n.parentId === 'center');
    const depth2 = data.nodes.filter(n => n.depth === 2);
    const angleStep = (2 * Math.PI) / (depth1.length || 1);
    const r1 = 170;

    let lines = '', circles = '', labels = '';

    // Center
    circles += `<circle cx="${cx}" cy="${cy}" r="44" fill="#6c63ff"/>`;
    labels += `<text x="${cx}" y="${cy}" text-anchor="middle" dominant-baseline="middle" fill="white" font-size="13" font-weight="600">${this._svgText(data.center)}</text>`;

    const d1Pos = {};
    depth1.forEach((node, i) => {
      const angle = i * angleStep - Math.PI / 2;
      const nx = cx + r1 * Math.cos(angle);
      const ny = cy + r1 * Math.sin(angle);
      d1Pos[node.id] = { x: nx, y: ny, angle };

      lines += `<line x1="${cx}" y1="${cy}" x2="${nx}" y2="${ny}" stroke="rgba(108,99,255,0.35)" stroke-width="1.5"/>`;
      circles += `<circle cx="${nx}" cy="${ny}" r="32" fill="#1e2a4a" stroke="#6c63ff" stroke-width="1.5"/>`;
      labels += `<text x="${nx}" y="${ny}" text-anchor="middle" dominant-baseline="middle" fill="#e8e8f0" font-size="11">${this._svgText(node.label)}</text>`;
    });

    depth2.forEach(node => {
      const parent = d1Pos[node.parentId];
      if (!parent) return;
      const siblings = depth2.filter(n => n.parentId === node.parentId);
      const sibIdx   = siblings.indexOf(node);
      const spread   = Math.min(1.2, (Math.PI * 0.8) / Math.max(siblings.length, 1));
      const angle = parent.angle + (sibIdx - (siblings.length - 1) / 2) * spread;
      const nx = parent.x + 90 * Math.cos(angle);
      const ny = parent.y + 90 * Math.sin(angle);

      lines += `<line x1="${parent.x}" y1="${parent.y}" x2="${nx}" y2="${ny}" stroke="rgba(108,99,255,0.2)" stroke-width="1"/>`;
      circles += `<circle cx="${nx}" cy="${ny}" r="22" fill="#1e2a4a" stroke="rgba(108,99,255,0.4)" stroke-width="1"/>`;
      labels += `<text x="${nx}" y="${ny}" text-anchor="middle" dominant-baseline="middle" fill="#8888aa" font-size="10">${this._svgText(node.label)}</text>`;
    });

    return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="width:100%;max-height:500px">
      <rect width="${W}" height="${H}" fill="transparent"/>
      ${lines}${circles}${labels}
    </svg>`;
  }

  _svgText(str) {
    if (!str) return '';
    const s = String(str).slice(0, 18);
    return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  /* ---------- Podcast Transcript ---------- */
  async generateAudioOverview() {
    const nb = this._find(this.currentId);
    if (!nb) return;
    if (!nb.sources.length) { alert('Add sources first.'); return; }

    const transcript = document.getElementById('nb-audio-transcript');
    const audioEmpty = document.getElementById('nb-audio-empty');
    if (audioEmpty) audioEmpty.classList.add('hidden');
    if (transcript) transcript.innerHTML = '<div class="nb-loading">Writing podcast dialogue…</div>';

    const sourcesText = nb.sources.map((s, i) => `[Source ${i+1}] ${s.title}:\n${s.content.slice(0, 400)}`).join('\n\n');
    let dialogue = null;
    const apiKey = this._getActiveApiKey();

    if (apiKey) {
      try {
        const resp = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
          body: JSON.stringify({
            model: 'claude-sonnet-4-6',
            max_tokens: 2048,
            messages: [{
              role: 'user',
              content: `Write a 10-exchange podcast conversation between "Host" (curious interviewer) and "Expert" (domain specialist) discussing the main themes from these sources. Make it natural, insightful, and engaging. Return ONLY a JSON array:
[{"speaker":"Host","text":"..."},{"speaker":"Expert","text":"..."}]

Sources:\n${sourcesText}`
            }]
          })
        });
        const data = await resp.json();
        const raw = data.content && data.content[0] ? data.content[0].text : '[]';
        const jsonMatch = raw.match(/\[[\s\S]*\]/);
        dialogue = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
      } catch { dialogue = null; }
    }

    if (!dialogue) {
      const titles = nb.sources.map(s => s.title).join(', ');
      dialogue = [
        { speaker: 'Host', text: "Welcome! Today we're exploring: " + titles + ". Let's dive in." },
        { speaker: 'Expert', text: "Happy to be here. These sources cover some fascinating ground — let me walk you through the key themes." },
        { speaker: 'Host', text: "What would you say is the most important takeaway?" },
        { speaker: 'Expert', text: "The core insight is how these topics connect. Once you see that, everything else falls into place." }
      ];
    }

    nb.audioOverview = dialogue;
    this._save();
    if (transcript) {
      transcript.innerHTML = '';
      dialogue.forEach(turn => transcript.appendChild(this._buildAudioTurn(turn)));
    }
  }

  _buildAudioTurn(turn) {
    const isHost = turn.speaker === 'Host';
    const wrap = document.createElement('div');
    wrap.className = 'nb-audio-turn ' + (isHost ? 'host' : 'expert');
    wrap.innerHTML = `
      <div class="nb-audio-avatar">${isHost ? 'H' : 'E'}</div>
      <div class="nb-audio-bubble">
        <div class="nb-audio-speaker-label">${this._esc(turn.speaker)}</div>
        ${this._esc(turn.text)}
      </div>
    `;
    return wrap;
  }

  /* ---------- Export ---------- */
  exportNotebook() {
    const nb = this._find(this.currentId);
    if (!nb) return;
    let md = `# ${nb.name}\n\n`;
    md += `*Created: ${new Date(nb.created).toLocaleDateString()}*\n\n`;
    md += `## Sources (${nb.sources.length})\n\n`;
    nb.sources.forEach((s, i) => {
      md += `### Source ${i+1}: ${s.title}\n\`\`\`\n${s.content.slice(0, 500)}\n\`\`\`\n\n`;
    });
    if (nb.studyGuide) {
      md += `## Study Guide\n\n### Summary\n${nb.studyGuide.summary}\n\n`;
      md += `### Key Topics\n${(nb.studyGuide.keyTopics || []).map(t => '- ' + t).join('\n')}\n\n`;
      if (nb.studyGuide.faqs) {
        md += `### FAQs\n${nb.studyGuide.faqs.map(f => `**Q:** ${f.question}\n**A:** ${f.answer}`).join('\n\n')}\n\n`;
      }
    }
    if (nb.audioOverview && nb.audioOverview.length) {
      md += `## Podcast Transcript\n\n`;
      nb.audioOverview.forEach(t => { md += `**${t.speaker}:** ${t.text}\n\n`; });
    }
    const blob = new Blob([md], { type: 'text/markdown' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = (nb.name || 'notebook').replace(/[^a-z0-9]/gi, '-') + '.md';
    a.click();
  }

  /* ---------- helpers ---------- */
  _esc(str) {
    return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  _relDate(ts) {
    if (!ts) return '';
    const diff = Date.now() - ts;
    if (diff < 86400000) return 'Today';
    if (diff < 172800000) return 'Yesterday';
    return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }
}

window.NotebookManager = NotebookManager;
document.addEventListener('DOMContentLoaded', () => {
  window.notebookManager = new NotebookManager();
});
