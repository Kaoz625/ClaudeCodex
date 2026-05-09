// ── Usage & Multi-Provider Account Manager ── //

// Pricing per million tokens
const PRICING = {
  // Anthropic
  'claude-opus-4':      { input: 15.00, output: 75.00,  cacheRead: 1.50 },
  'claude-sonnet-4-6':  { input: 3.00,  output: 15.00,  cacheRead: 0.30 },
  'claude-sonnet-4':    { input: 3.00,  output: 15.00,  cacheRead: 0.30 },
  'claude-haiku-4':     { input: 0.80,  output: 4.00,   cacheRead: 0.08 },
  // OpenAI
  'gpt-4o':             { input: 2.50,  output: 10.00,  cacheRead: 1.25 },
  'gpt-4o-mini':        { input: 0.15,  output: 0.60,   cacheRead: 0.075 },
  'o1':                 { input: 15.00, output: 60.00,  cacheRead: 7.50 },
  'o3-mini':            { input: 1.10,  output: 4.40,   cacheRead: 0.55 },
  // Google
  'gemini-2.0-flash':   { input: 0.10,  output: 0.40,   cacheRead: 0.025 },
  'gemini-1.5-pro':     { input: 1.25,  output: 5.00,   cacheRead: 0.3125 },
  'gemini-1.5-flash':   { input: 0.075, output: 0.30,   cacheRead: 0.01875 },
  // OpenRouter (popular models — billed by underlying model)
  'openrouter/auto':              { input: 3.00,  output: 15.00,  cacheRead: 0 },
  'meta-llama/llama-3.3-70b-instruct': { input: 0.40, output: 0.40, cacheRead: 0 },
  'mistralai/mistral-large':      { input: 2.00,  output: 6.00,   cacheRead: 0 },
  'deepseek/deepseek-r1':         { input: 0.55,  output: 2.19,   cacheRead: 0 },
  'qwen/qwen-2.5-72b-instruct':   { input: 0.35,  output: 0.40,   cacheRead: 0 },
  // GitHub Models (free tier)
  'gpt-4o-github':                { input: 0,     output: 0,      cacheRead: 0 },
  'phi-4-github':                 { input: 0,     output: 0,      cacheRead: 0 },
  'llama-3.3-70b-github':         { input: 0,     output: 0,      cacheRead: 0 },
};

// Known rate limits per provider + tier
const RATE_LIMITS = {
  anthropic: {
    free:  { rpm: 60,    tpm: 100_000,    rpd: 1_000,   tpd: 10_000_000,     resetMin: true, resetDay: true },
    tier1: { rpm: 2000,  tpm: 400_000,    rpd: 50_000,  tpd: 5_000_000_000,  resetMin: true, resetDay: true },
    tier2: { rpm: 4000,  tpm: 800_000,    rpd: 200_000, tpd: 25_000_000_000, resetMin: true, resetDay: true },
    tier3: { rpm: 8000,  tpm: 2_400_000,  rpd: 1_000_000, tpd: null,         resetMin: true, resetDay: true },
  },
  openai: {
    free:  { rpm: 3,     tpm: 40_000,     rpd: 200,     tpd: null, resetMin: true, resetDay: true },
    tier1: { rpm: 500,   tpm: 200_000,    rpd: 10_000,  tpd: null, resetMin: true, resetDay: true },
    tier2: { rpm: 5000,  tpm: 2_000_000,  rpd: 100_000, tpd: null, resetMin: true, resetDay: true },
    tier3: { rpm: 10_000,tpm: 10_000_000, rpd: null,    tpd: null, resetMin: true, resetDay: false },
  },
  google: {
    free:  { rpm: 15,    tpm: 1_000_000,  rpd: 1_500,   tpd: null, resetMin: true, resetDay: true },
    tier1: { rpm: 2000,  tpm: 4_000_000,  rpd: null,    tpd: null, resetMin: true, resetDay: false },
    tier2: { rpm: 4000,  tpm: 8_000_000,  rpd: null,    tpd: null, resetMin: true, resetDay: false },
    tier3: { rpm: 10_000,tpm: 20_000_000, rpd: null,    tpd: null, resetMin: true, resetDay: false },
  },
  openrouter: {
    free:  { rpm: 20,    tpm: 200_000,    rpd: 200,     tpd: null, resetMin: true, resetDay: true },
    tier1: { rpm: 200,   tpm: 2_000_000,  rpd: 10_000,  tpd: null, resetMin: true, resetDay: true },
    tier2: { rpm: 1000,  tpm: 10_000_000, rpd: 100_000, tpd: null, resetMin: true, resetDay: false },
    tier3: { rpm: 10_000,tpm: 50_000_000, rpd: null,    tpd: null, resetMin: true, resetDay: false },
  },
  github: {
    free:  { rpm: 10,    tpm: 50_000,     rpd: 150,     tpd: null, resetMin: true, resetDay: true },
    tier1: { rpm: 50,    tpm: 150_000,    rpd: 1_000,   tpd: null, resetMin: true, resetDay: true },
    tier2: { rpm: 100,   tpm: 300_000,    rpd: 5_000,   tpd: null, resetMin: true, resetDay: true },
    tier3: { rpm: 500,   tpm: 1_000_000,  rpd: 50_000,  tpd: null, resetMin: true, resetDay: false },
  },
};

