import { ChatManager } from './chat.js';
import { IDEManager } from './editor.js';
import { UsageManager } from './usage.js';
import { HighlightMenu } from './highlight-menu.js';
import { ResearchManager } from './research.js';
import { AgentsManager } from './agents.js';
import { N8nManager } from './n8n.js';
import { HermesManager } from './hermes.js';

// ── Tab switching ──
const tabs = document.querySelectorAll('.tab');
const tabContents = document.querySelectorAll('.tab-content');

tabs.forEach(tab => {
  tab.addEventListener('click', () => {
    const target = tab.dataset.tab;
    tabs.forEach(t => t.classList.remove('active'));
    tabContents.forEach(c => c.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById(`tab-${target}`).classList.add('active');
    if (target === 'usage')  window.usageManager?.refresh();
    if (target === 'agents') window.agentsManager?.pollAgents();
    if (target === 'n8n')    window.n8nManager?.checkConnection();
    if (target === 'hermes') window.hermesManager?.checkConnection();
    if (target === 'kits') {
      window.kitsManager?._render();
      window.skillsOverview?._render();
    }
    if (target === 'notebooks') window.notebookManager?._renderSidebar();
  });
});

// ── Window controls ──
document.getElementById('btn-minimize').addEventListener('click', () => window.api.minimize());
document.getElementById('btn-maximize').addEventListener('click', () => window.api.maximize());
document.getElementById('btn-close').addEventListener('click',    () => window.api.close());

// ── Boot ──
window.addEventListener('DOMContentLoaded', async () => {
  const homedir = await window.api.osHomedir();

  window.usageManager    = new UsageManager();
  window.ideManager      = new IDEManager(homedir);
  window.chatManager     = new ChatManager(homedir, window.usageManager, window.ideManager);
  window.highlightMenu   = new HighlightMenu(window.chatManager);
  window.researchManager = new ResearchManager(window.chatManager);
  window.agentsManager   = new AgentsManager();
  window.n8nManager      = new N8nManager();
  window.hermesManager   = new HermesManager(window.chatManager);
  window.skillRegistry   = new window.SkillRegistry();
  window.kitsManager     = new window.JourneyKitsManager();
  window.skillsOverview  = new window.SkillsOverview(window.skillRegistry);
  window.skillsOverview.mount('skills-overview-root');

  // Handle /kit [id] slash command in chat input
  document.getElementById('chat-input').addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) {
      const val = document.getElementById('chat-input').value.trim();
      if (val.startsWith('/kit ')) {
        e.preventDefault();
        const args = val.slice(5).trim();
        const [kitId, ...rest] = args.split(' ');
        const userPrompt = rest.join(' ');
        const context = window.kitsManager.invokeKitFromChat(kitId, userPrompt);
        document.getElementById('chat-input').value = context;
      }
    }
  });

  // Open folder → switch to IDE automatically
  document.getElementById('btn-open-folder').addEventListener('click', async () => {
    const result = await window.api.openFolder();
    if (!result.cancelled) {
      window.ideManager.setRoot(result.path);
      window.chatManager.setCwd(result.path);
      document.getElementById('cwd-display').textContent = result.path;
      document.querySelector('[data-tab="ide"]').click();
    }
  });

  // New chat
  document.getElementById('btn-new-chat').addEventListener('click', () => {
    window.chatManager.newConversation();
    document.querySelector('[data-tab="chat"]').click();
  });

  // Research context button (inject research into chat)
  document.getElementById('btn-research-context').addEventListener('click', () => {
    const ctx = window.researchManager?.getCurrentContext();
    if (ctx) {
      const input = document.getElementById('chat-input');
      input.value += `\n\n[Research context from: ${ctx.title}]\n${ctx.summary}`;
      window.chatManager.autoResize();
      document.querySelector('[data-tab="chat"]').click();
      input.focus();
    }
  });
});
