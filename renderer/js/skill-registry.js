/**
 * Skill Registry — single source of truth for ALL skills/connectors
 * across every provider (Claude Code, Hermes, JourneyKits, Antigravity, Gemini, etc.)
 *
 * To add new kits later: drop a JSON file in kits/ following the manifest format,
 * or call SkillRegistry.loadManifest(manifestObject).
 *
 * Each skill entry:
 *   id           — unique string
 *   name         — display name
 *   source       — 'claude-code' | 'hermes' | 'journeykits' | 'antigravity' | 'gemini' | 'openrouter' | 'custom'
 *   category     — 'memory' | 'code' | 'research' | 'automation' | 'business' | 'infra' | 'agent-coord'
 *   capability   — normalized function tag used for overlap detection (e.g. 'github-triage', 'memory-persist')
 *   description  — short description
 *   strength     — 1–5 rating for this source's version of this capability
 *   speed        — 1–5 (5 = fastest)
 *   cost         — 'free' | 'low' | 'medium' | 'high'
 *   active       — bool (managed at runtime)
 *   installed    — bool (managed at runtime)
 *   notes        — why you'd pick this over another source
 *   features     — array of sub-feature objects: { id, label, capabilityTag, enabled }
 *                  capabilityTag links sub-features across skills for fine-grained conflict detection
 */

