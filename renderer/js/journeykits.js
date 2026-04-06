// JourneyKits - Kit browser, installer, and runtime manager
// 14 selected kits across Dev, Tailblazers Business, and AI Infrastructure categories

const KITS = [
  // ── Dev & ClaudeCodex ──────────────────────────────────────────────────
  {
    id: 'council-lane',
    name: 'Council Lane Pattern',
    category: 'dev',
    categoryLabel: 'Dev & Agents',
    icon: '🏛️',
    description: 'Multi-agent coordination — how your oh-my-claudecode agents hand off tasks, vote, and resolve conflicts.',
    features: ['Agent voting protocol', 'Task handoff rules', 'Conflict resolution', 'Orchestrator signals'],
    installed: false,
    active: false,
    module: null
  },
  {
    id: 'workspace-continuity',
    name: 'Workspace Continuity',
    category: 'dev',
    categoryLabel: 'Dev & Agents',
    icon: '💾',
    description: 'Keeps agent context alive across sessions — critical when tmux-style agents restart.',
    features: ['Session snapshots', 'Context restore', 'Task queue persistence', 'Auto-checkpoint'],
    installed: false,
    active: false,
    module: null
  },
  {
    id: 'github-triage',
    name: 'GitHub Issue & PR Auto-Triage',
    category: 'dev',
    categoryLabel: 'Dev & Agents',
    icon: '🔀',
    description: 'Auto-labels, assigns, and prioritizes issues and PRs on your repos.',
    features: ['Auto-label by type', 'Priority scoring', 'Assignee routing', 'Stale issue alerts'],
    installed: false,
    active: false,
    module: null
  },
  {
    id: 'error-investigator',
    name: 'Error Alert Investigator',
    category: 'dev',
    categoryLabel: 'Dev & Agents',
    icon: '🔍',
    description: 'When something breaks, an agent automatically traces the root cause.',
    features: ['Stack trace analysis', 'Log correlation', 'Root cause report', 'Fix suggestion'],
    installed: false,
    active: false,
    module: null
  },
  {
    id: 'refactoring-planner',
    name: 'Code Refactoring Planner',
    category: 'dev',
    categoryLabel: 'Dev & Agents',
    icon: '♻️',
    description: 'Plans before the Refactorer agent refactors — prevents unintended breaking changes.',
    features: ['Dependency map', 'Risk scoring', 'Step-by-step plan', 'Rollback checkpoints'],
    installed: false,
    active: false,
    module: null
  },
  {
    id: 'changelog-generator',
    name: 'Changelog & Release Notes',
    category: 'dev',
    categoryLabel: 'Dev & Agents',
    icon: '📋',
    description: 'Auto-generates release notes from your git commits.',
    features: ['Commit categorization', 'Semver detection', 'CHANGELOG.md writer', 'GitHub release draft'],
    installed: false,
    active: false,
    module: null
  },
  // ── Tailblazers Business ───────────────────────────────────────────────
  {
    id: 'personal-crm',
    name: 'Personal CRM',
    category: 'business',
    categoryLabel: 'Tailblazers Business',
    icon: '🐾',
    description: 'Track dog walking clients, dogs, preferences, schedules, and veteran family notes.',
    features: ['Client profiles', 'Dog profiles', 'Walk history', 'Veteran notes', 'Birthday reminders'],
    installed: false,
    active: false,
    module: null
  },
  {
    id: 'content-repurposer',
    name: 'Content Repurposer',
    category: 'business',
    categoryLabel: 'Tailblazers Business',
    icon: '📢',
    description: 'Turn your Tailblazers mission story into Instagram, Twitter, and LinkedIn posts automatically.',
    features: ['Blog → Social', 'Platform tone adaptation', 'Hashtag suggestions', 'Post scheduler'],
    installed: false,
    active: false,
    module: null
  },
  {
    id: 'daily-brief',
    name: 'Daily Brief',
    category: 'business',
    categoryLabel: 'Tailblazers Business',
    icon: '🌅',
    description: 'Morning summary: today\'s walks, bookings, messages, weather, and priorities.',
    features: ['Schedule overview', 'Unread messages', 'Weather for walks', 'Top priorities', 'Revenue today'],
    installed: false,
    active: false,
    module: null
  },
  {
    id: 'inbox-triage',
    name: 'Inbox Triage Pipeline',
    category: 'business',
    categoryLabel: 'Tailblazers Business',
    icon: '📬',
    description: 'Sort and prioritize client booking requests automatically.',
    features: ['Auto-categorize', 'Urgency detection', 'Draft replies', 'Booking extraction'],
    installed: false,
    active: false,
    module: null
  },
  {
    id: 'seo-optimizer',
    name: 'SEO Content Optimizer',
    category: 'business',
    categoryLabel: 'Tailblazers Business',
    icon: '🔎',
    description: 'Optimize the Tailblazers website for local NYC search.',
    features: ['Keyword research', 'On-page audit', 'Meta tag writer', 'Local SEO tips'],
    installed: false,
    active: false,
    module: null
  },
  // ── AI Infrastructure ──────────────────────────────────────────────────
  {
    id: 'metacortex-memory',
    name: 'MetaCortex MCP Memory',
    category: 'infra',
    categoryLabel: 'AI Infrastructure',
    icon: '🧠',
    description: 'Persistent memory across all your Hermes + omc agents — they remember context between sessions.',
    features: ['Cross-session memory', 'Agent-scoped storage', 'Memory search', 'Auto-prune'],
    installed: false,
    active: false,
    module: null
  },
  {
    id: 'second-brain',
    name: 'Second Brain',
    category: 'infra',
    categoryLabel: 'AI Infrastructure',
    icon: '🗄️',
    description: 'Knowledge base for all your projects — ClaudeCodex docs, Tailblazers SOPs, agent skills.',
    features: ['Note ingestion', 'Semantic search', 'Link graph', 'Auto-tagging'],
    installed: false,
    active: false,
    module: null
  },
  {
    id: 'web-scraping-rag',
    name: 'Web Scraping → RAG Pipeline',
    category: 'infra',
    categoryLabel: 'AI Infrastructure',
    icon: '🕸️',
    description: 'Feed any website into your Research tab for deep analysis.',
    features: ['URL scraping', 'Chunk + embed', 'Vector store', 'Q&A over docs'],
    installed: false,
    active: false,
    module: null
  }
];

