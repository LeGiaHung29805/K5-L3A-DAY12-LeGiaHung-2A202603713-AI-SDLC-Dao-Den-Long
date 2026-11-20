import { DEFAULT_BINDINGS, BINDING_LABELS } from './bindings.js';
import { Leaderboard, orderedEntries } from './src/leaderboard.js';
export class ReleaseUI {
  constructor({ settings, input, onChange, openBoard, closeBoard }) {
    this.settings = settings; this.input = input; this.onChange = onChange; this.rebinding = null;
    this.board = new Leaderboard(settings.storage); this.saved = false;
    document.querySelector('#settings-panel .settings-note').insertAdjacentHTML('beforebegin', `<label class="setting" for="reduced-motion">Giảm chuyển động <input id="reduced-motion" type="checkbox"></label><label class="setting" for="large-text">Chữ lớn ×1,25 <input id="large-text" type="checkbox"></label><h3>Đổi phím</h3><p>Chọn hành động rồi nhấn phím mới. Mỗi hành động dùng một phím riêng.</p><div id="binding-list"></div><p id="binding-error" role="alert"></p><button id="reset-bindings" class="secondary">Khôi phục phím mặc định</button>`);
    for (const [id, key] of [['reduced-motion', 'reducedMotion'], ['large-text', 'largeText']]) document.getElementById(id).onchange = e => { settings.set({ [key]: e.target.checked }); onChange(); };
    document.getElementById('reset-bindings').onclick = () => { settings.set({ bindings: { ...DEFAULT_BINDINGS } }); input.setBindings(settings.value.bindings); this.rebinding = null; this.renderBindings(); onChange(); };
    document.querySelector('#start').insertAdjacentHTML('afterend', '<button id="menu-leaderboard" class="secondary">Bảng thành tích</button>');
    document.querySelector('main').insertAdjacentHTML('beforeend', `<section id="leaderboard-panel" class="modal panel hidden" aria-labelledby="leaderboard-title"><p class="eyebrow">MƯỜI NGƯỜI GIỮ ĐÈN</p><h2 id="leaderboard-title">Bảng thành tích</h2><div class="table-scroll"><table><thead><tr><th>Tên</th><th>Điểm</th><th>Đêm thắng</th><th>Thời điểm</th></tr></thead><tbody id="leaderboard-rows"></tbody></table></div><button id="board-export" class="secondary">Xuất JSON</button><button id="board-close" class="primary">Về menu</button></section><div id="spawn-alert" class="visual-alert hidden" role="status"><span id="spawn-direction">▲</span><span id="spawn-text"></span></div><div id="hazard-alert" class="visual-alert hidden" role="status"></div>`);
    document.getElementById('menu-leaderboard').onclick = () => { this.drawBoard(); openBoard(); };
    document.getElementById('board-close').onclick = closeBoard;
    document.getElementById('board-export').onclick = () => { const url = URL.createObjectURL(new Blob([JSON.stringify(this.board.export(), null, 2)], { type: 'application/json' })); const a = document.createElement('a'); a.href = url; a.download = 'leaderboard.json'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); };
    document.querySelector('#ending-total').insertAdjacentHTML('afterend', `<form id="name-form" class="hidden"><label for="player-name">Tên người giữ đèn (3–12 ký tự A–Z, a–z, 0–9, _)</label><input id="player-name" minlength="3" maxlength="12" pattern="[A-Za-z0-9_]{3,12}" autocomplete="off" required><button id="save-score" class="secondary" type="submit">Lưu thành tích</button><p id="name-message" role="status"></p></form>`);
    document.getElementById('name-form').onsubmit = e => { e.preventDefault(); this.saveResult(); };
    this.renderBindings(); this.syncPreferences();
    fetch('/__leaderboard').then(r => r.ok ? r.json() : null).then(data => {
      if (!data?.entries) return; const seen = new Set(); this.board.entries = orderedEntries([...data.entries, ...this.board.entries].filter(e => { const key = JSON.stringify(e); if (seen.has(key)) return false; seen.add(key); return true; }));
      try { settings.storage?.setItem('dao-den-long.leaderboard', JSON.stringify(this.board.entries)); } catch {}
    }).catch(() => {});
  }
  renderBindings() {
    const list = document.getElementById('binding-list'); list.replaceChildren();
    for (const [action, label] of Object.entries(BINDING_LABELS)) {
      const row = document.createElement('div'), text = document.createElement('span'), button = document.createElement('button'); row.className = 'binding-row'; text.textContent = label;
      button.type = 'button'; button.className = 'secondary'; button.textContent = this.rebinding === action ? 'Nhấn phím mới…' : this.settings.value.bindings[action]; button.setAttribute('aria-label', `Đổi phím ${label}`);
      button.onclick = () => { this.rebinding = action; document.getElementById('binding-error').textContent = ''; this.renderBindings(); }; row.append(text, button); list.append(row);
    }
  }
  captureKey(e) {
    if (!this.rebinding) return false; e.preventDefault(); e.stopPropagation();
    try { this.settings.set({ bindings: { ...this.settings.value.bindings, [this.rebinding]: e.code } }); this.input.setBindings(this.settings.value.bindings); this.rebinding = null; document.getElementById('binding-error').textContent = ''; this.onChange(); }
    catch (error) { document.getElementById('binding-error').textContent = error.message; }
    this.renderBindings(); return true;
  }
  syncPreferences() {
    for (const [id, key] of [['reduced-motion', 'reducedMotion'], ['large-text', 'largeText']]) document.getElementById(id).checked = this.settings.value[key];
    document.body.classList.toggle('reduced-motion', this.settings.value.reducedMotion); document.body.classList.toggle('large-text', this.settings.value.largeText);
    const b = this.settings.value.bindings, label = action => b[action].replace(/^Key/, '').replace(/^Digit/, '').replace('ShiftLeft', 'Shift');
    const movement = ['forward', 'left', 'back', 'right'].map(label).join('/');
    const keys = document.querySelectorAll('.controls kbd');
    [movement, label('jump'), label('interact'), label('pause')].forEach((value, i) => { keys[i].textContent = value; });
    const abilities = document.querySelectorAll('.ability .key'); abilities[0].textContent = label('dash'); abilities[1].textContent = label('pulse');
    const help = document.querySelectorAll('.help-grid kbd');
    [movement, `${label('jump')} / ${label('dash')}`, label('interact'), label('pulse'), label('pause')].forEach((value, i) => { help[i].textContent = value; });
  }
  recordResult(campaign, game) {
    this.result = { score: campaign.total, nights_won: Object.keys(campaign.scores).length, seed: 2026 }; this.saved = false;
    document.getElementById('name-form').classList.toggle('hidden', game.state !== 'lost' && !(game.state === 'won' && game.night === 3));
    document.getElementById('name-message').textContent = ''; document.getElementById('save-score').disabled = false;
  }
  async saveResult() {
    if (this.saved) return;
    const entry = { ...this.result, name: document.getElementById('player-name').value, achieved_at: new Date().toISOString() };
    try {
      this.board.add(entry); let synced = false;
      try { const response = await fetch('/__leaderboard', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(entry) }); synced = response.ok; } catch {}
      this.saved = true; document.getElementById('save-score').disabled = true;
      document.getElementById('name-message').textContent = synced ? 'Đã lưu trên máy và trình duyệt.' : 'Đã lưu trong trình duyệt. Dùng Xuất JSON để mang kết quả theo.';
    } catch (error) { document.getElementById('name-message').textContent = error.message; }
  }
  drawBoard() {
    const body = document.getElementById('leaderboard-rows'); body.replaceChildren();
    for (const entry of this.board.entries) { const row = document.createElement('tr'); for (const value of [entry.name, entry.score, entry.nights_won, new Date(entry.achieved_at).toLocaleString('vi-VN')]) { const cell = document.createElement('td'); cell.textContent = String(value); row.append(cell); } body.append(row); }
    if (!this.board.entries.length) { const row = document.createElement('tr'), cell = document.createElement('td'); cell.colSpan = 4; cell.textContent = 'Chưa có thành tích. Hoàn thành một hành trình để ghi tên Mây.'; row.append(cell); body.append(row); }
  }
  indicators(game, view, visible) {
    const spawning = game.shades.filter(s => s.state === 'spawning').sort((a, b) => Math.hypot(a.pos[0] - game.player.pos[0], a.pos[2] - game.player.pos[2]) - Math.hypot(b.pos[0] - game.player.pos[0], b.pos[2] - game.player.pos[2]));
    const alert = document.getElementById('spawn-alert'); alert.classList.toggle('hidden', !visible || !spawning.length);
    if (spawning.length) { const hint = view.lampHint(spawning[0]); document.getElementById('spawn-direction').classList.toggle('hidden', hint.visible); document.getElementById('spawn-direction').style.transform = `rotate(${hint.angle}deg)`; document.getElementById('spawn-text').textContent = `⚠ ${spawning.length} Bóng Mực đang xuất hiện`; }
    const warnings = []; if (game.windWarning) warnings.push('⚠ Gió đến sau tối đa 2 giây'); else if (game.wind.active) warnings.push('⚠ Gió đang đẩy Mây');
    if (game.timeLeft <= 10 && game.timeLeft > 0) warnings.push(`⚠ ${Math.ceil(game.timeLeft)} giây cuối`);
    const weak = game.lanterns.filter(l => l.lit && l.fuelUnits < 30 * 60); if (weak.length) warnings.push(`⚠ ${weak.length} đèn dưới 30 dầu`);
    const hazard = document.getElementById('hazard-alert'); hazard.classList.toggle('hidden', !visible || !warnings.length); hazard.textContent = warnings.join(' · ');
  }
}