const BUILT_IN_SKILLS = [
  // ── Claude Code / oh-my-claudecode ─────────────────────────────────────
  {
    id: 'omc-orchestrator',
    name: 'Orchestrator Agent',
    source: 'claude-code',
    category: 'agent-coord',
    capability: 'agent-coordination',
    description: 'Routes tasks across all 19 oh-my-claudecode agents, manages the shared task list.',
    strength: 5, speed: 4, cost: 'low',
    notes: 'Deepest integration with claude CLI; native tmux session control.',
    features: [
      { id: 'omc-orch-routing',   label: 'Task routing',       capabilityTag: 'task-routing',      enabled: true },
      { id: 'omc-orch-tasklist',  label: 'Shared task list',   capabilityTag: 'task-list',         enabled: true },
      { id: 'omc-orch-tmux',      label: 'tmux session mgmt',  capabilityTag: 'tmux-control',      enabled: true },
      { id: 'omc-orch-escalate',  label: 'Conflict escalation',capabilityTag: 'conflict-resolve',  enabled: true }
    ]
  },
  {
    id: 'omc-coder',
    name: 'Coder Agent',
    source: 'claude-code',
    category: 'code',
    capability: 'code-generation',
    description: 'Writes and edits code files, runs tests, fixes lint errors.',
    strength: 5, speed: 4, cost: 'low',
    notes: 'Runs inside your actual workspace — reads/writes real files.',
    features: [
      { id: 'omc-coder-write',   label: 'File write/edit',    capabilityTag: 'file-edit',        enabled: true },
      { id: 'omc-coder-tests',   label: 'Run tests',          capabilityTag: 'test-execution',   enabled: true },
      { id: 'omc-coder-lint',    label: 'Lint fix',           capabilityTag: 'lint-fix',         enabled: true },
      { id: 'omc-coder-gen',     label: 'Code generation',    capabilityTag: 'ai-code-gen',      enabled: true }
    ]
  },
  {
    id: 'omc-reviewer',
    name: 'Reviewer Agent',
    source: 'claude-code',
    category: 'code',
    capability: 'code-review',
    description: 'Reviews PRs and diffs for bugs, style, and security issues.',
    strength: 5, speed: 3, cost: 'low',
    notes: 'Integrated with git — sees the actual diff, not just the description.',
    features: [
      { id: 'omc-rev-diff',      label: 'Diff analysis',      capabilityTag: 'diff-review',      enabled: true },
      { id: 'omc-rev-style',     label: 'Style check',        capabilityTag: 'style-review',     enabled: true },
      { id: 'omc-rev-security',  label: 'Security scan',      capabilityTag: 'security-review',  enabled: true },
      { id: 'omc-rev-suggest',   label: 'Inline suggestions', capabilityTag: 'code-suggestion',  enabled: true }
    ]
  },
  {
    id: 'omc-researcher',
    name: 'Researcher Agent',
    source: 'claude-code',
    category: 'research',
    capability: 'web-research',
    description: 'Searches the web and summarizes findings for other agents.',
    strength: 4, speed: 3, cost: 'low',
    notes: 'Uses claude CLI web search tool; result feeds directly into task queue.',
    features: [
      { id: 'omc-res-search',    label: 'Web search',         capabilityTag: 'web-search',       enabled: true },
      { id: 'omc-res-summarize', label: 'Auto-summarize',     capabilityTag: 'auto-summarize',   enabled: true },
      { id: 'omc-res-cite',      label: 'Source citations',   capabilityTag: 'source-citation',  enabled: true }
    ]
  },
  {
    id: 'omc-debugger',
    name: 'Debugger Agent',
    source: 'claude-code',
    category: 'code',
    capability: 'error-debugging',
    description: 'Traces errors, reads logs, and applies fixes.',
    strength: 5, speed: 4, cost: 'low',
    notes: 'Has direct file and terminal access — can actually run the fix.',
    features: [
      { id: 'omc-dbg-trace',     label: 'Stack trace analysis',capabilityTag: 'stack-trace',      enabled: true },
      { id: 'omc-dbg-logs',      label: 'Log correlation',    capabilityTag: 'log-analysis',     enabled: true },
      { id: 'omc-dbg-fix',       label: 'Auto-apply fix',     capabilityTag: 'auto-fix',         enabled: true },
      { id: 'omc-dbg-repro',     label: 'Repro test gen',     capabilityTag: 'repro-test',       enabled: true }
    ]
  },
  {
    id: 'omc-security',
    name: 'Security Agent',
    source: 'claude-code',
    category: 'code',
    capability: 'security-audit',
    description: 'Scans code for OWASP vulnerabilities and secrets leaks.',
    strength: 4, speed: 3, cost: 'low',
    notes: 'Runs against the real codebase, not just description.',
    features: [
      { id: 'omc-sec-owasp',     label: 'OWASP scan',         capabilityTag: 'owasp-scan',       enabled: true },
      { id: 'omc-sec-secrets',   label: 'Secrets detection',  capabilityTag: 'secrets-scan',     enabled: true },
      { id: 'omc-sec-deps',      label: 'Dep vulnerability',  capabilityTag: 'dep-vuln-scan',    enabled: true }
    ]
  },

  // ── Hermes ──────────────────────────────────────────────────────────────
  {
    id: 'hermes-memory',
    name: 'Hermes Long-Term Memory',
    source: 'hermes',
    category: 'memory',
    capability: 'memory-persist',
    description: 'Persists context across sessions using Hermes agent memory store.',
    strength: 5, speed: 4, cost: 'free',
    notes: 'Runs locally at localhost:8787; no API cost. Best for personal long-term context.',
    features: [
      { id: 'h-mem-store',       label: 'Memory store',       capabilityTag: 'memory-store',     enabled: true },
      { id: 'h-mem-search',      label: 'Memory search',      capabilityTag: 'memory-search',    enabled: true },
      { id: 'h-mem-restore',     label: 'Session restore',    capabilityTag: 'session-restore',  enabled: true },
      { id: 'h-mem-prune',       label: 'Auto-prune old ctx', capabilityTag: 'memory-prune',     enabled: true }
    ]
  },
  {
    id: 'hermes-tool-use',
    name: 'Hermes Tool Invocation',
    source: 'hermes',
    category: 'automation',
    capability: 'tool-calling',
    description: 'Model-agnostic tool calling with human approval gates.',
    strength: 4, speed: 3, cost: 'free',
    notes: 'Works with any model (Claude, GPT, Gemini, local). Approval gates prevent unsafe actions.',
    features: [
      { id: 'h-tool-exec',       label: 'Tool execution',     capabilityTag: 'tool-exec',        enabled: true },
      { id: 'h-tool-approval',   label: 'Approval gates',     capabilityTag: 'human-approval',   enabled: true },
      { id: 'h-tool-multimodel', label: 'Multi-model routing',capabilityTag: 'model-routing',    enabled: true }
    ]
  },
  {
    id: 'hermes-web-search',
    name: 'Hermes Web Search',
    source: 'hermes',
    category: 'research',
    capability: 'web-research',
    description: 'Web search with source tracking, used inside Hermes agent flows.',
    strength: 3, speed: 4, cost: 'free',
    notes: 'Lightweight; best for quick lookups inside long Hermes sessions.',
    features: [
      { id: 'h-ws-search',       label: 'Web search',         capabilityTag: 'web-search',       enabled: true },
      { id: 'h-ws-sources',      label: 'Source tracking',    capabilityTag: 'source-citation',  enabled: true }
    ]
  },

  // ── JourneyKits ─────────────────────────────────────────────────────────
  {
    id: 'jk-council-lane',
    name: 'Council Lane Pattern',
    source: 'journeykits',
    category: 'agent-coord',
    capability: 'agent-coordination',
    description: 'Multi-agent voting, task handoff, and conflict resolution protocol.',
    strength: 4, speed: 3, cost: 'free',
    notes: 'Higher-level protocol than omc-orchestrator; designed for consensus-based decisions.',
    features: [
      { id: 'jk-cl-vote',        label: 'Agent voting',       capabilityTag: 'agent-vote',       enabled: true },
      { id: 'jk-cl-handoff',     label: 'Task handoff',       capabilityTag: 'task-routing',     enabled: true },
      { id: 'jk-cl-resolve',     label: 'Conflict resolution',capabilityTag: 'conflict-resolve', enabled: true }
    ]
  },
  {
    id: 'jk-metacortex',
    name: 'MetaCortex MCP Memory',
    source: 'journeykits',
    category: 'memory',
    capability: 'memory-persist',
    description: 'MCP-native persistent memory shared across all agents.',
    strength: 5, speed: 3, cost: 'free',
    notes: 'MCP-compatible; works with Claude, omc agents, and Hermes simultaneously.',
    features: [
      { id: 'jk-mx-store',       label: 'Memory store',       capabilityTag: 'memory-store',     enabled: true },
      { id: 'jk-mx-search',      label: 'Memory search',      capabilityTag: 'memory-search',    enabled: true },
      { id: 'jk-mx-crossagent',  label: 'Cross-agent share',  capabilityTag: 'cross-agent-mem',  enabled: true },
      { id: 'jk-mx-prune',       label: 'Auto-prune',         capabilityTag: 'memory-prune',     enabled: true }
    ]
  },
  {
    id: 'jk-second-brain',
    name: 'Second Brain',
    source: 'journeykits',
    category: 'memory',
    capability: 'knowledge-base',
    description: 'Searchable knowledge base for notes, SOPs, and project docs.',
    strength: 5, speed: 3, cost: 'free',
    notes: 'Better for structured knowledge (SOPs, docs) vs raw conversation memory.',
    features: [
      { id: 'jk-sb-ingest',      label: 'Note ingestion',     capabilityTag: 'note-ingest',      enabled: true },
      { id: 'jk-sb-search',      label: 'Semantic search',    capabilityTag: 'memory-search',    enabled: true },
      { id: 'jk-sb-links',       label: 'Link graph',         capabilityTag: 'knowledge-graph',  enabled: true },
      { id: 'jk-sb-tags',        label: 'Auto-tagging',       capabilityTag: 'auto-tag',         enabled: true }
    ]
  },
  {
    id: 'jk-github-triage',
    name: 'GitHub Issue & PR Auto-Triage',
    source: 'journeykits',
    category: 'automation',
    capability: 'github-triage',
    description: 'Auto-labels, assigns, and prioritizes GitHub issues and PRs.',
    strength: 4, speed: 4, cost: 'low',
    notes: 'Prompt-based; no GitHub App required. Works with any repo via GitHub API.',
    features: [
      { id: 'jk-gh-label',       label: 'Auto-labeling',      capabilityTag: 'gh-auto-label',    enabled: true },
      { id: 'jk-gh-priority',    label: 'Priority scoring',   capabilityTag: 'gh-priority',      enabled: true },
      { id: 'jk-gh-assign',      label: 'Assignee routing',   capabilityTag: 'gh-assign',        enabled: true },
      { id: 'jk-gh-stale',       label: 'Stale issue alerts', capabilityTag: 'gh-stale',         enabled: true }
    ]
  },
  {
    id: 'jk-error-investigator',
    name: 'Error Alert Investigator',
    source: 'journeykits',
    category: 'code',
    capability: 'error-debugging',
    description: 'Root cause analysis and fix suggestions from error/log input.',
    strength: 4, speed: 4, cost: 'low',
    notes: 'Better for structured error analysis reports; omc-debugger is better for live fixes.',
    features: [
      { id: 'jk-ei-trace',       label: 'Stack trace analysis',capabilityTag: 'stack-trace',      enabled: true },
      { id: 'jk-ei-logs',        label: 'Log correlation',    capabilityTag: 'log-analysis',     enabled: true },
      { id: 'jk-ei-report',      label: 'Root cause report',  capabilityTag: 'rca-report',       enabled: true },
      { id: 'jk-ei-suggest',     label: 'Fix suggestion',     capabilityTag: 'fix-suggest',      enabled: true }
    ]
  },
  {
    id: 'jk-web-rag',
    name: 'Web Scraping → RAG',
    source: 'journeykits',
    category: 'research',
    capability: 'web-research',
    description: 'Scrape any URL, chunk, embed, and Q&A over the content.',
    strength: 5, speed: 2, cost: 'low',
    notes: 'Best for deep research over a specific document. Slower than quick web search.',
    features: [
      { id: 'jk-wr-scrape',      label: 'URL scraping',       capabilityTag: 'web-scrape',       enabled: true },
      { id: 'jk-wr-embed',       label: 'Chunk + embed',      capabilityTag: 'rag-embed',        enabled: true },
      { id: 'jk-wr-vector',      label: 'Vector store',       capabilityTag: 'vector-store',     enabled: true },
      { id: 'jk-wr-qa',          label: 'Q&A over docs',      capabilityTag: 'doc-qa',           enabled: true }
    ]
  },
  {
    id: 'jk-refactoring-planner',
    name: 'Code Refactoring Planner',
    source: 'journeykits',
    category: 'code',
    capability: 'code-refactor',
    description: 'Risk-scored refactoring plan with rollback checkpoints.',
    strength: 4, speed: 3, cost: 'low',
    notes: 'Planning only — pairs with omc-coder to actually execute the plan.',
    features: [
      { id: 'jk-rp-depmap',      label: 'Dependency map',     capabilityTag: 'dep-map',          enabled: true },
      { id: 'jk-rp-risk',        label: 'Risk scoring',       capabilityTag: 'refactor-risk',    enabled: true },
      { id: 'jk-rp-plan',        label: 'Step-by-step plan',  capabilityTag: 'refactor-plan',    enabled: true },
      { id: 'jk-rp-rollback',    label: 'Rollback points',    capabilityTag: 'rollback',         enabled: true }
    ]
  },
  {
    id: 'jk-changelog',
    name: 'Changelog Generator',
    source: 'journeykits',
    category: 'code',
    capability: 'release-notes',
    description: 'Generates CHANGELOG.md and release notes from git commits.',
    strength: 4, speed: 4, cost: 'low',
    notes: 'Standard Keep a Changelog format; pairs with omc-reviewer for quality check.',
    features: [
      { id: 'jk-cg-categorize',  label: 'Commit categorize',  capabilityTag: 'commit-cat',       enabled: true },
      { id: 'jk-cg-semver',      label: 'Semver detection',   capabilityTag: 'semver',           enabled: true },
      { id: 'jk-cg-md',          label: 'CHANGELOG.md write', capabilityTag: 'changelog-write',  enabled: true },
      { id: 'jk-cg-release',     label: 'GitHub release draft',capabilityTag: 'gh-release',      enabled: true }
    ]
  },
  {
    id: 'jk-crm',
    name: 'Personal CRM (Tailblazers)',
    source: 'journeykits',
    category: 'business',
    capability: 'crm',
    description: 'Client and dog profiles, walk history, veteran notes.',
    strength: 5, speed: 4, cost: 'free',
    notes: 'Custom-built for Tailblazers. No other source has this capability.',
    features: [
      { id: 'jk-crm-clients',    label: 'Client profiles',    capabilityTag: 'crm-client',       enabled: true },
      { id: 'jk-crm-dogs',       label: 'Dog profiles',       capabilityTag: 'crm-dog',          enabled: true },
      { id: 'jk-crm-history',    label: 'Walk history',       capabilityTag: 'crm-history',      enabled: true },
      { id: 'jk-crm-veteran',    label: 'Veteran notes',      capabilityTag: 'crm-veteran',      enabled: true }
    ]
  },
  {
    id: 'jk-content-repurposer',
    name: 'Content Repurposer',
    source: 'journeykits',
    category: 'business',
    capability: 'content-creation',
    description: 'Turns blog/stories into platform-specific social posts.',
    strength: 4, speed: 4, cost: 'low',
    notes: 'Tailblazers-tuned tone. Gemini is stronger for raw creative writing.',
    features: [
      { id: 'jk-cp-instagram',   label: 'Instagram posts',    capabilityTag: 'social-instagram', enabled: true },
      { id: 'jk-cp-twitter',     label: 'Twitter/X posts',    capabilityTag: 'social-twitter',   enabled: true },
      { id: 'jk-cp-linkedin',    label: 'LinkedIn posts',     capabilityTag: 'social-linkedin',  enabled: true },
      { id: 'jk-cp-hashtags',    label: 'Hashtag suggestions',capabilityTag: 'hashtag-gen',      enabled: true }
    ]
  },
  {
    id: 'jk-daily-brief',
    name: 'Daily Brief',
    source: 'journeykits',
    category: 'business',
    capability: 'daily-summary',
    description: 'Morning summary of walks, messages, weather, revenue.',
    strength: 5, speed: 4, cost: 'free',
    notes: 'Tailblazers-specific. No equivalent in other sources.',
    features: [
      { id: 'jk-db-schedule',    label: 'Schedule overview',  capabilityTag: 'schedule',         enabled: true },
      { id: 'jk-db-messages',    label: 'Unread messages',    capabilityTag: 'message-summary',  enabled: true },
      { id: 'jk-db-weather',     label: 'Weather for walks',  capabilityTag: 'weather',          enabled: true },
      { id: 'jk-db-revenue',     label: 'Revenue summary',    capabilityTag: 'revenue',          enabled: true }
    ]
  },
  {
    id: 'jk-inbox-triage',
    name: 'Inbox Triage Pipeline',
    source: 'journeykits',
    category: 'business',
    capability: 'inbox-management',
    description: 'Categorize, prioritize, and draft replies to booking requests.',
    strength: 4, speed: 4, cost: 'low',
    notes: 'Tailblazers-tuned. n8n can automate the trigger; this handles the AI part.',
    features: [
      { id: 'jk-it-categorize',  label: 'Auto-categorize',    capabilityTag: 'inbox-cat',        enabled: true },
      { id: 'jk-it-urgency',     label: 'Urgency detection',  capabilityTag: 'inbox-urgency',    enabled: true },
      { id: 'jk-it-draft',       label: 'Draft replies',      capabilityTag: 'inbox-draft',      enabled: true },
      { id: 'jk-it-extract',     label: 'Booking extraction', capabilityTag: 'booking-extract',  enabled: true }
    ]
  },
  {
    id: 'jk-seo',
    name: 'SEO Content Optimizer',
    source: 'journeykits',
    category: 'business',
    capability: 'seo',
    description: 'Local NYC SEO optimization for the Tailblazers website.',
    strength: 4, speed: 4, cost: 'low',
    notes: 'NYC local SEO focus. Better than generic SEO tools for hyperlocal.',
    features: [
      { id: 'jk-seo-keywords',   label: 'Keyword research',   capabilityTag: 'seo-keywords',     enabled: true },
      { id: 'jk-seo-audit',      label: 'On-page audit',      capabilityTag: 'seo-audit',        enabled: true },
      { id: 'jk-seo-meta',       label: 'Meta tag writer',    capabilityTag: 'seo-meta',         enabled: true },
      { id: 'jk-seo-local',      label: 'Local SEO tips',     capabilityTag: 'local-seo',        enabled: true }
    ]
  },
  {
    id: 'jk-workspace-continuity',
    name: 'Workspace Continuity',
    source: 'journeykits',
    category: 'infra',
    capability: 'session-continuity',
    description: 'Auto-checkpoint and restore interrupted agent sessions.',
    strength: 4, speed: 3, cost: 'free',
    notes: 'Works across all providers. Hermes memory is deeper for conversation history.',
    features: [
      { id: 'jk-wc-checkpoint',  label: 'Auto-checkpoint',    capabilityTag: 'checkpoint',       enabled: true },
      { id: 'jk-wc-restore',     label: 'Session restore',    capabilityTag: 'session-restore',  enabled: true },
      { id: 'jk-wc-queue',       label: 'Task queue persist', capabilityTag: 'task-list',        enabled: true }
    ]
  },

  // ── Gemini ──────────────────────────────────────────────────────────────
  {
    id: 'gemini-code-gen',
    name: 'Gemini Code Generation',
    source: 'gemini',
    category: 'code',
    capability: 'code-generation',
    description: 'Code generation and completion via Gemini 1.5 Pro/Flash.',
    strength: 4, speed: 5, cost: 'low',
    notes: 'Faster than Claude Opus for simple completions. Use for boilerplate.'
  },
  {
    id: 'gemini-research',
    name: 'Gemini Deep Research',
    source: 'gemini',
    category: 'research',
    capability: 'web-research',
    description: 'Gemini\'s built-in Google Search grounding for factual research.',
    strength: 5, speed: 4, cost: 'medium',
    notes: 'Best for current events and fact-checking. Uses live Google Search.'
  },
  {
    id: 'gemini-content',
    name: 'Gemini Creative Writing',
    source: 'gemini',
    category: 'business',
    capability: 'content-creation',
    description: 'Long-form creative content generation with Gemini.',
    strength: 5, speed: 4, cost: 'medium',
    notes: 'Better for creative/narrative writing. JourneyKits is better for Tailblazers tone.'
  },

  // ── Antigravity ─────────────────────────────────────────────────────────
  {
    id: 'ag-code-gen',
    name: 'Antigravity Code Agent',
    source: 'antigravity',
    category: 'code',
    capability: 'code-generation',
    description: 'Autonomous coding agent with 1,340+ specialized skills.',
    strength: 5, speed: 3, cost: 'medium',
    notes: 'Best for large-scale autonomous refactoring; more skills than any other source.'
  },
  {
    id: 'ag-github',
    name: 'Antigravity GitHub Skills',
    source: 'antigravity',
    category: 'automation',
    capability: 'github-triage',
    description: 'Antigravity\'s built-in GitHub issue/PR management skills.',
    strength: 5, speed: 3, cost: 'medium',
    notes: 'More powerful than JourneyKits GitHub Triage; requires Antigravity IDE running.'
  },
  {
    id: 'ag-research',
    name: 'Antigravity Research Agent',
    source: 'antigravity',
    category: 'research',
    capability: 'web-research',
    description: 'Multi-step research with source synthesis across 1,340+ skills.',
    strength: 5, speed: 2, cost: 'medium',
    notes: 'Most thorough research; slowest. Use for deep investigations, not quick lookups.'
  },

  // ── n8n (workflow automation connector) ────────────────────────────────
  {
    id: 'n8n-trigger',
    name: 'n8n Workflow Trigger',
    source: 'custom',
    category: 'automation',
    capability: 'workflow-automation',
    description: 'Trigger any n8n workflow from inside ClaudeCodex.',
    strength: 5, speed: 5, cost: 'free',
    notes: 'Best for connecting to external services (email, Slack, calendars, databases).'
  }
];