class JourneyKitsManager {
  constructor() {
    this.kits = JSON.parse(JSON.stringify(KITS)); // deep clone
    this.activeCategory = 'all';
    this.activeKit = null;
    this.runLog = [];
    this._loadState();
    this._render();
    this._bindEvents();
  }

  // ── Persistence ─────────────────────────────────────────────────────────
  _loadState() {
    try {
      const saved = JSON.parse(localStorage.getItem('jk_state') || '{}');
      this.kits.forEach(k => {
        if (saved[k.id]) {
          k.installed = saved[k.id].installed || false;
          k.active = saved[k.id].active || false;
        }
      });
    } catch (_) {}
  }

  _saveState() {
    const state = {};
    this.kits.forEach(k => { state[k.id] = { installed: k.installed, active: k.active }; });
    localStorage.setItem('jk_state', JSON.stringify(state));
  }

  // ── Render ───────────────────────────────────────────────────────────────
  _render() {
    const root = document.getElementById('journeykits-root');
    if (!root) return;

    const categories = [
      { id: 'all', label: 'All Kits', icon: '🧰' },
      { id: 'dev', label: 'Dev & Agents', icon: '⚙️' },
      { id: 'business', label: 'Tailblazers Business', icon: '🐾' },
      { id: 'infra', label: 'AI Infrastructure', icon: '🧠' }
    ];

    const installed = this.kits.filter(k => k.installed).length;
    const active = this.kits.filter(k => k.active).length;

    root.innerHTML = `
      <div class="jk-layout">
        <!-- Left sidebar: categories + stats -->
        <div class="jk-sidebar">
          <div class="jk-stats">
            <div class="jk-stat">
              <span class="jk-stat-num">${this.kits.length}</span>
              <span class="jk-stat-label">Available</span>
            </div>
            <div class="jk-stat">
              <span class="jk-stat-num">${installed}</span>
              <span class="jk-stat-label">Installed</span>
            </div>
            <div class="jk-stat">
              <span class="jk-stat-num jk-stat-active">${active}</span>
              <span class="jk-stat-label">Active</span>
            </div>
          </div>
          <div class="jk-categories">
            ${categories.map(c => `
              <button class="jk-cat-btn ${this.activeCategory === c.id ? 'active' : ''}"
                      data-cat="${c.id}">
                <span>${c.icon}</span> ${c.label}
              </button>
            `).join('')}
          </div>
          <div class="jk-sidebar-section">
            <div class="jk-sidebar-title">Quick Actions</div>
            <button class="jk-action-btn" id="jk-install-all">Install All</button>
            <button class="jk-action-btn" id="jk-activate-all">Activate All</button>
            <button class="jk-action-btn jk-action-danger" id="jk-deactivate-all">Deactivate All</button>
          </div>
          <div class="jk-sidebar-section">
            <div class="jk-sidebar-title">Run Log</div>
            <div class="jk-run-log" id="jk-run-log">
              ${this.runLog.length === 0
                ? '<div class="jk-log-empty">No kit runs yet</div>'
                : this.runLog.slice(-8).reverse().map(e => `
                  <div class="jk-log-entry">
                    <span class="jk-log-icon">${e.icon}</span>
                    <span class="jk-log-text">${e.text}</span>
                    <span class="jk-log-time">${e.time}</span>
                  </div>
                `).join('')
              }
            </div>
          </div>
        </div>

        <!-- Main: kit grid -->
        <div class="jk-main">
          <div class="jk-header">
            <h2 class="jk-title">JourneyKits</h2>
            <p class="jk-subtitle">AI skill packs — install once, run from chat with <code>/kit [name]</code></p>
          </div>
          <div class="jk-grid" id="jk-grid">
            ${this._renderGrid()}
          </div>
        </div>

        <!-- Right panel: kit detail (shown when a kit is selected) -->
        <div class="jk-detail ${this.activeKit ? 'open' : ''}" id="jk-detail">
          ${this.activeKit ? this._renderDetail(this.activeKit) : ''}
        </div>
      </div>
    `;
  }

  _renderGrid() {
    const filtered = this.activeCategory === 'all'
      ? this.kits
      : this.kits.filter(k => k.category === this.activeCategory);

    return filtered.map(kit => `
      <div class="jk-card ${kit.installed ? 'installed' : ''} ${kit.active ? 'active' : ''}"
           data-kit="${kit.id}">
        <div class="jk-card-icon">${kit.icon}</div>
        <div class="jk-card-body">
          <div class="jk-card-name">${kit.name}</div>
          <div class="jk-card-cat">${kit.categoryLabel}</div>
          <div class="jk-card-desc">${kit.description}</div>
        </div>
        <div class="jk-card-footer">
          ${kit.active
            ? `<span class="jk-badge jk-badge-active">● Active</span>`
            : kit.installed
              ? `<span class="jk-badge jk-badge-installed">Installed</span>`
              : `<span class="jk-badge jk-badge-available">Available</span>`
          }
          <div class="jk-card-actions">
            ${!kit.installed
              ? `<button class="jk-btn jk-btn-install" data-action="install" data-kit="${kit.id}">Install</button>`
              : kit.active
                ? `<button class="jk-btn jk-btn-stop" data-action="deactivate" data-kit="${kit.id}">Stop</button>`
                : `<button class="jk-btn jk-btn-run" data-action="activate" data-kit="${kit.id}">Activate</button>`
            }
            <button class="jk-btn jk-btn-info" data-action="detail" data-kit="${kit.id}">Details</button>
          </div>
        </div>
      </div>
    `).join('');
  }

