import { Game, DT, distance } from './src/core.js';
import { Campaign } from './src/campaign.js';
import { GameView } from './render.js';
import { InputBuffer } from './input.js';
import { Settings } from './settings.js';
import { GameAudio } from './audio.js';
const $ = id => document.getElementById(id);
let view;
try { view = new GameView($('world')); }
catch (error) { $('loading').innerHTML = '<p>Trình duyệt cần WebGL 2 để mở hòn đảo.<br>Hãy thử Chrome, Edge hoặc Firefox có tăng tốc đồ họa.</p>'; throw error; }
const contract = await fetch('./game.contract.json').then(r => { if (!r.ok) throw Error('Cannot load contract'); return r.json(); });
const tuning = contract.tuning, params = new URLSearchParams(location.search);
const debugNight = [1, 2, 3].includes(Number(params.get('night'))) ? Number(params.get('night')) : 1;
const scenarioName = params.get('scenario');
const scenarioFiles = { refuel: 'phase3/refuel', relight: 'phase3/relight', drain: 'phase3/drain', 'drain-pulse': 'phase3/drain-pulse', 'fuel-out': 'phase3/fuel-out', 'near-win': 'near-win', 'near-loss': 'near-loss', pulse: 'pulse', dash: 'phase2/dash', charm: 'phase2/charm', drifter: 'phase2/drifter', wind: 'phase2/wind', fall: 'phase2/fall', pad: 'phase2/pad', tiers: 'phase2/tiers' };
let storage; try { storage = localStorage; } catch { /* Storage may be disabled. */ }
const settings = new Settings(storage), audio = new GameAudio(settings.value.volume), input = new InputBuffer();
let campaign = new Campaign(debugNight), game, mode = 'menu', settingsReturn = 'menu', yaw = 0, accumulator = 0, lastTime = 0, toastUntil = 0, countdown = null, settingsAfterPause = false;
let fpsFrames = 0, fpsElapsed = 0, fpsWarmup = 0;
const benchmark = params.get('benchmark') === '1';
if (benchmark) $('fps-panel').classList.remove('hidden');
if (scenarioName || debugNight !== 1) $('mode-label').textContent = `TÌNH HUỐNG KIỂM CHỨNG · ${scenarioName ?? `ĐÊM ${debugNight}`}`;
const ids = ['menu', 'night-intro', 'hud', 'pause-panel', 'settings-panel', 'ending'];
function panels(...visible) { for (const id of ids) $(id).classList.toggle('hidden', !visible.includes(id)); $('intro-footer').classList.toggle('hidden', !visible.includes('menu')); }
function toast(message) { $('toast').textContent = message; $('toast').classList.add('show'); toastUntil = performance.now() + 2800; }
async function newGame(night) {
  const file = scenarioName === 'campaign' ? `phase3/campaign-${night}` : scenarioFiles[scenarioName];
  const scenario = file ? await fetch(`./scenarios/${file}.json`).then(r => { if (!r.ok) throw Error('Cannot load scenario'); return r.json(); }) : {};
  return new Game({ tuning, seed: 2026, night, scenario });
}
async function prepareNight() {
  audio.stopMusic(); input.clear(); settingsAfterPause = false; game = await newGame(campaign.night); view.build(game); yaw = 0; accumulator = 0; countdown = null;
  $('chapter-label').textContent = `ĐÊM ${game.night} · ${game.world.name.toUpperCase()}`;
  $('night-kicker').textContent = `ĐÊM ${game.night} / 3`; $('night-title').textContent = game.world.name; $('night-story').textContent = game.world.story;
  $('night-info').textContent = `${game.lanterns.length} đèn lồng · ${Math.round(game.initialTime)} giây · Bình minh cần ${Math.ceil(tuning.win_ratio * game.lanterns.length)} đèn sáng`;
  $('lantern-progress').innerHTML = game.lanterns.map(l => `<span title="${l.id}">✧</span>`).join('');
  $('map-title').textContent = game.world.name.toUpperCase(); mode = 'intro'; panels('night-intro');
}
function launchNight() {
  mode = 'playing'; input.clear(); accumulator = 0; fpsFrames = 0; fpsElapsed = 0; fpsWarmup = 0;
  panels('hud'); audio.startNight(game.night); toast(game.night === 1 ? 'Giữ ít nhất 3/5 đèn sáng tới bình minh. Nhớ quay lại châm dầu.' : game.night === 2 ? 'Cầu tre nối hai đảo. Bục vàng đưa Mây bay qua sương.' : 'Men theo hai dốc lên tầng cao, rồi tìm bục gió tới tháp chuông.');
}
async function retry() { await prepareNight(); launchNight(); }
async function menu() { audio.stopMusic(); campaign = new Campaign(debugNight); await prepareNight(); mode = 'menu'; panels('menu'); }
function queuePause() { input.down('KeyP'); input.up('KeyP'); }
function openSettings() {
  if (mode === 'playing') { settingsAfterPause = true; input.clear(); queuePause(); return; }
  settingsReturn = mode; mode = 'settings'; input.clear(); panels(...(settingsReturn === 'paused' ? ['hud', 'settings-panel'] : ['settings-panel']));
  updateSettings(); audio.unlock();
}
function closeSettings() { mode = settingsReturn; panels(...(mode === 'paused' ? ['hud', 'pause-panel'] : mode === 'intro' ? ['night-intro'] : mode === 'result' || mode === 'dawn' ? ['hud', 'ending'] : ['menu'])); }
function updateSettings() {
  $('accessible-palette').checked = settings.value.accessiblePalette; document.body.classList.toggle('accessible-palette', settings.value.accessiblePalette); view.setAccessiblePalette(settings.value.accessiblePalette);
  $('volume').value = Math.round(settings.value.volume * 100); $('volume-value').textContent = `${Math.round(settings.value.volume * 100)}%`;
  $('sensitivity').value = Math.round(settings.value.sensitivity * 100); $('sensitivity-value').textContent = `${settings.value.sensitivity.toFixed(2)}×`;
  audio.volume = settings.value.volume; $('sound').textContent = settings.value.volume > 0 ? '♪' : '♩'; $('sound').setAttribute('aria-label', settings.value.volume > 0 ? 'Tắt âm thanh' : 'Bật âm thanh');
}
$('start').onclick = () => { audio.unlock(); prepareNight().catch(fatal); }; $('play-night').onclick = launchNight;
$('intro-back').onclick = () => menu().catch(fatal); $('replay').onclick = () => retry().catch(fatal); $('pause-retry').onclick = () => retry().catch(fatal);
$('home').onclick = () => menu().catch(fatal); $('pause-menu').onclick = () => menu().catch(fatal); $('resume').onclick = queuePause;
$('next-night').onclick = () => { if (campaign.next()) prepareNight().catch(fatal); };
$('open-settings').onclick = openSettings; $('pause-settings').onclick = openSettings; $('close-settings').onclick = closeSettings;
$('help').onclick = () => { if (mode === 'playing' || mode === 'paused') queuePause(); else toast('WASD đi · Space nhảy · Shift lướt · E nạp đèn · Q tỏa sáng. Kéo chuột để xoay camera.'); };
$('sound').onclick = () => { audio.unlock(); settings.set({ volume: settings.value.volume > 0 ? 0 : .35 }); updateSettings(); audio.effect('pickup'); };
$('volume').oninput = () => { settings.set({ volume: Number($('volume').value) / 100 }); updateSettings(); };
$('sensitivity').oninput = () => { settings.set({ sensitivity: Number($('sensitivity').value) / 100 }); updateSettings(); };
$('accessible-palette').onchange = () => { settings.set({ accessiblePalette: $('accessible-palette').checked }); updateSettings(); };
function showEnding() {
  audio.stopMusic(); input.clear(); campaign.record(game); const won = game.state === 'won'; mode = won && game.night === 3 ? 'dawn' : 'result'; panels('hud', 'ending');
  $('ending-kicker').textContent = mode === 'dawn' ? 'BA HÒN ĐẢO ĐÃ THỨC GIẤC' : `KẾT QUẢ ĐÊM ${game.night} · ${game.world.name.toUpperCase()}`;
  $('ending-title').textContent = mode === 'dawn' ? 'Bình Minh' : won ? 'Đảo đã sáng rồi!' : 'Một đốm hy vọng.';
  $('ending-text').textContent = mode === 'dawn' ? 'Tiếng chuông ngân qua biển mây. Mây đã mang ánh sáng về nhà, và Ông Đăng đang chờ bên ngọn đèn.' : won ? 'Đèn đã thức giấc. Nghỉ một chút rồi cùng Ông Đăng đến hòn đảo tiếp theo nhé.' : game.timeLeft <= 0 ? 'Bình minh đã đến nhưng số đèn còn sáng chưa đủ ngưỡng. Mây có thể thử lại Đêm này.' : 'Ngọn lửa cuối cùng đã tắt. Những đốm đom đóm vẫn chờ Mây quay lại.';
  $('ending-score').textContent = `${game.score.toLocaleString('vi-VN')} điểm đêm`; $('ending-total').textContent = `Tổng điểm các Đêm đã thắng: ${campaign.total.toLocaleString('vi-VN')}`;
  $('next-night').classList.toggle('hidden', !won || game.night === 3); $('next-night').textContent = `Đến Đêm ${Math.min(3, game.night + 1)}`;
  $('replay').textContent = `Chơi lại Đêm ${game.night}`; audio.effect(won ? 'won' : 'lost');
}
function handle(events) {
  for (const e of events) {
    if (e.name === 'mote_picked') audio.effect('pickup');
    if (e.name === 'lantern_out') toast('⚠ Một đèn đã cạn dầu! Thắp lại chỉ cần 5 đom đóm.');
    if (e.name === 'refuel') { audio.effect('lantern'); toast(`Đã châm ${e.data.amount} đom đóm · Dầu ${e.data.fuel}/100`); }
    if (e.name === 'lantern_lit') { audio.effect('lantern'); view.effect('lantern_lit', game.lanterns.find(l => l.id === e.data.lantern_id).pos); toast('Đèn đã sáng. Đèn đủ 30 dầu sẽ giữ Bóng Mực ở ngoài vùng sáng.'); }
    if (e.name === 'pulse') { audio.effect('pulse'); view.effect('pulse', game.player.pos); }
    if (e.name === 'dash') { audio.effect('dash'); view.effect('dash', game.player.pos); }
    if (e.name === 'player_hit') { audio.effect('hit'); toast(e.data.by === 'fall' ? 'Mây rơi vào biển mây. Chờ một chút để trở lại bờ.' : 'Mây mất một ngọn lửa. Đom đóm đánh rơi có thể nhặt lại trong 8 giây.'); }
    if (e.name === 'shade_spawned') audio.effect('spawn');
    if (e.name === 'charm_picked') { audio.effect('charm'); toast('Bùa Gió: chạy nhanh và Lướt không hồi chiêu trong 10 giây.'); }
    if (e.name === 'drifter_steal') toast(`Gió Lạc cướp ${e.data.amount} đom đóm! Tỏa sáng trúng nó để lấy lại.`);
    if (e.name === 'drifter_drop') toast('Gió Lạc đã thả đom đóm. Nhanh tay nhặt lại nhé.');
    if (e.name === 'paused') { mode = 'paused'; input.clear(); audio.stopMusic(); panels('hud', 'pause-panel'); if (settingsAfterPause) { settingsAfterPause = false; openSettings(); } }
    if (e.name === 'resumed') { mode = 'playing'; input.clear(); audio.startNight(game.night); panels('hud'); }
    if (e.name === 'game_over') showEnding();
  }
}
document.addEventListener('keydown', e => {
  if (e.target instanceof HTMLInputElement) { if (e.code === 'Escape') closeSettings(); return; }
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
  if (e.code === 'Escape' && mode === 'settings') { closeSettings(); return; }
  if (e.code === 'Enter' && !e.repeat && mode === 'intro') { launchNight(); return; }
  if (mode === 'playing' || mode === 'paused') input.down(e.code, e.repeat);
});
document.addEventListener('keyup', e => input.up(e.code));
const blurPause = () => { input.clear(); if (mode === 'playing') queuePause(); };
window.addEventListener('blur', blurPause); document.addEventListener('visibilitychange', () => { if (document.hidden) blurPause(); });
let dragging = false, dragX = 0;
$('world').addEventListener('pointerdown', e => { if (mode !== 'playing') return; dragging = true; dragX = e.clientX; $('world').setPointerCapture(e.pointerId); });
$('world').addEventListener('pointermove', e => { if (dragging && mode === 'playing') { yaw -= (e.clientX - dragX) * .006 * settings.value.sensitivity; dragX = e.clientX; } });
$('world').addEventListener('pointerup', () => { dragging = false; }); $('world').addEventListener('pointercancel', () => { dragging = false; });
window.addEventListener('resize', () => view.resize());
const map = $('minimap').getContext('2d');
function drawMap() {
  const [minX, maxX, minZ, maxZ] = game.world.bounds, scale = Math.min(145 / (maxX - minX), 105 / (maxZ - minZ));
  const cx = (maxX + minX) / 2, cz = (maxZ + minZ) / 2, xy = p => [80 - (p[0] - cx) * scale, 60 - (p[2] - cz) * scale]; map.clearRect(0, 0, 160, 120);
  map.fillStyle = '#2F5D5066'; map.strokeStyle = '#8FA3B866'; map.lineWidth = 1;
  for (const island of game.world.islands) { const [x, y] = xy(island.center); map.beginPath(); map.arc(x, y, island.radius * scale, 0, Math.PI * 2); map.fill(); map.stroke(); }
  if (game.world.bridge) { const a = xy([26, 0, 0]), b = xy([44, 0, 0]); map.strokeStyle = '#C9B48A'; map.lineWidth = 4; map.beginPath(); map.moveTo(...a); map.lineTo(...b); map.stroke(); }
  const dot = (pos, r, color) => { const [x, y] = xy(pos); map.fillStyle = color; map.beginPath(); map.arc(x, y, r, 0, 6.3); map.fill(); };
  for (const m of game.motes) dot(m.pos, 1, '#FFE58A'); for (const l of game.lanterns) dot(l.pos, 2.6, l.lit ? '#FFB347' : '#5B5F6E');
  for (const s of game.shades) dot(s.pos, 2, settings.value.accessiblePalette ? '#00B3FF' : '#7A3CFF'); for (const d of game.drifters) dot(d.pos, 2, '#8FA3B8'); for (const c of game.charms) if (c.available) dot(c.pos, 2, '#C8102E'); dot(game.player.pos, 3, '#F5F1E6');
}
$('carry-slots').innerHTML = Array.from({ length: 10 }, () => '<i></i>').join('');
function updateHUD() {
  const p = game.player, lit = game.lanterns.filter(l => l.lit).length;
  $('flames').textContent = Array.from({ length: 3 }, (_, i) => i < p.flames ? '●' : '○').join(' ');
  $('charm-status').textContent = p.charm_ticks > 0 ? `Bùa Gió ${(p.charm_ticks / 60).toFixed(1)}s` : game.respawnTicks ? `Hồi sinh ${(game.respawnTicks / 60).toFixed(1)}s` : 'Giữ lửa trong tim';
  const sec = Math.ceil(game.timeLeft); $('time').textContent = `${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}`; $('time').classList.toggle('urgent', game.timeLeft <= 30);
  $('wind-status').textContent = game.wind.active ? 'GIÓ MẠNH · CẨN THẬN MÉP ĐẢO' : game.windWarning ? 'LÁ ĐANG BAY · GIÓ SẮP ĐẾN' : '';
  $('lit-count').textContent = `${lit} / ${game.lanterns.length}`; $('score').textContent = String(game.score).padStart(4, '0'); $('campaign-score').textContent = `Bình minh cần ${Math.ceil(tuning.win_ratio * game.lanterns.length)} đèn · Tổng: ${campaign.total}`;
  [...$('lantern-progress').children].forEach((o, i) => { o.classList.toggle('lit', game.lanterns[i].lit); o.title = `${game.lanterns[i].id}: ${game.lanterns[i].deposited}/10`; });
  if ($('carry-slots').children.length !== game.capacity) $('carry-slots').innerHTML = Array.from({ length: game.capacity }, () => '<i></i>').join('');
  $('carried').textContent = `${p.carried} / ${game.capacity}`; [...$('carry-slots').children].forEach((o, i) => o.classList.toggle('filled', i < p.carried));
  const dashCD = p.dash_cd_ticks / 60, pulseCD = p.pulse_cd_ticks / 60;
  $('dash-status').textContent = p.charm_ticks > 0 ? 'Bùa Gió · Sẵn sàng' : dashCD > 0 ? `${dashCD.toFixed(1)}s` : 'Sẵn sàng';
  $('pulse-status').textContent = pulseCD > 0 ? `${pulseCD.toFixed(1)}s` : p.carried >= 3 ? 'Sẵn sàng · −3 con' : 'Cần 3 đom đóm';
  $('dash-meter').style.width = `${100 * (1 - Math.min(1, dashCD / 1.5))}%`; $('pulse-meter').style.width = `${100 * (1 - Math.min(1, pulseCD / 3))}%`;
  const nearest = game.lanterns.filter(l => game.accepts(l)).sort((a, b) => distance(a.pos, p.pos) - distance(b.pos, p.pos))[0];
  const near = nearest && distance(nearest.pos, p.pos) <= 2;
  $('prompt').classList.toggle('hidden', !near || mode !== 'playing'); if (near) $('prompt').textContent = nearest.lit ? `E — Châm dầu (${game.fuel(nearest)}/100)` : `E — ${nearest.ever_lit ? 'Thắp lại' : 'Nạp ánh sáng'} (${nearest.deposited}/${game.lightCost(nearest)})`;
  const hint = nearest ? view.lampHint(nearest) : null; $('lamp-arrow').classList.toggle('hidden', !hint || hint.visible || mode !== 'playing');
  if (hint) { $('arrow-symbol').style.transform = `rotate(${hint.angle}deg)`; $('arrow-distance').textContent = `${nearest.id} · ${Math.round(distance(nearest.pos, p.pos))} m`; }
  drawMap();
}
function fatal(error) { console.error(error); $('loading').classList.remove('hidden'); $('loading').textContent = 'Không thể mở hòn đảo. Hãy tải lại trang và kiểm tra bản build.'; }
await prepareNight(); mode = 'menu'; panels('menu'); updateSettings(); $('loading').classList.add('hidden');
function animate(ms) {
  requestAnimationFrame(animate); const rawDelta = lastTime ? (ms - lastTime) / 1000 : DT, delta = Math.min(.1, rawDelta); lastTime = ms;
  if (mode === 'playing' || mode === 'paused' || mode === 'settings' && settingsReturn === 'paused') {
    if (mode === 'playing') { if (input.held.has('ArrowLeft')) yaw += delta * 1.5; if (input.held.has('ArrowRight')) yaw -= delta * 1.5; }
    accumulator += delta;
    while (accumulator >= DT && ['playing', 'paused', 'settings'].includes(mode)) {
      const frame = mode === 'settings' ? { move: [0, 0], pause: false, jump: false, pulse: false, dash: false, interact: false } : input.frame(game.input, yaw);
      const jump = frame.jump && !game.input.jump && game.player.grounded, warning = game.windWarning, launched = !!game.launch;
      handle(game.step(frame)); if (jump || !launched && game.launch) audio.effect('jump');
      if (!warning && game.windWarning) { audio.effect('wind'); toast('Lá bắt đầu bay. Gió mạnh sẽ đến sau 2 giây.'); }
      const left = Math.ceil(game.timeLeft); if (mode === 'playing' && left <= 10 && left > 0 && left !== countdown) { audio.effect('countdown'); countdown = left; }
      accumulator -= DT;
    }
  }
  if (toastUntil && ms > toastUntil) { $('toast').classList.remove('show'); toastUntil = 0; }
  view.sync(game, ms / 1000, delta, yaw, ['menu', 'intro'].includes(mode));
  if (!['menu', 'intro'].includes(mode)) updateHUD();
  if (mode === 'playing' && document.visibilityState === 'visible' && document.hasFocus()) {
    fpsWarmup += rawDelta;
    if (fpsWarmup >= 2) { fpsFrames++; fpsElapsed += rawDelta; }
    if (benchmark && fpsElapsed > 0) {
      const valid = innerWidth === 1280 && innerHeight === 720 && fpsElapsed >= 20;
      const status = valid ? fpsFrames / fpsElapsed >= 30 ? 'pass' : 'fail' : 'collecting';
      const el = $('fps-panel'); el.textContent = `${(fpsFrames / fpsElapsed).toFixed(1)} FPS trung bình · ${innerWidth}×${innerHeight} · ${fpsElapsed.toFixed(1)}s / ${fpsFrames} frames · ${valid ? status === 'pass' ? 'ĐẠT' : 'CHƯA ĐẠT' : 'cần 1280×720, tối thiểu 20s'}`;
      Object.assign(el.dataset, { status, avg: String(fpsFrames / fpsElapsed), seconds: String(fpsElapsed), frames: String(fpsFrames), width: String(innerWidth), height: String(innerHeight), night: String(game.night), drawCalls: String(view.renderer.info.render.calls) });
    }
  } else if (benchmark && document.visibilityState !== 'visible') {
    fpsWarmup = 0; fpsFrames = 0; fpsElapsed = 0; $('fps-panel').textContent = 'Đưa tab game ra trước để đo FPS hợp lệ.'; $('fps-panel').dataset.status = 'background';
  }
}
requestAnimationFrame(animate);