class SkillRegistry {
  constructor() {
    this.skills = [...BUILT_IN_SKILLS];
    this._loadCustomManifests();
    this._loadState();
  }

  // ── Manifest loading (extensible kit tree) ────────────────────────────
  _loadCustomManifests() {
    try {
      const stored = JSON.parse(localStorage.getItem('sk_manifests') || '[]');
      stored.forEach(manifest => this._ingestManifest(manifest));
    } catch (_) {}
  }

  _ingestManifest(manifest) {
    // manifest = { source, sourceLabel, color, skills: [...] }
    if (!manifest.skills) return;
    manifest.skills.forEach(skill => {
      // Avoid duplicates by id
      if (!this.skills.find(s => s.id === skill.id)) {
        this.skills.push({
          ...skill,
          source: manifest.source || 'custom',
          _fromManifest: true
        });
      }
    });
  }

  loadManifest(manifest) {
    this._ingestManifest(manifest);
    // Persist custom manifests
    try {
      const stored = JSON.parse(localStorage.getItem('sk_manifests') || '[]');
      stored.push(manifest);
      localStorage.setItem('sk_manifests', JSON.stringify(stored));
    } catch (_) {}
  }

  // ── State ────────────────────────────────────────────────────────────────
  _loadState() {
    try {
      const state = JSON.parse(localStorage.getItem('sk_state') || '{}');
      this.skills.forEach(s => {
        if (state[s.id]) {
          s.active = state[s.id].active || false;
          s.installed = state[s.id].installed || false;
          // Restore per-feature enabled state
          if (state[s.id].features && s.features) {
            s.features.forEach(f => {
              if (state[s.id].features[f.id] !== undefined) {
                f.enabled = state[s.id].features[f.id];
              }
            });
          }
        }
      });
    } catch (_) {}
  }