const PROVIDER_MODELS = {
  anthropic:  ['claude-opus-4', 'claude-sonnet-4-6', 'claude-sonnet-4', 'claude-haiku-4'],
  openai:     ['gpt-4o', 'gpt-4o-mini', 'o1', 'o3-mini'],
  google:     ['gemini-2.0-flash', 'gemini-1.5-pro', 'gemini-1.5-flash'],
  openrouter: ['openrouter/auto', 'meta-llama/llama-3.3-70b-instruct', 'mistralai/mistral-large', 'deepseek/deepseek-r1', 'qwen/qwen-2.5-72b-instruct'],
  github:     ['gpt-4o-github', 'phi-4-github', 'llama-3.3-70b-github'],
};

const PROVIDER_LABELS = {
  anthropic:  { name: 'Anthropic',   icon: '🤖', color: '#cc785c', keyHint: 'sk-ant-…' },
  openai:     { name: 'OpenAI',      icon: '⚡',  color: '#5b8dd9', keyHint: 'sk-…' },
  google:     { name: 'Google',      icon: '💎',  color: '#3fc56b', keyHint: 'AIzaSy…' },
  openrouter: { name: 'OpenRouter',  icon: '🔀',  color: '#c792ea', keyHint: 'sk-or-v1-…' },
  github:     { name: 'GitHub',      icon: '🐙',  color: '#e9b143', keyHint: 'github_pat_…' },
};

const AVATAR_COLORS = ['#cc785c','#5b8dd9','#3fc56b','#c792ea','#e9b143','#e06c75','#56b6c2','#98c379'];

export class UsageManager {
  constructor() {
    this.accounts   = this.load('accounts', []);
    this.usageLog   = this.load('usageLog', []);
    this.activeId   = localStorage.getItem('activeAccountId') || null;
    this.rateCounts = this.load('rateCounts', {}); // { accountId: { rpm_used, tpm_used, rpm_reset_ts, ... } }

    // Validate active account exists
    if (this.activeId && !this.accounts.find(a => a.id === this.activeId)) {
      this.activeId = this.accounts[0]?.id || null;
    }

    this.render();
    this.wireModal();
    this.wireClearButton();
    this.startRateLimitTimers();
  }

  // ── Persistence helpers ──
  load(key, def) { try { return JSON.parse(localStorage.getItem(key) || 'null') ?? def; } catch { return def; } }
  save(key, val) { localStorage.setItem(key, JSON.stringify(val)); }

  getActiveAccount() { return this.accounts.find(a => a.id === this.activeId) || null; }

