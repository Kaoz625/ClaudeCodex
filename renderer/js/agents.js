// ── oh-my-claudecode Agent Monitor ── //

// All 19 oh-my-claudecode agents with their skills and roles
export const OMC_AGENTS = [
  { id: 'orchestrator',  name: 'Orchestrator',   icon: '🎯', color: '#cc785c', role: 'Coordinates all agents and manages the master task list', skills: ['task-routing', 'agent-delegation', 'progress-tracking'] },
  { id: 'architect',     name: 'Architect',       icon: '🏗️',  color: '#5b8dd9', role: 'Designs system architecture and high-level structure', skills: ['system-design', 'api-design', 'schema-design'] },
  { id: 'coder',         name: 'Coder',           icon: '💻', color: '#3fc56b', role: 'Implements features and writes production code', skills: ['implementation', 'refactoring', 'optimization'] },
  { id: 'reviewer',      name: 'Reviewer',        icon: '👁️',  color: '#c792ea', role: 'Reviews code for quality, bugs, and best practices', skills: ['code-review', 'security-audit', 'style-check'] },
  { id: 'tester',        name: 'Tester',          icon: '🧪', color: '#e9b143', role: 'Writes and runs tests to verify correctness', skills: ['unit-tests', 'integration-tests', 'e2e-tests'] },
  { id: 'debugger',      name: 'Debugger',        icon: '🐛', color: '#e06c75', role: 'Finds and fixes bugs across the codebase', skills: ['bug-detection', 'root-cause-analysis', 'hotfix'] },
  { id: 'documenter',    name: 'Documenter',      icon: '📝', color: '#56b6c2', role: 'Writes documentation, READMEs, and API docs', skills: ['readme', 'jsdoc', 'api-docs', 'changelogs'] },
  { id: 'researcher',    name: 'Researcher',      icon: '🔬', color: '#98c379', role: 'Deep dives into libraries, APIs, and technical topics', skills: ['library-research', 'benchmarking', 'tech-analysis'] },
  { id: 'planner',       name: 'Planner',         icon: '📋', color: '#cc785c', role: 'Breaks down vague requirements into actionable tasks', skills: ['task-decomposition', 'estimation', 'sprint-planning'] },
  { id: 'security',      name: 'Security',        icon: '🔒', color: '#e06c75', role: 'Audits code for security vulnerabilities', skills: ['owasp', 'dependency-audit', 'secret-scanning'] },
  { id: 'devops',        name: 'DevOps',          icon: '⚙️',  color: '#5b8dd9', role: 'Manages CI/CD, deployment, and infrastructure', skills: ['docker', 'ci-cd', 'k8s', 'terraform'] },
  { id: 'ui-designer',   name: 'UI Designer',     icon: '🎨', color: '#c792ea', role: 'Designs and implements UI components and layouts', skills: ['css', 'components', 'accessibility', 'responsive'] },
  { id: 'data-engineer', name: 'Data Engineer',   icon: '🗄️',  color: '#e9b143', role: 'Designs databases, schemas, and data pipelines', skills: ['sql', 'migrations', 'data-modeling', 'etl'] },
  { id: 'optimizer',     name: 'Optimizer',       icon: '⚡', color: '#3fc56b', role: 'Profiles and optimizes performance bottlenecks', skills: ['profiling', 'caching', 'query-opt', 'bundle-size'] },
  { id: 'interviewer',   name: 'Interviewer',     icon: '🎤', color: '#56b6c2', role: 'Runs deep interviews to clarify requirements (Socratic)', skills: ['deep-interview', 'requirements-elicitation'] },
  { id: 'refactorer',    name: 'Refactorer',      icon: '🔄', color: '#98c379', role: 'Refactors and cleans up code without changing behavior', skills: ['refactoring', 'dry-principles', 'solid'] },
  { id: 'integrator',    name: 'Integrator',      icon: '🔗', color: '#cc785c', role: 'Integrates third-party APIs and services', skills: ['api-integration', 'webhooks', 'oauth', 'sdks'] },
  { id: 'monitor',       name: 'Monitor',         icon: '📊', color: '#5b8dd9', role: 'Monitors system health, logs, and metrics', skills: ['logging', 'metrics', 'alerting', 'dashboards'] },
  { id: 'deployer',      name: 'Deployer',        icon: '🚀', color: '#e9b143', role: 'Handles final deployment and release management', skills: ['release', 'versioning', 'rollback', 'blue-green'] },
];