  _saveState() {
    const state = {};
    this.skills.forEach(s => {
      const featureState = {};
      (s.features || []).forEach(f => { featureState[f.id] = f.enabled; });
      state[s.id] = { active: s.active, installed: s.installed, features: featureState };
    });
    localStorage.setItem('sk_state', JSON.stringify(state));
  }

  // ── Feature toggle ────────────────────────────────────────────────────────
  toggleFeature(skillId, featureId) {
    const skill = this.findById(skillId);
    if (!skill || !skill.features) return null;
    const feature = skill.features.find(f => f.id === featureId);
    if (!feature) return null;
    feature.enabled = !feature.enabled;
    this._saveState();
    return feature;
  }

  setFeatureEnabled(skillId, featureId, enabled) {
    const skill = this.findById(skillId);
    if (!skill || !skill.features) return;
    const feature = skill.features.find(f => f.id === featureId);
    if (feature) { feature.enabled = enabled; this._saveState(); }
  }

  // ── Overlap detection (skill-level) ─────────────────────────────────────
  getOverlaps() {
    const byCapability = {};
    this.skills.forEach(s => {
      if (!byCapability[s.capability]) byCapability[s.capability] = [];
      byCapability[s.capability].push(s);
    });
    return Object.entries(byCapability)
      .filter(([, skills]) => skills.length > 1)
      .map(([capability, skills]) => ({
        capability,
        label: CAPABILITY_LABELS[capability] || capability,
        skills: skills.sort((a, b) => b.strength - a.strength),
        recommended: skills.sort((a, b) => b.strength - a.strength)[0]
      }));
  }