  // ── Record usage ──
  recordUsage({ input, output, cacheRead = 0 }) {
    const account = this.getActiveAccount();
    const model   = account?.model || 'claude-sonnet-4-6';
    const cost    = this.calcCost(input, output, cacheRead, model);

    const entry = {
      id: Date.now(), ts: new Date().toISOString(),
      accountId: this.activeId, accountName: account?.name || 'Unknown',
      provider: account?.provider || 'anthropic',
      model, input, output, cacheRead, cost,
    };

    this.usageLog.unshift(entry);
    if (this.usageLog.length > 1000) this.usageLog.pop();
    this.save('usageLog', this.usageLog);

    // Update account totals
    if (account) {
      account.totalInput  = (account.totalInput  || 0) + input;
      account.totalOutput = (account.totalOutput || 0) + output;
      account.totalCost   = (account.totalCost   || 0) + cost;
      account.requests    = (account.requests    || 0) + 1;
      this.save('accounts', this.accounts);
    }

    // Track per-minute rate usage
    this.trackRate(this.activeId, input + output);

    this.render();
  }

  calcCost(input, output, cacheRead, model) {
    const p = PRICING[model] || PRICING['claude-sonnet-4-6'];
    return (input / 1e6) * p.input + (output / 1e6) * p.output + (cacheRead / 1e6) * p.cacheRead;
  }

  trackRate(accountId, tokens) {
    if (!accountId) return;
    const now = Date.now();
    const r = this.rateCounts[accountId] || { rpm: 0, tpm: 0, rpd: 0, tpd: 0, minTs: now, dayTs: now };

    // Reset per-minute counters if > 60s
    if (now - r.minTs > 60_000) { r.rpm = 0; r.tpm = 0; r.minTs = now; }
    // Reset per-day counters if > 24h
    if (now - r.dayTs > 86_400_000) { r.rpd = 0; r.tpd = 0; r.dayTs = now; }

    r.rpm++; r.tpm += tokens;
    r.rpd++; r.tpd += tokens;
    this.rateCounts[accountId] = r;
    this.save('rateCounts', this.rateCounts);
  }

  // ── Render all ──
  render() {
    this.renderAccountsList();
    this.renderRateLimits();
    this.renderUsageCards();
    this.renderUsageTable();
    this.updateTitlebar();
    this.updateModelSelector();
  }

  refresh() { this.render(); }

  // ── Accounts list ──
  renderAccountsList() {
    const list = document.getElementById('accounts-list');
    if (!this.accounts.length) {
      list.innerHTML = `<div style="padding:20px;text-align:center;color:var(--text-muted);font-size:12px">No accounts yet. Click <strong>+ Add Account</strong> to start.</div>`;
      return;
    }
    list.innerHTML = '';
    this.accounts.forEach((acct, i) => {
      const isActive = acct.id === this.activeId;
      const color    = AVATAR_COLORS[i % AVATAR_COLORS.length];
      const pLabel   = PROVIDER_LABELS[acct.provider] || PROVIDER_LABELS.anthropic;
      const tokens   = (acct.totalInput || 0) + (acct.totalOutput || 0);

      const card = document.createElement('div');
      card.className = `account-card${isActive ? ' active-account' : ''}`;
      card.innerHTML = `
        <div class="account-avatar" style="background:${color}">${acct.name.slice(0,2).toUpperCase()}</div>
        <div class="account-info">
          <div class="account-name">${this.esc(acct.name)}</div>
          <div class="account-key-preview">
            <span style="color:${pLabel.color}">${pLabel.icon} ${pLabel.name}</span>
            &nbsp;·&nbsp;${this.maskKey(acct.key)}&nbsp;·&nbsp;${acct.model}
          </div>
        </div>
        <div class="account-usage-mini">
          <div><strong>${this.fmtNum(tokens)}</strong> tokens</div>
          <div><strong>$${(acct.totalCost || 0).toFixed(4)}</strong></div>
          <div style="color:var(--text-muted)">${acct.requests || 0} requests</div>
        </div>
        <div class="account-actions">
          ${isActive
            ? `<span class="active-badge">● Active</span>`
            : `<button class="btn-switch-account" data-id="${acct.id}">Switch</button>`}
          <button class="btn-delete-account" data-id="${acct.id}">✕</button>
        </div>`;
      card.querySelector('.btn-switch-account')?.addEventListener('click', () => this.switchAccount(acct.id));
      card.querySelector('.btn-delete-account')?.addEventListener('click', () => this.deleteAccount(acct.id));
      list.appendChild(card);
    });
  }

