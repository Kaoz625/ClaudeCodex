// ── n8n Workflow Automation Tab ── //

const DEFAULT_N8N_URL = 'http://localhost:5678';

export class N8nManager {
  constructor() {
    this.n8nUrl = localStorage.getItem('n8nUrl') || DEFAULT_N8N_URL;
    this.isConnected = false;
    this.workflows = [];
    this.executions = [];

    this.wire();
    this.checkConnection();
  }

  wire() {
    // URL bar
    const urlInput = document.getElementById('n8n-url-input');
    if (urlInput) {
      urlInput.value = this.n8nUrl;
      urlInput.addEventListener('keydown', e => {
        if (e.key === 'Enter') this.setUrl(urlInput.value.trim());
      });
    }

    document.getElementById('btn-n8n-connect')?.addEventListener('click', () => {
      const url = document.getElementById('n8n-url-input')?.value.trim();
      if (url) this.setUrl(url);
    });

    document.getElementById('btn-n8n-open-browser')?.addEventListener('click', () => {
      window.api.openExternal(this.n8nUrl);
    });

    document.getElementById('btn-n8n-refresh')?.addEventListener('click', () => {
      this.checkConnection();
    });

    // Tab switching within n8n panel
    document.querySelectorAll('.n8n-inner-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.n8n-inner-tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.n8n-panel').forEach(p => p.classList.remove('active'));
        tab.classList.add('active');
        const target = document.getElementById(`n8n-panel-${tab.dataset.panel}`);
        if (target) target.classList.add('active');
        if (tab.dataset.panel === 'embed') this.loadEmbed();
        if (tab.dataset.panel === 'workflows') this.loadWorkflows();
        if (tab.dataset.panel === 'executions') this.loadExecutions();
      });
    });

    // API key
    document.getElementById('btn-n8n-save-key')?.addEventListener('click', () => {
      const key = document.getElementById('n8n-api-key')?.value.trim();
      if (key) { localStorage.setItem('n8nApiKey', key); this.checkConnection(); }
    });
  }

  setUrl(url) {
    if (!url.startsWith('http')) url = 'http://' + url;
    this.n8nUrl = url;
    localStorage.setItem('n8nUrl', url);
    this.checkConnection();
  }

  async checkConnection() {
    this.setStatus('checking', 'Connecting…');
    try {
      const result = await window.api.fetchUrl(this.n8nUrl + '/healthz');
      if (result.content?.includes('ok') || result.status === 200) {
        this.isConnected = true;
        this.setStatus('connected', 'Connected');
        this.loadWorkflows();
      } else {
        // Try root ping
        const root = await window.api.fetchUrl(this.n8nUrl);
        if (root.content && !root.error) {
          this.isConnected = true;
          this.setStatus('connected', 'Connected');
          this.loadWorkflows();
        } else {
          throw new Error('Not reachable');
        }
      }
    } catch (e) {
      this.isConnected = false;
      this.setStatus('disconnected', 'Not running — start n8n first');
      this.showStartInstructions();
    }
  }

  setStatus(state, label) {
    const dot  = document.getElementById('n8n-status-dot');
    const text = document.getElementById('n8n-status-text');
    if (dot)  { dot.className = `n8n-status-dot ${state}`; }
    if (text) text.textContent = label;
  }

  loadEmbed() {
    const webview = document.getElementById('n8n-webview');
    if (webview && this.isConnected) {
      webview.src = this.n8nUrl;
    }
  }

  async loadWorkflows() {
    if (!this.isConnected) return;
    const apiKey = localStorage.getItem('n8nApiKey');
    const headers = apiKey ? { 'X-N8N-API-KEY': apiKey } : {};

    try {
      const result = await window.api.fetchUrl(this.n8nUrl + '/api/v1/workflows');
      if (result.content && !result.error) {
        try {
          const data = JSON.parse(result.content);
          this.workflows = data.data || data || [];
          this.renderWorkflows();
        } catch (_) {
          this.renderWorkflowsError('Could not parse workflow data. Set an API key below.');
        }
      }
    } catch (e) {
      this.renderWorkflowsError(e.message);
    }
  }

  async loadExecutions() {
    if (!this.isConnected) return;
    try {
      const result = await window.api.fetchUrl(this.n8nUrl + '/api/v1/executions?limit=20');
      if (result.content && !result.error) {
        try {
          const data = JSON.parse(result.content);
          this.executions = data.data || data || [];
          this.renderExecutions();
        } catch (_) {
          this.renderExecutionsError('Could not parse executions. Make sure you have an API key set.');
        }
      }
    } catch (e) {
      this.renderExecutionsError(e.message);
    }
  }

  renderWorkflows() {
    const el = document.getElementById('n8n-workflows-list');
    if (!el) return;

    if (!this.workflows.length) {
      el.innerHTML = `<div class="n8n-empty">No workflows found. <a href="#" id="n8n-open-app">Open n8n</a> to create one.</div>`;
      document.getElementById('n8n-open-app')?.addEventListener('click', () => {
        document.querySelector('.n8n-inner-tab[data-panel="embed"]')?.click();
      });
      return;
    }

    el.innerHTML = this.workflows.map(wf => `
      <div class="n8n-workflow-card">
        <div class="n8n-wf-status ${wf.active ? 'active' : 'inactive'}">
          ${wf.active ? '● Active' : '○ Inactive'}
        </div>
        <div class="n8n-wf-info">
          <div class="n8n-wf-name">${this.esc(wf.name)}</div>
          <div class="n8n-wf-meta">
            ${wf.nodes?.length || 0} nodes ·
            Updated ${this.fmtDate(wf.updatedAt || wf.createdAt)}
          </div>
        </div>
        <div class="n8n-wf-actions">
          <button class="btn-ghost" onclick="window.api.openExternal('${this.n8nUrl}/workflow/${wf.id}')">Open</button>
        </div>
      </div>`).join('');
  }

  renderWorkflowsError(msg) {
    const el = document.getElementById('n8n-workflows-list');
    if (el) el.innerHTML = `<div class="n8n-empty" style="color:var(--text-muted)">${this.esc(msg)}</div>`;
  }

  renderExecutions() {
    const el = document.getElementById('n8n-executions-list');
    if (!el) return;

    if (!this.executions.length) {
      el.innerHTML = `<div class="n8n-empty">No recent executions found.</div>`;
      return;
    }

    const statusColor = { success: 'var(--green)', error: 'var(--red)', running: 'var(--yellow)', waiting: 'var(--text-muted)' };

    el.innerHTML = `<table class="n8n-table">
      <thead><tr><th>Status</th><th>Workflow</th><th>Mode</th><th>Started</th><th>Duration</th></tr></thead>
      <tbody>
        ${this.executions.map(ex => {
          const dur = ex.stoppedAt && ex.startedAt
            ? Math.round((new Date(ex.stoppedAt) - new Date(ex.startedAt)) / 1000) + 's'
            : '—';
          return `<tr>
            <td style="color:${statusColor[ex.status] || 'var(--text-muted)'}">● ${ex.status}</td>
            <td>${this.esc(ex.workflowData?.name || ex.workflowId || '—')}</td>
            <td>${ex.mode || '—'}</td>
            <td>${this.fmtDate(ex.startedAt)}</td>
            <td>${dur}</td>
          </tr>`;
        }).join('')}
      </tbody>
    </table>`;
  }

  renderExecutionsError(msg) {
    const el = document.getElementById('n8n-executions-list');
    if (el) el.innerHTML = `<div class="n8n-empty" style="color:var(--text-muted)">${this.esc(msg)}</div>`;
  }

  showStartInstructions() {
    const el = document.getElementById('n8n-start-instructions');
    if (el) el.classList.remove('hidden');
  }

  fmtDate(iso) {
    if (!iso) return '—';
    try { return new Date(iso).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }); }
    catch { return iso; }
  }

  esc(s) { return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
}