  getActiveConflicts() {
    return this.getOverlaps().filter(group =>
      group.skills.filter(s => s.active).length > 1
    );
  }

  // ── Feature-level conflict detection ────────────────────────────────────
  // Returns groups of active sub-features that share the same capabilityTag
  // across different skills (i.e. both are doing the exact same thing simultaneously)
  getFeatureConflicts() {
    const byTag = {};
    this.skills.forEach(skill => {
      if (!skill.active || !skill.features) return;
      skill.features.forEach(f => {
        if (!f.enabled) return;
        if (!byTag[f.capabilityTag]) byTag[f.capabilityTag] = [];
        byTag[f.capabilityTag].push({ skill, feature: f });
      });
    });
    // Only return tags where more than one skill/feature is active
    return Object.entries(byTag)
      .filter(([, entries]) => entries.length > 1)
      .map(([tag, entries]) => ({
        tag,
        label: FEATURE_TAG_LABELS[tag] || tag,
        entries
      }));
  }

  // ── Queries ──────────────────────────────────────────────────────────────
  getBySource(source) {
    return this.skills.filter(s => s.source === source);
  }

  getByCategory(category) {
    return this.skills.filter(s => s.category === category);
  }

  getActive() {
    return this.skills.filter(s => s.active);
  }

  findById(id) {
    return this.skills.find(s => s.id === id);
  }