  // ── Rate limits with live bars + countdown ──
  renderRateLimits() {
    const grid = document.getElementById('rate-limits-grid');
    if (!this.accounts.length) { grid.innerHTML = ''; return; }

    grid.innerHTML = '';
    this.accounts.forEach(acct => {
      const pLabel  = PROVIDER_LABELS[acct.provider] || PROVIDER_LABELS.anthropic;
      const tier    = acct.tier || 'tier1';
      const limits  = RATE_LIMITS[acct.provider]?.[tier] || RATE_LIMITS.anthropic.tier1;
      const counts  = this.rateCounts[acct.id] || { rpm: 0, tpm: 0, rpd: 0, tpd: 0, minTs: Date.now(), dayTs: Date.now() };
      const isActive = acct.id === this.activeId;

      const secToMinReset = Math.max(0, Math.ceil((60_000 - (Date.now() - (counts.minTs || Date.now()))) / 1000));
      const secToDayReset = Math.max(0, Math.ceil((86_400_000 - (Date.now() - (counts.dayTs || Date.now()))) / 1000));

      const card = document.createElement('div');
      card.className = 'rate-limit-card';
      card.dataset.accountId = acct.id;
      card.innerHTML = `
        <div class="rate-limit-card-header">
          <div class="rate-limit-name">
            ${pLabel.icon} ${this.esc(acct.name)}
            ${isActive ? '<span class="active-badge" style="margin-left:6px">Active</span>' : ''}
          </div>
          <div class="rate-limit-reset">${acct.tier || 'tier1'} · ${pLabel.name}</div>
        </div>
        ${this.rateRow('Req/min', counts.rpm, limits.rpm, 'rpm')}
        ${this.rateRow('Tokens/min', counts.tpm, limits.tpm, 'tpm')}
        ${limits.rpd ? this.rateRow('Req/day', counts.rpd, limits.rpd, 'rpd') : ''}
        ${limits.tpd ? this.rateRow('Tokens/day', counts.tpd, limits.tpd, 'tpd') : ''}
        <div class="refresh-countdown" data-account-id="${acct.id}" data-min-ts="${counts.minTs || Date.now()}" data-day-ts="${counts.dayTs || Date.now()}">
          ↺ min reset in <span class="min-countdown">${secToMinReset}s</span>
          ${limits.resetDay ? `&nbsp;·&nbsp;day reset in <span class="day-countdown">${this.fmtDuration(secToDayReset)}</span>` : ''}
        </div>`;
      grid.appendChild(card);
    });
  }

  rateRow(label, used, limit, key) {
    if (!limit) return '';
    const pct = Math.min(100, Math.round((used / limit) * 100));
    const cls = pct >= 90 ? 'danger' : pct >= 70 ? 'warn' : '';
    return `
      <div class="rate-limit-row" data-key="${key}">
        <div class="rate-limit-label">
          <span>${label}</span>
          <span>${this.fmtNum(used)} / ${this.fmtNum(limit)} (${pct}%)</span>
        </div>
        <div class="rate-limit-bar-wrap">
          <div class="rate-limit-bar ${cls}" style="width:${pct}%"></div>
        </div>
      </div>`;
  }