export class AgentsManager {
  constructor() {
    this.agentStates = {};   // { agentId: { status, task, startedAt, completedTasks } }
    this.processMap  = {};   // running claude processes by name
    this.pollInterval = null;
    this.taskLog = this.load('omcTaskLog', []);

    this.init();
    this.startPolling();
  }

  load(key, def) { try { return JSON.parse(localStorage.getItem(key) ?? 'null') ?? def; } catch { return def; } }
  save(key, val) { localStorage.setItem(key, JSON.stringify(val)); }

  init() {
    this.renderGrid();
    this.wireControls();
  }

  wireControls() {
    document.getElementById('btn-agents-refresh')?.addEventListener('click', () => this.pollAgents());
    document.getElementById('btn-agents-start-omc')?.addEventListener('click', () => this.startOMC());
    document.getElementById('btn-agents-clear-log')?.addEventListener('click', () => this.clearLog());

    // Filter chips
    document.querySelectorAll('.agent-filter-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        document.querySelectorAll('.agent-filter-chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        this.applyFilter(chip.dataset.filter);
      });
    });
  }

  // ── Poll for active agents via claude process list ──
  async startPolling() {
    await this.pollAgents();
    this.pollInterval = setInterval(() => this.pollAgents(), 3000);
  }

  async pollAgents() {
    try {
      // Ask main process to list running claude CLI processes
      const result = await window.api.listAgentProcesses?.();
      if (result?.processes) {
        this.reconcileProcesses(result.processes);
      }
    } catch (_) {}
    this.renderGrid();
    this.updateStats();
  }

  reconcileProcesses(processes) {
    const now = Date.now();
    // Match process names/args to known agent IDs
    processes.forEach(proc => {
      const matched = this.matchProcessToAgent(proc);
      if (matched) {
        if (!this.agentStates[matched]) this.agentStates[matched] = {};
        this.agentStates[matched].status = 'working';
        this.agentStates[matched].task   = proc.task || 'Running…';
        this.agentStates[matched].pid    = proc.pid;
        this.agentStates[matched].startedAt = this.agentStates[matched].startedAt || now;
      }
    });

    // Mark agents not in process list as idle
    OMC_AGENTS.forEach(a => {
      const inProc = processes.some(p => this.matchProcessToAgent(p) === a.id);
      if (!inProc && this.agentStates[a.id]?.status === 'working') {
        // Was working, now done
        const prev = this.agentStates[a.id];
        this.logTask(a.id, a.name, prev.task, now - (prev.startedAt || now));
        this.agentStates[a.id] = { status: 'idle', lastCompleted: now, completedTasks: (prev.completedTasks || 0) + 1 };
      }
    });
  }

  matchProcessToAgent(proc) {
    const args = (proc.args || '').toLowerCase();
    for (const agent of OMC_AGENTS) {
      if (args.includes(agent.id) || args.includes(agent.name.toLowerCase())) {
        return agent.id;
      }
    }
    return null;
  }

  // ── Simulate agent activity for demo (when no real process data) ──
  simulateActivity(agentId, task) {
    if (!this.agentStates[agentId]) this.agentStates[agentId] = {};
    this.agentStates[agentId].status = 'working';
    this.agentStates[agentId].task = task;
    this.agentStates[agentId].startedAt = Date.now();
    this.renderGrid();
    this.updateStats();

    // Auto-complete after random time
    const duration = 4000 + Math.random() * 8000;
    setTimeout(() => {
      const prev = this.agentStates[agentId];
      this.logTask(agentId, OMC_AGENTS.find(a => a.id === agentId)?.name || agentId, task, duration);
      this.agentStates[agentId] = {
        status: 'idle',
        lastCompleted: Date.now(),
        completedTasks: (prev.completedTasks || 0) + 1,
      };
      this.renderGrid();
      this.updateStats();
    }, duration);
  }

  logTask(agentId, agentName, task, durationMs) {
    this.taskLog.unshift({
      ts: new Date().toISOString(),
      agentId, agentName, task,
      duration: Math.round(durationMs / 1000),
    });
    if (this.taskLog.length > 200) this.taskLog.pop();
    this.save('omcTaskLog', this.taskLog);
    this.renderActivityLog();
  }

  clearLog() {
    this.taskLog = [];
    this.save('omcTaskLog', this.taskLog);
    this.renderActivityLog();
  }

  startOMC() {
    // Show info on how to start oh-my-claudecode
    const info = document.getElementById('agents-omc-info');
    if (info) {
      info.classList.toggle('hidden');
    }
  }

  applyFilter(filter) {
    document.querySelectorAll('.agent-card').forEach(card => {
      const status = card.dataset.status;
      if (filter === 'all' || status === filter) {
        card.style.display = '';
      } else {
        card.style.display = 'none';
      }
    });
  }

  // ── Render ──
  renderGrid() {
    const grid = document.getElementById('agents-grid');
    if (!grid) return;

    grid.innerHTML = '';
    OMC_AGENTS.forEach(agent => {
      const state  = this.agentStates[agent.id] || { status: 'idle' };
      const status = state.status || 'idle';
      const elapsed = state.startedAt ? Math.round((Date.now() - state.startedAt) / 1000) : 0;

      const card = document.createElement('div');
      card.className = `agent-card status-${status}`;
      card.dataset.status = status;
      card.dataset.agentId = agent.id;

      card.innerHTML = `
        <div class="agent-card-top">
          <div class="agent-icon" style="background:${agent.color}20;border-color:${agent.color}40">
            <span>${agent.icon}</span>
          </div>
          <div class="agent-status-dot ${status}"></div>
        </div>
        <div class="agent-name">${agent.name}</div>
        <div class="agent-role">${agent.role}</div>
        ${status === 'working' ? `
          <div class="agent-task-wrap">
            <div class="agent-task-label">Working on:</div>
            <div class="agent-task">${this.esc(state.task || '…')}</div>
            <div class="agent-elapsed">${this.fmtDuration(elapsed)}</div>
          </div>` : ''}
        ${status === 'idle' && state.lastCompleted ? `
          <div class="agent-last">✓ ${state.completedTasks || 0} task${state.completedTasks !== 1 ? 's' : ''} completed</div>` : ''}
        <div class="agent-skills">
          ${agent.skills.slice(0, 3).map(s => `<span class="skill-tag">${s}</span>`).join('')}
        </div>`;

      // Click to simulate activity (demo mode)
      card.addEventListener('click', () => {
        if (status !== 'working') {
          const demoTasks = [
            'Analyzing code structure…',
            'Writing unit tests…',
            'Reviewing pull request…',
            'Optimizing queries…',
            'Generating documentation…',
            'Debugging error trace…',
          ];
          this.simulateActivity(agent.id, demoTasks[Math.floor(Math.random() * demoTasks.length)]);
        }
      });

      grid.appendChild(card);
    });

    this.renderActivityLog();
  }

  renderActivityLog() {
    const log = document.getElementById('agents-activity-log');
    if (!log) return;

    if (!this.taskLog.length) {
      log.innerHTML = `<div class="agents-log-empty">No activity yet. Agents will log tasks here when they run.</div>`;
      return;
    }

    log.innerHTML = this.taskLog.slice(0, 50).map(entry => {
      const agent = OMC_AGENTS.find(a => a.id === entry.agentId);
      return `
        <div class="log-entry">
          <span class="log-icon">${agent?.icon || '🤖'}</span>
          <div class="log-info">
            <span class="log-agent" style="color:${agent?.color || 'var(--accent)'}">${entry.agentName}</span>
            <span class="log-task">${this.esc(entry.task)}</span>
          </div>
          <div class="log-meta">
            <span class="log-duration">${entry.duration}s</span>
            <span class="log-time">${this.fmtTime(entry.ts)}</span>
          </div>
        </div>`;
    }).join('');
  }

  updateStats() {
    const working = OMC_AGENTS.filter(a => this.agentStates[a.id]?.status === 'working').length;
    const idle    = OMC_AGENTS.length - working;
    const total   = this.taskLog.length;

    const el = document.getElementById('agents-stats');
    if (!el) return;
    el.innerHTML = `
      <div class="agent-stat"><span class="stat-num active-num">${working}</span><span class="stat-label">Active</span></div>
      <div class="agent-stat"><span class="stat-num">${idle}</span><span class="stat-label">Idle</span></div>
      <div class="agent-stat"><span class="stat-num">${OMC_AGENTS.length}</span><span class="stat-label">Total Agents</span></div>
      <div class="agent-stat"><span class="stat-num">${total}</span><span class="stat-label">Tasks Run</span></div>`;
  }

  fmtDuration(sec) {
    if (sec < 60) return `${sec}s`;
    return `${Math.floor(sec/60)}m ${sec%60}s`;
  }
  fmtTime(iso) { try { return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); } catch { return ''; } }
  esc(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
}