  findFeature(featureId) {
    for (const skill of this.skills) {
      const f = (skill.features || []).find(x => x.id === featureId);
      if (f) return { skill, feature: f };
    }
    return null;
  }

  // ── Activate / Deactivate ────────────────────────────────────────────────
  activate(id) {
    const skill = this.findById(id);
    if (skill) { skill.installed = true; skill.active = true; this._saveState(); }
    return skill;
  }

  deactivate(id) {
    const skill = this.findById(id);
    if (skill) { skill.active = false; this._saveState(); }
    return skill;
  }

  deactivateSource(source) {
    this.skills.filter(s => s.source === source).forEach(s => { s.active = false; });
    this._saveState();
  }
}

// ── Capability labels (human-readable names for overlap groups) ────────────
const CAPABILITY_LABELS = {
  'agent-coordination': 'Agent Coordination',
  'memory-persist':     'Persistent Memory',
  'knowledge-base':     'Knowledge Base',
  'code-generation':    'Code Generation',
  'code-review':        'Code Review',
  'code-refactor':      'Code Refactoring',
  'error-debugging':    'Error Debugging',
  'security-audit':     'Security Audit',
  'web-research':       'Web Research',
  'github-triage':      'GitHub Triage',
  'release-notes':      'Release Notes',
  'workflow-automation':'Workflow Automation',
  'tool-calling':       'Tool Calling',
  'session-continuity': 'Session Continuity',
  'content-creation':   'Content Creation',
  'daily-summary':      'Daily Summary',
  'inbox-management':   'Inbox Management',
  'crm':                'CRM',
  'seo':                'SEO Optimization'
};