  // ── Live countdown timers ──
  startRateLimitTimers() {
    setInterval(() => {
      document.querySelectorAll('.refresh-countdown').forEach(el => {
        const minTs = parseInt(el.dataset.minTs || '0');
        const dayTs = parseInt(el.dataset.dayTs || '0');
        const secToMin = Math.max(0, Math.ceil((60_000 - (Date.now() - minTs)) / 1000));
        const secToDay = Math.max(0, Math.ceil((86_400_000 - (Date.now() - dayTs)) / 1000));
        const minEl = el.querySelector('.min-countdown');
        const dayEl = el.querySelector('.day-countdown');
        if (minEl) minEl.textContent = secToMin + 's';
        if (dayEl) dayEl.textContent = this.fmtDuration(secToDay);

        // Auto-reset when countdown hits 0
        if (secToMin === 0) {
          const accountId = el.dataset.accountId;
          if (accountId && this.rateCounts[accountId]) {
            this.rateCounts[accountId].rpm = 0;
            this.rateCounts[accountId].tpm = 0;
            this.rateCounts[accountId].minTs = Date.now();
            this.save('rateCounts', this.rateCounts);
          }
        }
      });
    }, 1000);
  }

  fmtDuration(sec) {
    if (sec <= 0) return '0s';
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    if (h > 0) return `${h}h ${m}m`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  }

  // ── Usage cards ──
  renderUsageCards() {
    const entries = this.usageLog.filter(e => e.accountId === this.activeId);
    const totalIn  = entries.reduce((s, e) => s + e.input, 0);
    const totalOut = entries.reduce((s, e) => s + e.output, 0);
    const totalCost = entries.reduce((s, e) => s + e.cost, 0);

    document.getElementById('val-total-tokens').textContent = this.fmtNum(totalIn + totalOut);
    document.getElementById('val-input-tokens').textContent = this.fmtNum(totalIn);
    document.getElementById('val-output-tokens').textContent = this.fmtNum(totalOut);
    document.getElementById('val-cost').textContent = `$${totalCost.toFixed(4)}`;
  }

  // ── Usage table ──
  renderUsageTable() {
    const tbody   = document.getElementById('usage-table-body');
    const emptyEl = document.getElementById('usage-empty');
    const table   = document.getElementById('usage-table');

    if (!this.usageLog.length) {
      tbody.innerHTML = '';
      emptyEl.style.display = 'block';
      table.style.display = 'none';
      return;
    }

    table.style.display = 'table';
    emptyEl.style.display = 'none';

    tbody.innerHTML = this.usageLog.slice(0, 150).map((e, i) => {
      const pLabel = PROVIDER_LABELS[e.provider] || PROVIDER_LABELS.anthropic;
      return `<tr>
        <td style="color:var(--text-muted)">${this.usageLog.length - i}</td>
        <td>${this.fmtTime(e.ts)}</td>
        <td>${this.esc(e.accountName)}</td>
        <td><span style="color:${pLabel.color}">${pLabel.icon} ${pLabel.name}</span></td>
        <td style="color:var(--purple);font-family:var(--font-mono)">${e.model}</td>
        <td style="color:var(--blue)">${this.fmtNum(e.input)}</td>
        <td style="color:var(--green)">${this.fmtNum(e.output)}</td>
        <td style="color:var(--yellow)">${this.fmtNum(e.cacheRead)}</td>
        <td style="color:var(--accent)">$${e.cost.toFixed(5)}</td>
      </tr>`;
    }).join('');
  }

  // ── Titlebar update ──
  updateTitlebar() {
    const dot    = document.getElementById('account-dot');
    const label  = document.getElementById('account-label');
    const badge  = document.getElementById('account-provider-badge');
    const acct   = this.getActiveAccount();

    if (acct) {
      dot.classList.add('active');
      label.textContent = acct.name;
      const p = PROVIDER_LABELS[acct.provider] || PROVIDER_LABELS.anthropic;
      badge.textContent = p.name;
      badge.style.color = p.color;
    } else {
      dot.classList.remove('active');
      label.textContent = 'No account';
      badge.textContent = '';
    }
  }

  // ── Model badge in chat ──
  updateModelSelector() {
    const acct = this.getActiveAccount();
    const badge = document.getElementById('model-badge');
    if (badge && acct) badge.textContent = acct.model;
  }