  _renderDetail(kit) {
    return `
      <div class="jk-detail-header">
        <button class="jk-detail-close" id="jk-close-detail">✕</button>
        <div class="jk-detail-icon">${kit.icon}</div>
        <div class="jk-detail-name">${kit.name}</div>
        <div class="jk-detail-cat">${kit.categoryLabel}</div>
      </div>
      <div class="jk-detail-body">
        <p class="jk-detail-desc">${kit.description}</p>

        <div class="jk-detail-section">
          <div class="jk-detail-section-title">Features</div>
          <ul class="jk-feature-list">
            ${kit.features.map(f => `<li>${f}</li>`).join('')}
          </ul>
        </div>

        <div class="jk-detail-section">
          <div class="jk-detail-section-title">Usage in Chat</div>
          <code class="jk-usage-code">/kit ${kit.id}</code>
          <p class="jk-detail-hint">Type this in the chat input to invoke the kit directly. The kit will inject its system prompt and tools into the current conversation.</p>
        </div>

        <div class="jk-detail-section">
          <div class="jk-detail-section-title">Status</div>
          <div class="jk-status-row">
            <span class="jk-status-dot ${kit.active ? 'active' : kit.installed ? 'installed' : ''}"></span>
            <span>${kit.active ? 'Active — running in this session' : kit.installed ? 'Installed — not active' : 'Not installed'}</span>
          </div>
        </div>

        <div class="jk-detail-actions">
          ${!kit.installed
            ? `<button class="jk-btn jk-btn-install jk-btn-lg" data-action="install" data-kit="${kit.id}">Install Kit</button>`
            : kit.active
              ? `<button class="jk-btn jk-btn-stop jk-btn-lg" data-action="deactivate" data-kit="${kit.id}">Deactivate</button>`
              : `<button class="jk-btn jk-btn-run jk-btn-lg" data-action="activate" data-kit="${kit.id}">Activate</button>`
          }
          ${kit.installed
            ? `<button class="jk-btn jk-btn-uninstall" data-action="uninstall" data-kit="${kit.id}">Uninstall</button>`
            : ''
          }
        </div>

        <div class="jk-detail-section">
          <div class="jk-detail-section-title">Run Kit Now</div>
          <div class="jk-run-area">
            <textarea class="jk-run-input" id="jk-run-input-${kit.id}"
              placeholder="Optional: describe what you want this kit to do..."></textarea>
            <button class="jk-btn jk-btn-run" data-action="run" data-kit="${kit.id}">
              Run → Chat
            </button>
          </div>
        </div>
      </div>
    `;
  }

  // ── Events ───────────────────────────────────────────────────────────────
  _bindEvents() {
    const root = document.getElementById('journeykits-root');
    if (!root) return;

    root.addEventListener('click', e => {
      const btn = e.target.closest('[data-action]');
      const catBtn = e.target.closest('[data-cat]');

      if (catBtn) {
        this.activeCategory = catBtn.dataset.cat;
        this._render();
        this._bindEvents();
        return;
      }

      if (e.target.id === 'jk-close-detail') {
        this.activeKit = null;
        this._render();
        this._bindEvents();
        return;
      }

      if (e.target.id === 'jk-install-all') {
        this.kits.forEach(k => { k.installed = true; });
        this._saveState();
        this._log('🧰', 'All kits installed');
        this._render();
        this._bindEvents();
        return;
      }

      if (e.target.id === 'jk-activate-all') {
        this.kits.forEach(k => { k.installed = true; k.active = true; });
        this._saveState();
        this._log('▶️', 'All kits activated');
        this._render();
        this._bindEvents();
        return;
      }

      if (e.target.id === 'jk-deactivate-all') {
        this.kits.forEach(k => { k.active = false; });
        this._saveState();
        this._log('⏹️', 'All kits deactivated');
        this._render();
        this._bindEvents();
        return;
      }

      if (!btn) return;

      const kitId = btn.dataset.kit;
      const action = btn.dataset.action;
      const kit = this.kits.find(k => k.id === kitId);
      if (!kit) return;

      if (action === 'detail') {
        this.activeKit = kit;
        this._render();
        this._bindEvents();
        return;
      }

      if (action === 'install') {
        this._installKit(kit);
      } else if (action === 'activate') {
        this._activateKit(kit);
      } else if (action === 'deactivate') {
        this._deactivateKit(kit);
      } else if (action === 'uninstall') {
        this._uninstallKit(kit);
      } else if (action === 'run') {
        const inputEl = document.getElementById(`jk-run-input-${kitId}`);
        const prompt = inputEl ? inputEl.value.trim() : '';
        this._runKit(kit, prompt);
      }
    });
  }

  // ── Kit Actions ──────────────────────────────────────────────────────────
  _installKit(kit) {
    // Simulate install with progress
    this._log(kit.icon, `Installing ${kit.name}...`);
    setTimeout(() => {
      kit.installed = true;
      this._saveState();
      this._log('✅', `${kit.name} installed`);
      if (this.activeKit && this.activeKit.id === kit.id) this.activeKit = kit;
      this._render();
      this._bindEvents();
      this._notify(`${kit.icon} ${kit.name} installed`, 'success');
    }, 600);
  }

  _activateKit(kit) {
    if (!kit.installed) { this._installKit(kit); return; }
    kit.active = true;
    this._saveState();
    this._log(kit.icon, `${kit.name} activated`);
    if (this.activeKit && this.activeKit.id === kit.id) this.activeKit = kit;
    this._render();
    this._bindEvents();
    this._notify(`${kit.icon} ${kit.name} is now active`, 'success');
    // Inject system prompt into the global chat context
    this._injectSystemPrompt(kit);
  }

  _deactivateKit(kit) {
    kit.active = false;
    this._saveState();
    this._log(kit.icon, `${kit.name} deactivated`);
    if (this.activeKit && this.activeKit.id === kit.id) this.activeKit = kit;
    this._render();
    this._bindEvents();
  }

  _uninstallKit(kit) {
    kit.installed = false;
    kit.active = false;
    this._saveState();
    this._log('🗑️', `${kit.name} uninstalled`);
    if (this.activeKit && this.activeKit.id === kit.id) { this.activeKit = null; }
    this._render();
    this._bindEvents();
  }

  _runKit(kit, userPrompt) {
    if (!kit.installed) {
      this._installKit(kit);
      return;
    }
    const systemPrompt = this._getKitSystemPrompt(kit);
    const fullPrompt = userPrompt
      ? `${systemPrompt}\n\nUser request: ${userPrompt}`
      : systemPrompt;

    this._log(kit.icon, `Running ${kit.name}`);
    this._notify(`${kit.icon} Running ${kit.name} in chat...`, 'info');

    // Switch to chat tab and inject prompt
    const chatTab = document.querySelector('[data-tab="chat"]');
    if (chatTab) chatTab.click();

    setTimeout(() => {
      const input = document.getElementById('chat-input');
      if (input) {
        input.value = fullPrompt.slice(0, 500) + (fullPrompt.length > 500 ? '...' : '');
        input.focus();
        input.dispatchEvent(new Event('input'));
      }
    }, 300);
  }

