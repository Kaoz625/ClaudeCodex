// ── Comet-style highlight popup ── //
export class HighlightMenu {
  constructor(chatManager) {
    this.chatManager = chatManager;
    this.menu = document.getElementById('highlight-menu');
    this.selectedText = '';

    this.wire();
  }

  wire() {
    // Show on mouseup if text is selected
    document.addEventListener('mouseup', (e) => {
      // Small delay so selection is finalised
      setTimeout(() => this.onMouseUp(e), 10);
    });

    // Hide on mousedown elsewhere
    document.addEventListener('mousedown', (e) => {
      if (!this.menu.contains(e.target)) this.hide();
    });

    // Hide on scroll
    document.addEventListener('scroll', () => this.hide(), true);

    // Buttons
    document.getElementById('hl-copy').addEventListener('click', () => {
      navigator.clipboard.writeText(this.selectedText);
      this.flashBtn('hl-copy', 'Copied!');
      this.hide();
    });

    document.getElementById('hl-followup').addEventListener('click', () => {
      this.addToFollowUp(this.selectedText);
      this.hide();
    });

    document.getElementById('hl-sources').addEventListener('click', () => {
      this.checkSources(this.selectedText);
      this.hide();
    });

    document.getElementById('hl-explain').addEventListener('click', () => {
      this.explainSelection(this.selectedText);
      this.hide();
    });

    // Follow-up panel controls
    document.getElementById('btn-toggle-followup').addEventListener('click', () => {
      const panel = document.getElementById('followup-panel');
      panel.classList.toggle('hidden');
    });

    document.getElementById('btn-close-followup').addEventListener('click', () => {
      document.getElementById('followup-panel').classList.add('hidden');
    });

    document.getElementById('btn-ask-followups').addEventListener('click', () => {
      this.askAllFollowUps();
    });

    document.getElementById('btn-clear-followups').addEventListener('click', () => {
      this.clearFollowUps();
    });
  }

  onMouseUp(e) {
    const sel = window.getSelection();
    const text = sel?.toString().trim();

    // Need at least 3 chars, not inside input/textarea
    if (!text || text.length < 3) { this.hide(); return; }
    if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) { this.hide(); return; }
    if (this.menu.contains(e.target)) return;

    this.selectedText = text;
    this.show(e.clientX, e.clientY);
  }

  show(x, y) {
    this.menu.classList.remove('hidden');

    // Position above the cursor
    const menuW = 260;
    const menuH = 36;
    let left = x - menuW / 2;
    let top  = y - menuH - 10;

    // Keep inside viewport
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    if (left < 8) left = 8;
    if (left + menuW > vw - 8) left = vw - menuW - 8;
    if (top < 8) top = y + 20;
    if (top + menuH > vh - 8) top = y - menuH - 10;

    this.menu.style.left = left + 'px';
    this.menu.style.top  = top + 'px';
  }

  hide() {
    this.menu.classList.add('hidden');
  }

  flashBtn(id, label) {
    const btn = document.getElementById(id);
    const orig = btn.textContent;
    btn.textContent = label;
    setTimeout(() => { btn.textContent = orig; }, 1200);
  }

  // ── Follow-up ──
  addToFollowUp(text) {
    const list = document.getElementById('followup-list');
    const panel = document.getElementById('followup-panel');

    const item = document.createElement('div');
    item.className = 'followup-item';
    item.innerHTML = `
      <span class="followup-item-pin">📌</span>
      <span class="followup-item-text" title="${this.esc(text)}">${this.esc(text.slice(0, 120))}${text.length > 120 ? '…' : ''}</span>
      <button class="followup-item-remove" title="Remove">✕</button>`;
    item.querySelector('.followup-item-remove').addEventListener('click', () => item.remove());
    list.appendChild(item);

    // Show panel
    panel.classList.remove('hidden');

    // Update badge count
    this.updateFollowUpCount();
  }

  updateFollowUpCount() {
    const count = document.getElementById('followup-list').children.length;
    document.getElementById('followup-count').textContent = count;
  }

  clearFollowUps() {
    document.getElementById('followup-list').innerHTML = '';
    this.updateFollowUpCount();
  }

  askAllFollowUps() {
    const items = document.querySelectorAll('.followup-item-text');
    if (!items.length) return;

    const texts = Array.from(items).map(el => el.title || el.textContent);
    const combined = `I have several items I want to follow up on:\n\n${texts.map((t, i) => `${i+1}. ${t}`).join('\n\n')}\n\nPlease address each of these.`;

    document.getElementById('chat-input').value = combined;
    this.chatManager.autoResize();
    document.querySelector('[data-tab="chat"]').click();
    document.getElementById('chat-input').focus();
  }

  // ── Check Sources ──
  checkSources(text) {
    const query = encodeURIComponent(text.slice(0, 200));
    // Load in research tab
    document.getElementById('research-url-input').value = `https://en.wikipedia.org/w/index.php?search=${query}`;
    document.querySelector('[data-tab="research"]').click();
    document.getElementById('btn-research-go').click();
  }

  // ── Explain ──
  explainSelection(text) {
    document.getElementById('chat-input').value = `Explain the following in simple terms:\n\n"${text}"`;
    this.chatManager.autoResize();
    document.querySelector('[data-tab="chat"]').click();
    document.getElementById('chat-input').focus();
  }

  esc(str) {
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }
}