  // ── Account management ──
  switchAccount(id) {
    this.activeId = id;
    localStorage.setItem('activeAccountId', id);
    const acct = this.accounts.find(a => a.id === id);
    if (acct) localStorage.setItem('activeApiKey', acct.key);
    this.render();
    // Notify chat manager of provider change
    if (window.chatManager) window.chatManager.onAccountChange(acct);
  }

  addAccount(name, key, provider, model, tier) {
    if (!name.trim() || !key.trim()) return false;
    const id = Date.now().toString();
    this.accounts.push({ id, name: name.trim(), key: key.trim(), provider, model, tier,
      totalInput: 0, totalOutput: 0, totalCost: 0, requests: 0,
      addedAt: new Date().toISOString() });
    this.save('accounts', this.accounts);
    if (!this.activeId) this.switchAccount(id);
    else this.render();
    return true;
  }

  deleteAccount(id) {
    if (!confirm('Remove this account? Usage history is kept.')) return;
    this.accounts = this.accounts.filter(a => a.id !== id);
    this.save('accounts', this.accounts);
    if (this.activeId === id) {
      this.activeId = this.accounts[0]?.id || null;
      if (this.activeId) localStorage.setItem('activeAccountId', this.activeId);
      else localStorage.removeItem('activeAccountId');
    }
    this.render();
  }

  clearUsage() {
    if (!confirm('Clear all usage history?')) return;
    this.usageLog = [];
    this.save('usageLog', this.usageLog);
    this.render();
  }

  // ── Modal ──
  wireModal() {
    const modal        = document.getElementById('modal-add-account');
    const providerBtns = document.querySelectorAll('.provider-btn');
    const modelSel     = document.getElementById('add-account-model');
    let selectedProvider = 'anthropic';

    // Provider toggle
    providerBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        providerBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        selectedProvider = btn.dataset.provider;

        // Update model options
        modelSel.innerHTML = (PROVIDER_MODELS[selectedProvider] || []).map(m =>
          `<option value="${m}">${m}</option>`).join('');

        // Update key placeholder
        const hint = PROVIDER_LABELS[selectedProvider]?.keyHint || '';
        document.getElementById('add-account-key').placeholder = hint;
      });
    });

    document.getElementById('btn-add-account').addEventListener('click', () => {
      modal.classList.remove('hidden');
      document.getElementById('add-account-name').value = '';
      document.getElementById('add-account-key').value = '';
      document.getElementById('add-account-name').focus();
    });

    document.getElementById('btn-modal-cancel').addEventListener('click', () => modal.classList.add('hidden'));
    modal.querySelector('.modal-backdrop').addEventListener('click', () => modal.classList.add('hidden'));

    document.getElementById('btn-modal-save').addEventListener('click', () => {
      const name  = document.getElementById('add-account-name').value;
      const key   = document.getElementById('add-account-key').value;
      const model = document.getElementById('add-account-model').value;
      const tier  = document.getElementById('add-account-tier').value;

      if (!name.trim()) { alert('Please enter an account name.'); return; }
      if (!key.trim())  { alert('Please enter an API key.'); return; }

      if (this.addAccount(name, key, selectedProvider, model, tier)) {
        modal.classList.add('hidden');
      }
    });

    document.getElementById('add-account-key').addEventListener('keydown', e => {
      if (e.key === 'Enter') document.getElementById('btn-modal-save').click();
    });
  }

  wireClearButton() {
    document.getElementById('btn-clear-usage').addEventListener('click', () => this.clearUsage());
  }

  // ── Helpers ──
  maskKey(key) {
    if (!key || key.length < 8) return '••••••••';
    return key.slice(0, 8) + '••••••••' + key.slice(-4);
  }

  fmtNum(n) {
    if (!n) return '0';
    if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(2) + 'B';
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(2) + 'M';
    if (n >= 1_000) return (n / 1_000).toFixed(1) + 'k';
    return String(Math.round(n));
  }

  fmtTime(iso) {
    try { return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }); }
    catch { return iso; }
  }

  esc(str) {
    return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }
}