  _injectSystemPrompt(kit) {
    // Store active kit context so chat.js can prepend it to system prompt
    const active = this.kits.filter(k => k.active);
    const systemAddons = active.map(k => this._getKitSystemPrompt(k)).join('\n\n---\n\n');
    window._activeKitContext = systemAddons;
    window._activeKitIds = active.map(k => k.id);
  }

  _getKitSystemPrompt(kit) {
    const prompts = {
      'council-lane': `You are coordinating a Council Lane multi-agent session. When tasks require multiple agents:
1. PROPOSE: State which agents should handle which subtasks
2. VOTE: Each agent signals readiness (✓) or concern (⚠)
3. EXECUTE: Hand off with explicit context packages
4. RESOLVE: Majority vote on conflicts, Orchestrator breaks ties
Always surface agent disagreements before proceeding.`,

      'workspace-continuity': `You have Workspace Continuity active. At the start of each response:
- Check for pending tasks from previous sessions
- Restore any interrupted workflows
- Summarize what was in progress before this session began
At the end of each significant response, output a checkpoint summary in <checkpoint> tags.`,

      'github-triage': `You are a GitHub triage assistant. For any issue or PR discussed:
1. Assign a priority: P0 (critical) / P1 (high) / P2 (medium) / P3 (low)
2. Suggest labels: bug, feature, docs, refactor, security, performance
3. Suggest an assignee based on the code area affected
4. Flag if the issue is stale (>30 days without update)`,

      'error-investigator': `You are an Error Investigation agent. When presented with any error, stack trace, or log:
1. Identify the root cause (not just the symptom)
2. Trace the call chain to where the error originated
3. Check for related issues (same component, recent changes)
4. Provide a fix recommendation with confidence level
Output format: ROOT CAUSE → CALL CHAIN → FIX → CONFIDENCE`,

      'refactoring-planner': `You are a Refactoring Planner. Before any refactoring work:
1. Map all dependencies of the target code
2. Score each change by risk (1-5) and impact (1-5)
3. Generate a step-by-step refactoring plan with rollback points
4. Identify tests that must pass at each step
Never recommend refactoring without a plan and rollback strategy.`,

      'changelog-generator': `You are a Changelog Generator. When reviewing commits or code changes:
1. Categorize each change: feat, fix, refactor, docs, test, chore, perf
2. Group by semver impact: MAJOR (breaking), MINOR (feature), PATCH (fix)
3. Write user-facing release notes (no internal jargon)
4. Format for CHANGELOG.md following Keep a Changelog spec`,

      'personal-crm': `You are managing the Tailblazers Personal CRM. You have access to:
- Client profiles (owner name, contact, dogs, preferences, notes)
- Dog profiles (name, breed, age, health notes, behavioral flags)
- Walk history and upcoming schedule
- Veteran family designations and special accommodations
When discussing clients or bookings, reference CRM data and suggest updates.`,

      'content-repurposer': `You are the Tailblazers Content Repurposer. When given any content (blog post, story, announcement):
1. Extract 3 key messages
2. Create platform-specific posts:
   - Instagram: visual, emoji-rich, 150 chars + hashtags
   - Twitter/X: punchy, 280 chars, 2-3 hashtags
   - LinkedIn: professional, mission-focused, 500 chars
3. Suggest 5 hashtags for each platform
Always tie back to Tailblazers' mission: veteran support + dog walking community.`,

      'daily-brief': `You are the Tailblazers Daily Brief assistant. Generate a morning summary covering:
1. Today's walks: scheduled clients, times, locations
2. Unread messages: booking requests, client questions
3. Weather: conditions for outdoor walks
4. Revenue: today's projected + week-to-date
5. Top 3 priorities for the day
Keep it scannable — bullet points, no paragraphs.`,

      'inbox-triage': `You are the Tailblazers Inbox Triage assistant. For each message:
1. Categorize: booking request / question / complaint / praise / spam
2. Urgency: urgent (respond today) / normal (respond this week) / low
3. Draft a reply template if it's a booking request or question
4. Extract: client name, dog name, requested dates, service type
Output a structured triage summary before any draft reply.`,

      'seo-optimizer': `You are an SEO Optimizer for Tailblazers NYC. Focus on:
- Local NYC search: "dog walking NYC", "dog walker Brooklyn", "veteran dog walker"
- Target keywords: service puppy training, dog walking East New York, veteran-owned business
- On-page optimization: title tags, meta descriptions, header hierarchy, alt text
- Content gaps: pages/topics that NYC dog owners search for but Tailblazers doesn't cover yet
Always provide specific, actionable recommendations.`,

      'metacortex-memory': `You have MetaCortex persistent memory active.
- Before responding, check if relevant memory exists for this topic
- After each significant exchange, store key facts in memory
- Tag memories: [project], [client], [preference], [decision], [fact]
- Surface relevant past context proactively
Memory format: <memory id="..." tags="...">content</memory>`,

      'second-brain': `You have Second Brain knowledge base access. This includes:
- ClaudeCodex architecture docs and decisions
- Tailblazers SOPs and business processes
- Agent skill definitions and tool specifications
- Research notes and saved articles
When answering questions, check the knowledge base first. Suggest new notes when important information is discussed.`,

      'web-scraping-rag': `You are a Web Research agent with RAG capabilities. When given a URL or topic:
1. Fetch and parse the content
2. Chunk into semantic segments
3. Build a searchable index for this session
4. Answer follow-up questions using retrieved chunks (cite chunk numbers)
Always show which chunks you retrieved for each answer.`
    };
    return prompts[kit.id] || `You have the ${kit.name} kit active. ${kit.description}`;
  }

  // ── Utilities ────────────────────────────────────────────────────────────
  _log(icon, text) {
    const now = new Date();
    const time = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    this.runLog.push({ icon, text, time });
    if (this.runLog.length > 50) this.runLog.shift();
    // Update just the log area without full re-render
    const logEl = document.getElementById('jk-run-log');
    if (logEl) {
      logEl.innerHTML = this.runLog.slice(-8).reverse().map(e => `
        <div class="jk-log-entry">
          <span class="jk-log-icon">${e.icon}</span>
          <span class="jk-log-text">${e.text}</span>
          <span class="jk-log-time">${e.time}</span>
        </div>
      `).join('');
    }
  }