// ── Feature-level tag labels (what each capabilityTag means) ─────────────
const FEATURE_TAG_LABELS = {
  'task-routing':      'Task routing',
  'task-list':         'Shared task list',
  'tmux-control':      'tmux session control',
  'conflict-resolve':  'Conflict resolution',
  'agent-vote':        'Agent voting',
  'file-edit':         'File write/edit',
  'test-execution':    'Test execution',
  'lint-fix':          'Lint fix',
  'ai-code-gen':       'AI code generation',
  'diff-review':       'Diff review',
  'style-review':      'Style check',
  'security-review':   'Security review',
  'code-suggestion':   'Code suggestions',
  'web-search':        'Web search',
  'auto-summarize':    'Auto-summarize',
  'source-citation':   'Source citation',
  'stack-trace':       'Stack trace analysis',
  'log-analysis':      'Log correlation',
  'auto-fix':          'Auto-apply fix',
  'repro-test':        'Repro test gen',
  'rca-report':        'Root cause report',
  'fix-suggest':       'Fix suggestion',
  'owasp-scan':        'OWASP scan',
  'secrets-scan':      'Secrets detection',
  'dep-vuln-scan':     'Dependency vulnerability scan',
  'memory-store':      'Memory store',
  'memory-search':     'Memory search',
  'session-restore':   'Session restore',
  'memory-prune':      'Memory auto-prune',
  'cross-agent-mem':   'Cross-agent memory sharing',
  'tool-exec':         'Tool execution',
  'human-approval':    'Human approval gates',
  'model-routing':     'Multi-model routing',
  'note-ingest':       'Note ingestion',
  'knowledge-graph':   'Knowledge link graph',
  'auto-tag':          'Auto-tagging',
  'gh-auto-label':     'GitHub auto-labeling',
  'gh-priority':       'GitHub priority scoring',
  'gh-assign':         'GitHub assignee routing',
  'gh-stale':          'GitHub stale alerts',
  'gh-release':        'GitHub release draft',
  'web-scrape':        'Web scraping',
  'rag-embed':         'RAG chunking + embedding',
  'vector-store':      'Vector store',
  'doc-qa':            'Q&A over documents',
  'dep-map':           'Dependency mapping',
  'refactor-risk':     'Refactoring risk scoring',
  'refactor-plan':     'Refactoring step plan',
  'rollback':          'Rollback checkpoints',
  'commit-cat':        'Commit categorization',
  'semver':            'Semver detection',
  'changelog-write':   'CHANGELOG.md writing',
  'checkpoint':        'Auto-checkpoint',
  'crm-client':        'CRM client profiles',
  'crm-dog':           'CRM dog profiles',
  'crm-history':       'CRM walk history',
  'crm-veteran':       'CRM veteran notes',
  'social-instagram':  'Instagram post generation',
  'social-twitter':    'Twitter/X post generation',
  'social-linkedin':   'LinkedIn post generation',
  'hashtag-gen':       'Hashtag generation',
  'schedule':          'Schedule overview',
  'message-summary':   'Message summary',
  'weather':           'Weather lookup',
  'revenue':           'Revenue summary',
  'inbox-cat':         'Inbox categorization',
  'inbox-urgency':     'Urgency detection',
  'inbox-draft':       'Draft reply generation',
  'booking-extract':   'Booking extraction',
  'seo-keywords':      'SEO keyword research',
  'seo-audit':         'On-page SEO audit',
  'seo-meta':          'Meta tag writing',
  'local-seo':         'Local SEO',
};

// ── Source metadata (badge color, label, icon) ────────────────────────────
const SOURCE_META = {
  'claude-code':  { label: 'Claude Code',   color: '#cc785c', bg: '#cc785c20', icon: '⚡' },
  'hermes':       { label: 'Hermes',         color: '#9333ea', bg: '#9333ea20', icon: '🪽' },
  'journeykits':  { label: 'JourneyKits',    color: '#3b82f6', bg: '#3b82f620', icon: '🧰' },
  'antigravity':  { label: 'Antigravity',    color: '#22c55e', bg: '#22c55e20', icon: '🚀' },
  'gemini':       { label: 'Gemini',         color: '#0ea5e9', bg: '#0ea5e920', icon: '💎' },
  'openrouter':   { label: 'OpenRouter',     color: '#f59e0b', bg: '#f59e0b20', icon: '🔀' },
  'custom':       { label: 'Custom',         color: '#6b7280', bg: '#6b728020', icon: '🔧' }
};

window.SkillRegistry = SkillRegistry;
window.SOURCE_META = SOURCE_META;
window.CAPABILITY_LABELS = CAPABILITY_LABELS;
window.FEATURE_TAG_LABELS = FEATURE_TAG_LABELS;