  _notify(msg, type = 'info') {
    const el = document.createElement('div');
    el.className = `jk-toast jk-toast-${type}`;
    el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(() => el.classList.add('show'), 10);
    setTimeout(() => {
      el.classList.remove('show');
      setTimeout(() => el.remove(), 300);
    }, 3000);
  }

  // ── Public API ────────────────────────────────────────────────────────────
  getActiveKitContext() {
    return this.kits.filter(k => k.active)
      .map(k => this._getKitSystemPrompt(k))
      .join('\n\n---\n\n');
  }

  invokeKitFromChat(kitIdOrName, userPrompt) {
    const kit = this.kits.find(k =>
      k.id === kitIdOrName ||
      k.name.toLowerCase().includes(kitIdOrName.toLowerCase())
    );
    if (!kit) {
      return `Kit "${kitIdOrName}" not found. Available kits: ${this.kits.map(k => k.id).join(', ')}`;
    }
    if (!kit.installed) this._installKit(kit);
    return this._getKitSystemPrompt(kit) + (userPrompt ? `\n\nUser: ${userPrompt}` : '');
  }
}

// Export for use in app.js
window.JourneyKitsManager = JourneyKitsManager;

// ─────────────────────────────────────────────────────────────────────────────
// SkillsOverview — Registry-integrated view: source badges, overlap warnings,
//                  comparison modal, and manifest drop-in loader
// ─────────────────────────────────────────────────────────────────────────────

class SkillsOverview {
  constructor(registry) {
    this.registry = registry;
    this.view = 'overview'; // 'overview' | 'conflicts' | 'by-source' | 'add-manifest'
    this.compareGroup = null;
  }

  mount(containerId) {
    this.containerId = containerId;
    this._render();
  }

  _render() {
    const el = document.getElementById(this.containerId);
    if (!el) return;
    const featureConflicts = this.registry.getFeatureConflicts().length;
    const skillConflicts = this.registry.getActiveConflicts().length;
    const totalConflicts = featureConflicts + skillConflicts;
    el.innerHTML = `
      <div class="sk-layout">
        <div class="sk-toolbar">
          <div class="sk-view-tabs">
            <button class="sk-vtab ${this.view === 'overview' ? 'active' : ''}" data-view="overview">All Skills</button>
            <button class="sk-vtab ${this.view === 'features' ? 'active' : ''}" data-view="features">Features</button>
            <button class="sk-vtab ${this.view === 'conflicts' ? 'active' : ''}" data-view="conflicts">
              Conflicts
              ${totalConflicts > 0 ? `<span class="sk-conflict-badge">${totalConflicts}</span>` : ''}
            </button>
            <button class="sk-vtab ${this.view === 'by-source' ? 'active' : ''}" data-view="by-source">By Source</button>
            <button class="sk-vtab ${this.view === 'add-manifest' ? 'active' : ''}" data-view="add-manifest">+ Add Kits</button>
          </div>
          <div class="sk-active-summary">
            ${this.registry.getActive().length} active
          </div>
        </div>
        <div class="sk-content">
          ${this._renderView()}
        </div>
      </div>
    `;
    this._bindEvents(el);
  }

  _conflictBadge() {
    const n = this.registry.getActiveConflicts().length + this.registry.getFeatureConflicts().length;
    return n > 0 ? `<span class="sk-conflict-badge">${n}</span>` : '';
  }

  _renderView() {
    if (this.view === 'overview')      return this._renderOverview();
    if (this.view === 'features')      return this._renderFeatures();
    if (this.view === 'conflicts')     return this._renderConflicts();
    if (this.view === 'by-source')     return this._renderBySource();
    if (this.view === 'add-manifest')  return this._renderAddManifest();
    return '';
  }

  // ── Features view: per-skill sub-feature toggles ─────────────────────
  _renderFeatures() {
    const active = this.registry.getActive();
    const featureConflicts = this.registry.getFeatureConflicts();
    const conflictTags = new Set(featureConflicts.map(c => c.tag));

    if (active.length === 0) {
      return `<div class="sk-empty">No active skills. Activate skills first to see their feature toggles.</div>`;
    }

    return `
      ${featureConflicts.length > 0 ? `
        <div class="sk-feature-conflict-banner">
          ⚠ <strong>${featureConflicts.length} feature conflict${featureConflicts.length > 1 ? 's' : ''}</strong> detected.
          Multiple active skills are doing the same thing simultaneously.
          Turn off the specific sub-features below to isolate.
        </div>
      ` : `
        <div class="sk-feature-ok-banner">✓ No feature conflicts. All active features are unique.</div>
      `}
      ${active.map(skill => {
        if (!skill.features || skill.features.length === 0) return '';
        const meta = window.SOURCE_META?.[skill.source] || { label: skill.source, color: '#6b7280', bg: '#6b728020', icon: '🔧' };
        return `
          <div class="sk-feature-skill-block">
            <div class="sk-feature-skill-header">
              <span class="sk-source-badge" style="background:${meta.bg};color:${meta.color};border-color:${meta.color}40">
                ${meta.icon} ${meta.label}
              </span>
              <span class="sk-feature-skill-name">${skill.name}</span>
              <button class="sk-feat-all-btn" data-skill-id="${skill.id}" data-feat-all="enable">All On</button>
              <button class="sk-feat-all-btn sk-feat-all-off" data-skill-id="${skill.id}" data-feat-all="disable">All Off</button>
            </div>
            <div class="sk-feature-list">
              ${skill.features.map(f => {
                const isConflict = conflictTags.has(f.capabilityTag) && f.enabled;
                const conflictGroup = featureConflicts.find(c => c.tag === f.capabilityTag);
                const conflictWith = conflictGroup
                  ? conflictGroup.entries.filter(e => e.skill.id !== skill.id).map(e => e.skill.name).join(', ')
                  : '';
                return `
                  <div class="sk-feature-row ${isConflict ? 'sk-feat-conflict' : ''}" title="${isConflict ? `Conflicts with: ${conflictWith}` : f.label}">
                    <label class="sk-feat-toggle">
                      <input type="checkbox" ${f.enabled ? 'checked' : ''}
                             data-skill-id="${skill.id}" data-feature-id="${f.id}" />
                      <span class="sk-feat-slider"></span>
                    </label>
                    <span class="sk-feat-label">${f.label}</span>
                    ${isConflict ? `
                      <span class="sk-feat-conflict-tag" title="Also active in: ${conflictWith}">
                        ⚠ conflict with ${conflictWith}
                      </span>
                    ` : ''}
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        `;
      }).join('')}
    `;
  }

  // ── Overview: flat list with source badges ─────────────────────────────
  _renderOverview() {
    const groups = {};
    this.registry.skills.forEach(s => {
      if (!groups[s.category]) groups[s.category] = [];
      groups[s.category].push(s);
    });
    const catOrder = ['agent-coord','memory','code','research','automation','business','infra'];
    const catLabels = {
      'agent-coord': '🤝 Agent Coordination', 'memory': '🧠 Memory',
      'code': '💻 Code', 'research': '🔍 Research',
      'automation': '⚙️ Automation', 'business': '🐾 Business',
      'infra': '🏗️ Infrastructure'
    };
    return catOrder.filter(c => groups[c]).map(cat => `
      <div class="sk-category-group">
        <div class="sk-cat-header">${catLabels[cat] || cat}</div>
        <div class="sk-skill-list">
          ${groups[cat].map(s => this._renderSkillRow(s)).join('')}
        </div>
      </div>
    `).join('');
  }

  _renderSkillRow(s) {
    const meta = window.SOURCE_META?.[s.source] || { label: s.source, color: '#6b7280', bg: '#6b728020', icon: '🔧' };
    const conflict = this.registry.getOverlaps().find(g =>
      g.capability === s.capability && g.skills.length > 1
    );
    const isConflictActive = conflict && conflict.skills.filter(x => x.active).length > 1;
    return `
      <div class="sk-row ${s.active ? 'active' : ''} ${isConflictActive ? 'sk-row-conflict' : ''}">
        <div class="sk-row-left">
          <span class="sk-source-badge" style="background:${meta.bg};color:${meta.color};border-color:${meta.color}40">
            ${meta.icon} ${meta.label}
          </span>
          <span class="sk-row-name">${s.name}</span>
          ${conflict ? `<span class="sk-overlap-tag" title="Overlaps with ${conflict.skills.length - 1} other skill(s)">overlap</span>` : ''}
        </div>
        <div class="sk-row-right">
          <div class="sk-stars" title="Strength ${s.strength}/5">${'★'.repeat(s.strength)}${'☆'.repeat(5-s.strength)}</div>
          ${isConflictActive ? `<button class="sk-compare-btn" data-capability="${s.capability}">Compare</button>` : ''}
          ${s.active
            ? `<button class="sk-toggle-btn sk-toggle-on" data-id="${s.id}">On</button>`
            : `<button class="sk-toggle-btn sk-toggle-off" data-id="${s.id}">Off</button>`
          }
        </div>
      </div>
    `;
  }

  // ── Conflicts / Overlaps ───────────────────────────────────────────────
  _renderConflicts() {
    const featureConflicts = this.registry.getFeatureConflicts();
    const skillConflicts = this.registry.getActiveConflicts();
    const allOverlaps = this.registry.getOverlaps();

    return `
      ${featureConflicts.length > 0 ? `
        <div class="sk-conflict-section">
          <div class="sk-conflict-section-title">
            ⚠ Active Feature Conflicts (${featureConflicts.length})
            <span class="sk-conflict-subtitle">Multiple skills are doing the same thing right now — turn off one sub-feature to isolate.</span>
          </div>
          ${featureConflicts.map(c => `
            <div class="sk-feat-conflict-group">
              <div class="sk-feat-conflict-cap">${window.FEATURE_TAG_LABELS?.[c.tag] || c.tag}</div>
              <div class="sk-feat-conflict-entries">
                ${c.entries.map(e => {
                  const meta = window.SOURCE_META?.[e.skill.source] || { label: e.skill.source, color: '#6b7280', bg: '#6b728020', icon: '🔧' };
                  return `
                    <div class="sk-feat-conflict-entry">
                      <span class="sk-source-badge" style="background:${meta.bg};color:${meta.color};border-color:${meta.color}40">${meta.icon} ${meta.label}</span>
                      <span class="sk-feat-conflict-entry-name">${e.skill.name} → ${e.feature.label}</span>
                      <button class="sk-toggle-btn sk-toggle-on" data-feat-disable="${e.skill.id}:${e.feature.id}">Turn off</button>
                    </div>
                  `;
                }).join('')}
              </div>
            </div>
          `).join('')}
        </div>
      ` : `<div class="sk-feature-ok-banner" style="margin-bottom:12px">✓ No active feature conflicts.</div>`}

      <div class="sk-conflict-section">
        <div class="sk-conflict-section-title">
          Skill-Level Overlaps
          <span class="sk-conflict-subtitle">Skills from different sources that cover the same capability.</span>
        </div>
        ${allOverlaps.length === 0
          ? `<div class="sk-empty">No overlapping capabilities found.</div>`
          : `
            <div class="sk-conflicts-intro">
              Only activate one skill per capability to avoid contradictions.
              ${skillConflicts.length > 0 ? `<strong>${skillConflicts.length} active conflict(s) detected.</strong>` : ''}
            </div>
            ${allOverlaps.map(group => this._renderOverlapGroup(group)).join('')}
          `
        }
      </div>
    `;
  }

  _renderOverlapGroup(group) {
    const activeCount = group.skills.filter(s => s.active).length;
    return `
      <div class="sk-overlap-group ${activeCount > 1 ? 'sk-overlap-conflict' : ''}">
        <div class="sk-overlap-header">
          <span class="sk-overlap-cap">${group.label}</span>
          ${activeCount > 1 ? `<span class="sk-conflict-warn">⚠ ${activeCount} active — conflict!</span>` : ''}
          <button class="sk-compare-full-btn" data-capability="${group.capability}">Full Comparison →</button>
        </div>
        <div class="sk-overlap-skills">
          ${group.skills.map((s, i) => {
            const meta = window.SOURCE_META?.[s.source] || { label: s.source, color: '#6b7280', bg: '#6b728020', icon: '🔧' };
            return `
              <div class="sk-overlap-skill ${s.active ? 'sk-overlap-active' : ''} ${i === 0 ? 'sk-overlap-recommended' : ''}">
                <div class="sk-overlap-skill-header">
                  <span class="sk-source-badge" style="background:${meta.bg};color:${meta.color};border-color:${meta.color}40">
                    ${meta.icon} ${meta.label}
                  </span>
                  ${i === 0 ? '<span class="sk-rec-tag">Recommended</span>' : ''}
                </div>
                <div class="sk-overlap-skill-name">${s.name}</div>
                <div class="sk-overlap-notes">${s.notes}</div>
                <div class="sk-overlap-meta">
                  Strength: ${'★'.repeat(s.strength)}${'☆'.repeat(5-s.strength)} &nbsp;|&nbsp;
                  Speed: ${'★'.repeat(s.speed)}${'☆'.repeat(5-s.speed)} &nbsp;|&nbsp;
                  Cost: ${s.cost}
                </div>
                ${s.active
                  ? `<button class="sk-toggle-btn sk-toggle-on sk-overlap-toggle" data-id="${s.id}">Active — turn off</button>`
                  : `<button class="sk-toggle-btn sk-toggle-off sk-overlap-toggle" data-id="${s.id}">Activate</button>`
                }
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }

  // ── By Source ─────────────────────────────────────────────────────────
  _renderBySource() {
    const sources = [...new Set(this.registry.skills.map(s => s.source))];
    return sources.map(source => {
      const meta = window.SOURCE_META?.[source] || { label: source, color: '#6b7280', bg: '#6b728020', icon: '🔧' };
      const skills = this.registry.getBySource(source);
      const active = skills.filter(s => s.active).length;
      return `
        <div class="sk-source-group">
          <div class="sk-source-header" style="border-left: 3px solid ${meta.color}">
            <span class="sk-source-icon">${meta.icon}</span>
            <span class="sk-source-name" style="color:${meta.color}">${meta.label}</span>
            <span class="sk-source-count">${skills.length} skills &nbsp;·&nbsp; ${active} active</span>
            <div class="sk-source-actions">
              <button class="sk-src-btn" data-src-action="activate-all" data-source="${source}">Activate All</button>
              <button class="sk-src-btn sk-src-btn-off" data-src-action="deactivate-all" data-source="${source}">Deactivate All</button>
            </div>
          </div>
          <div class="sk-skill-list sk-skill-list-compact">
            ${skills.map(s => this._renderSkillRow(s)).join('')}
          </div>
        </div>
      `;
    }).join('');
  }

  // ── Add Manifest (extensible kit tree) ────────────────────────────────
  _renderAddManifest() {
    return `
      <div class="sk-manifest-pane">
        <h3 class="sk-manifest-title">Add New Kits via Manifest</h3>
        <p class="sk-manifest-desc">
          Drop in any JSON manifest to instantly add new skills to ClaudeCodex.
          Any source is supported — JourneyKits expansions, custom agents, third-party tools.
        </p>

        <div class="sk-manifest-format">
          <div class="sk-manifest-format-title">Manifest Format</div>
          <pre class="sk-manifest-code">{
  "source": "my-source-id",
  "sourceLabel": "My Tool",
  "color": "#f59e0b",
  "icon": "🔧",
  "skills": [
    {
      "id": "my-skill-1",
      "name": "My Skill",
      "category": "code",
      "capability": "code-generation",
      "description": "What this skill does",
      "strength": 4,
      "speed": 5,
      "cost": "free",
      "notes": "When to use this vs alternatives"
    }
  ]
}</pre>
        </div>

        <div class="sk-manifest-input-section">
          <div class="sk-manifest-format-title">Paste Manifest JSON</div>
          <textarea id="sk-manifest-input" class="sk-manifest-textarea"
            placeholder='Paste your manifest JSON here…'></textarea>
          <div class="sk-manifest-actions">
            <button id="sk-btn-load-manifest" class="jk-btn jk-btn-install">Load Manifest</button>
            <button id="sk-btn-load-sample" class="jk-btn jk-btn-info">Load Sample</button>
          </div>
          <div id="sk-manifest-result" class="sk-manifest-result"></div>
        </div>

        <div class="sk-manifest-input-section">
          <div class="sk-manifest-format-title">Loaded Custom Manifests</div>
          <div id="sk-loaded-manifests">
            ${this._renderLoadedManifests()}
          </div>
        </div>
      </div>
    `;
  }

  _renderLoadedManifests() {
    try {
      const stored = JSON.parse(localStorage.getItem('sk_manifests') || '[]');
      if (stored.length === 0) return '<div class="sk-empty">No custom manifests loaded yet.</div>';
      return stored.map((m, i) => `
        <div class="sk-loaded-manifest">
          <span>${m.icon || '🔧'} <strong>${m.sourceLabel || m.source}</strong></span>
          <span>${m.skills?.length || 0} skills</span>
          <button class="sk-src-btn sk-src-btn-off" data-remove-manifest="${i}">Remove</button>
        </div>
      `).join('');
    } catch (_) { return ''; }
  }

  // ── Comparison modal ───────────────────────────────────────────────────
  _showCompareModal(capability) {
    const group = this.registry.getOverlaps().find(g => g.capability === capability);
    if (!group) return;
    const existing = document.getElementById('sk-compare-modal');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = 'sk-compare-modal';
    modal.className = 'sk-modal-backdrop';
    modal.innerHTML = `
      <div class="sk-modal-box">
        <div class="sk-modal-header">
          <h3>Comparing: ${group.label}</h3>
          <button class="jk-detail-close" id="sk-modal-close">✕</button>
        </div>
        <div class="sk-modal-body">
          <p class="sk-modal-intro">
            ${group.skills.length} skills provide <strong>${group.label}</strong>.
            Activate only the one that best fits your current workflow.
          </p>
          <div class="sk-compare-grid">
            ${group.skills.map((s, i) => {
              const meta = window.SOURCE_META?.[s.source] || { label: s.source, color: '#6b7280', bg: '#6b728020', icon: '🔧' };
              return `
                <div class="sk-compare-card ${i === 0 ? 'sk-compare-best' : ''}">
                  ${i === 0 ? '<div class="sk-compare-ribbon">Best Overall</div>' : ''}
                  <div class="sk-source-badge" style="background:${meta.bg};color:${meta.color};border-color:${meta.color}40;margin-bottom:8px">
                    ${meta.icon} ${meta.label}
                  </div>
                  <div class="sk-compare-name">${s.name}</div>
                  <div class="sk-compare-desc">${s.description}</div>
                  <table class="sk-compare-table">
                    <tr><td>Strength</td><td>${'★'.repeat(s.strength)}${'☆'.repeat(5-s.strength)}</td></tr>
                    <tr><td>Speed</td><td>${'★'.repeat(s.speed)}${'☆'.repeat(5-s.speed)}</td></tr>
                    <tr><td>Cost</td><td>${s.cost}</td></tr>
                  </table>
                  <div class="sk-compare-notes">${s.notes}</div>
                  ${s.active
                    ? `<button class="sk-toggle-btn sk-toggle-on" data-id="${s.id}" style="width:100%;margin-top:8px">Active — turn off</button>`
                    : `<button class="sk-toggle-btn sk-toggle-off" data-id="${s.id}" style="width:100%;margin-top:8px">Activate</button>`
                  }
                </div>
              `;
            }).join('')}
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    document.getElementById('sk-modal-close').onclick = () => modal.remove();
    modal.onclick = e => { if (e.target === modal) modal.remove(); };
    modal.querySelectorAll('[data-id]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        const skill = this.registry.findById(id);
        if (!skill) return;
        if (skill.active) {
          this.registry.deactivate(id);
        } else {
          // Deactivate conflicting skills first
          group.skills.forEach(s => { if (s.id !== id) this.registry.deactivate(s.id); });
          this.registry.activate(id);
        }
        modal.remove();
        this._render();
      });
    });
  }

  // ── Events ────────────────────────────────────────────────────────────
  _bindEvents(el) {
    // Feature checkboxes (change event)
    el.addEventListener('change', e => {
      const cb = e.target.closest('input[data-feature-id]');
      if (!cb) return;
      this.registry.setFeatureEnabled(cb.dataset.skillId, cb.dataset.featureId, cb.checked);
      this._render();
    });

    el.addEventListener('click', e => {
      // All On / All Off for a skill's features
      const featAllBtn = e.target.closest('[data-feat-all]');
      if (featAllBtn) {
        const skillId = featAllBtn.dataset.skillId;
        const action = featAllBtn.dataset.featAll;
        const skill = this.registry.findById(skillId);
        if (skill && skill.features) {
          skill.features.forEach(f => {
            this.registry.setFeatureEnabled(skillId, f.id, action === 'enable');
          });
        }
        this._render();
        return;
      }

      // Turn off specific feature from conflict list
      const featDisableBtn = e.target.closest('[data-feat-disable]');
      if (featDisableBtn) {
        const [skillId, featureId] = featDisableBtn.dataset.featDisable.split(':');
        this.registry.setFeatureEnabled(skillId, featureId, false);
        this._render();
        return;
      }

      const vtab = e.target.closest('[data-view]');
      const toggleBtn = e.target.closest('[data-id]');
      const compareBtn = e.target.closest('[data-capability]');
      const srcAction = e.target.closest('[data-src-action]');
      const loadManifestBtn = e.target.id === 'sk-btn-load-manifest';
      const sampleBtn = e.target.id === 'sk-btn-load-sample';
      const removeManifest = e.target.closest('[data-remove-manifest]');

      if (vtab) {
        this.view = vtab.dataset.view;
        this._render();
        return;
      }

      if (toggleBtn) {
        const id = toggleBtn.dataset.id;
        const skill = this.registry.findById(id);
        if (!skill) return;
        if (skill.active) {
          this.registry.deactivate(id);
        } else {
          this.registry.activate(id);
          // Check for newly created conflict
          const conflicts = this.registry.getActiveConflicts();
          const affected = conflicts.find(g => g.skills.find(s => s.id === id));
          if (affected) {
            setTimeout(() => this._showCompareModal(affected.capability), 100);
          }
        }
        this._render();
        return;
      }

      if (compareBtn) {
        this._showCompareModal(compareBtn.dataset.capability);
        return;
      }

      if (srcAction) {
        const source = srcAction.dataset.source;
        const action = srcAction.dataset.srcAction;
        if (action === 'activate-all') {
          this.registry.getBySource(source).forEach(s => this.registry.activate(s.id));
        } else if (action === 'deactivate-all') {
          this.registry.deactivateSource(source);
        }
        this._render();
        return;
      }

      if (loadManifestBtn) {
        const textarea = document.getElementById('sk-manifest-input');
        const result = document.getElementById('sk-manifest-result');
        try {
          const manifest = JSON.parse(textarea.value);
          this.registry.loadManifest(manifest);
          result.textContent = `✅ Loaded ${manifest.skills?.length || 0} skills from "${manifest.sourceLabel || manifest.source}"`;
          result.style.color = '#22c55e';
          this._render();
        } catch (err) {
          result.textContent = `❌ Invalid JSON: ${err.message}`;
          result.style.color = '#ef4444';
        }
        return;
      }

      if (sampleBtn) {
        const sample = {
          source: 'my-tool',
          sourceLabel: 'My Custom Tool',
          color: '#f59e0b',
          icon: '🔧',
          skills: [{
            id: 'my-skill-example',
            name: 'Example Custom Skill',
            category: 'code',
            capability: 'code-generation',
            description: 'An example skill from a custom manifest.',
            strength: 3, speed: 4, cost: 'free',
            notes: 'Replace this with your actual skill details.'
          }]
        };
        const textarea = document.getElementById('sk-manifest-input');
        if (textarea) textarea.value = JSON.stringify(sample, null, 2);
        return;
      }

      if (removeManifest) {
        const idx = parseInt(removeManifest.dataset.removeManifest);
        try {
          const stored = JSON.parse(localStorage.getItem('sk_manifests') || '[]');
          stored.splice(idx, 1);
          localStorage.setItem('sk_manifests', JSON.stringify(stored));
          // Reload page to re-init registry without the removed manifest
          location.reload();
        } catch (_) {}
        return;
      }
    });
  }
}

window.SkillsOverview = SkillsOverview;
