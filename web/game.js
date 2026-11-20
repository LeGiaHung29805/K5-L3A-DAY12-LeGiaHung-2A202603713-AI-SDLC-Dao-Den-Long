import * as THREE from './vendor/three.module.js';
import { Game, DT, HZ, ISLAND_RADIUS, distance, seededRandom } from './src/core.js';

const $ = id => document.getElementById(id);
let renderer;
try { renderer = new THREE.WebGLRenderer({ canvas: $('world'), antialias: true, powerPreference: 'high-performance' }); }
catch { $('loading').innerHTML = '<div class="error">Trình duyệt cần WebGL 2 để mở hòn đảo.<br>Hãy thử Chrome, Edge hoặc Firefox có tăng tốc đồ họa.</div>'; throw new Error('WebGL 2 unavailable'); }
const contract = await fetch('./game.contract.json').then(r => { if (!r.ok) throw new Error('Cannot load game contract'); return r.json(); });
const tuning = contract.tuning;
const requestedScenario = new URLSearchParams(location.search).get('scenario');
const scenarioName = ['near-win', 'near-loss', 'pulse'].includes(requestedScenario) ? requestedScenario : null;
const initialScenario = scenarioName ? await fetch(`./scenarios/${scenarioName}.json`).then(r => r.json()) : {};
if (scenarioName) document.querySelector('#intro .eyebrow').textContent = `TÌNH HUỐNG KIỂM CHỨNG: ${scenarioName}`;
const newGame = () => new Game({ tuning, seed: 2026, scenario: initialScenario });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.22;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const scene = new THREE.Scene();
scene.background = new THREE.Color('#081a2d');
scene.fog = new THREE.FogExp2('#102b3d', 0.012);
const camera = new THREE.PerspectiveCamera(49, innerWidth / innerHeight, 0.1, 260);
const ambient = new THREE.HemisphereLight('#9fd4dd', '#273443', 2.0); scene.add(ambient);
const moonLight = new THREE.DirectionalLight('#afd8ed', 2.2); moonLight.position.set(-15, 35, -12); moonLight.castShadow = true;
moonLight.shadow.mapSize.set(1024, 1024); Object.assign(moonLight.shadow.camera, { left: -44, right: 44, top: 44, bottom: -44, far: 110 });
moonLight.shadow.bias = -0.001; scene.add(moonLight);
const fill = new THREE.DirectionalLight('#809fcc', 1); fill.position.set(18, 5, 25); scene.add(fill);
const decorative = new THREE.Group(); scene.add(decorative);
const rand = seededRandom(7321);
const material = (color, opts = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.95, flatShading: true, ...opts });
const mats = {
  grass: material('#325b58'), edge: material('#254551'), earth: material('#1a3040'), stone: material('#738a87'),
  bark: material('#6e6158'), leaves: material('#416d69'), leavesLight: material('#5a8175'), gold: material('#e7ae65'),
  wood: material('#66554a'), cloth: material('#f2d298'), teal: material('#409a9a'), scarf: material('#df885c'),
  glow: material('#ffdb87', { emissive: '#ffae45', emissiveIntensity: 2 }),
  dim: material('#56645d', { emissive: '#8d7e42', emissiveIntensity: 0.1 }),
  shade: material('#241735', { emissive: '#341d55', emissiveIntensity: 0.3 }),
  eyes: new THREE.MeshBasicMaterial({ color: '#dda3ff' })
};
const geo = { orb: new THREE.IcosahedronGeometry(1, 1), box: new THREE.BoxGeometry(1, 1, 1), cone: new THREE.ConeGeometry(1, 1, 7) };
function mesh(g, m, parent, pos = [0, 0, 0], scale = [1, 1, 1]) {
  const obj = new THREE.Mesh(g, m); obj.position.set(...pos); obj.scale.set(...scale); obj.castShadow = true; obj.receiveShadow = true; parent.add(obj); return obj;
}
const top = mesh(new THREE.CylinderGeometry(ISLAND_RADIUS, ISLAND_RADIUS + 0.6, 1.4, 72), mats.grass, decorative, [0, -0.75, 0]);
mesh(new THREE.CylinderGeometry(42.4, 34, 5, 24), mats.edge, decorative, [0, -3.8, 0]);
mesh(new THREE.ConeGeometry(35, 24, 12), mats.earth, decorative, [0, -17.5, 0]).rotation.z = Math.PI;
const sea = mesh(new THREE.CircleGeometry(220, 64), material('#0e2e46', { metalness: 0.25, roughness: 0.6 }), decorative, [0, -21, 0]); sea.rotation.x = -Math.PI / 2;

// Paths radiate from the little keeper's clearing to each lantern.
for (let l = 0; l < 5; l++) {
  const a = l * Math.PI * 2 / 5;
  for (let j = 2; j < 14; j++) {
    const r = j * 1.85;
    const stone = mesh(geo.orb, mats.stone, decorative, [Math.sin(a) * r + (rand() - .5) * .6, .03, Math.cos(a) * r], [.65 + rand() * .4, .07, .55 + rand() * .3]);
    stone.rotation.y = rand() * 5;
  }
}
for (let i = 0; i < 55; i++) {
  const a = rand() * Math.PI * 2, r = 38 + rand() * 3.7;
  mesh(geo.orb, i % 3 === 0 ? mats.stone : mats.edge, decorative, [Math.sin(a) * r, -.05, Math.cos(a) * r], [1 + rand(), .4 + rand(), .7 + rand()]);
}
for (let i = 0; i < 24; i++) {
  const a = rand() * Math.PI * 2, r = 14 + rand() * 25;
  const x = Math.sin(a) * r, z = Math.cos(a) * r;
  // Keep the marked radial trails clear.
  if (Math.abs(Math.sin(a * 2.5)) < .24) continue;
  const group = new THREE.Group(); group.position.set(x, 0, z); decorative.add(group);
  const size = .7 + rand() * .8;
  mesh(new THREE.CylinderGeometry(.2, .35, 3, 6), mats.bark, group, [0, 1.5 * size, 0], [size, size, size]);
  for (let j = 0; j < 3; j++) mesh(geo.orb, j === 1 ? mats.leavesLight : mats.leaves, group, [(j - 1) * size, (3.1 + j * .45) * size, 0], [1.8 * size, 1.4 * size, 1.6 * size]);
}
// The little dock is a visual landmark. It does not alter collision logic.
for (let i = 0; i < 9; i++) mesh(geo.box, mats.wood, decorative, [-10, .06, -34 - i * .75], [4, .17, .63]);
for (const x of [-12, -8]) for (const z of [-34, -39]) mesh(new THREE.CylinderGeometry(.13, .17, 2.1, 6), mats.wood, decorative, [x, .35, z]);
const starsGeometry = new THREE.BufferGeometry();
const stars = [];
for (let i = 0; i < 650; i++) { const a = rand() * Math.PI * 2, r = 80 + rand() * 70; stars.push(Math.sin(a) * r, 20 + rand() * 90, Math.cos(a) * r); }
starsGeometry.setAttribute('position', new THREE.Float32BufferAttribute(stars, 3));
scene.add(new THREE.Points(starsGeometry, new THREE.PointsMaterial({ color: '#b3d3df', size: .16, transparent: true, opacity: .7 })));
const moon = mesh(new THREE.SphereGeometry(5, 24, 16), new THREE.MeshBasicMaterial({ color: '#cfdfcf' }), scene, [55, 50, 75]); moon.castShadow = false;
const clouds = new THREE.Group(); scene.add(clouds);
const cloudMat = material('#547084', { transparent: true, opacity: .19, depthWrite: false });
for (let i = 0; i < 38; i++) {
  const a = rand() * Math.PI * 2, r = 48 + rand() * 45;
  mesh(geo.orb, cloudMat, clouds, [Math.sin(a) * r, -9 - rand() * 8, Math.cos(a) * r], [6 + rand() * 9, 2 + rand() * 3, 5 + rand() * 8]);
}

const keeper = new THREE.Group(); scene.add(keeper);
const body = mesh(new THREE.CylinderGeometry(.26, .48, .9, 8), mats.teal, keeper, [0, .93, 0]);
mesh(geo.orb, mats.cloth, keeper, [0, 1.7, 0], [.31, .34, .3]);
const hat = mesh(new THREE.ConeGeometry(.85, .43, 24), mats.cloth, keeper, [0, 2.05, 0]);
mesh(new THREE.CylinderGeometry(.39, .4, .13, 12), mats.scarf, keeper, [0, 1.36, 0]);
const scarfTail = mesh(geo.box, mats.scarf, keeper, [.13, .93, -.4], [.22, .75, .08]); scarfTail.rotation.x = -.25;
const legs = [-1, 1].map(n => mesh(geo.box, mats.wood, keeper, [n * .2, .3, 0], [.22, .6, .24]));
const arms = [-1, 1].map(n => mesh(geo.box, mats.teal, keeper, [n * .4, 1.02, .05], [.21, .58, .24]));
mesh(new THREE.CylinderGeometry(.11, .11, .35, 8), mats.gold, keeper, [.67, 1.62, .11]);
mesh(new THREE.SphereGeometry(.2, 12, 8), mats.glow, keeper, [.67, 1.4, .11], [1, 1.25, 1]);
const keeperLight = new THREE.PointLight('#ffbf69', 10, 9, 2); keeperLight.position.set(.4, 1.5, .2); keeper.add(keeperLight);
const darkEye = new THREE.MeshBasicMaterial({ color: '#373c3a' });
for (const x of [-.12, .12]) mesh(geo.orb, darkEye, keeper, [x, 1.7, .28], [.035, .05, .03]);

let lanternViews = [], moteViews = new Map(), shadeViews = new Map(), effects = [];
const dynamic = new THREE.Group(); scene.add(dynamic);
function createLantern(l) {
  const group = new THREE.Group(); group.position.set(...l.pos); dynamic.add(group);
  mesh(new THREE.CylinderGeometry(1.2, 1.4, .23, 12), mats.stone, group, [0, .1, 0]);
  mesh(new THREE.CylinderGeometry(.19, .25, 2.6, 8), mats.wood, group, [0, 1.5, 0]);
  mesh(geo.box, mats.wood, group, [.55, 2.7, 0], [1.35, .18, .22]);
  const lightBody = mesh(new THREE.SphereGeometry(.65, 12, 8), mats.dim.clone(), group, [.8, 2.1, 0], [.8, 1.15, .8]);
  for (const y of [1.38, 2.8]) mesh(new THREE.CylinderGeometry(.31, .31, .1, 12), mats.gold, group, [.8, y, 0]);
  mesh(new THREE.ConeGeometry(.6, .36, 6), mats.wood, group, [.8, 3.01, 0]);
  mesh(geo.box, mats.gold, group, [.8, 1.09, 0], [.04, .5, .04]);
  const light = new THREE.PointLight('#ffb95a', 0, 15, 2); light.position.set(.8, 2.3, 0); group.add(light);
  const ring = mesh(new THREE.RingGeometry(tuning.safe_radius - .08, tuning.safe_radius, 64), new THREE.MeshBasicMaterial({ color: '#ffcf76', transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false }), group, [0, .07, 0]); ring.rotation.x = -Math.PI / 2;
  const aura = mesh(new THREE.CircleGeometry(tuning.safe_radius, 48), new THREE.MeshBasicMaterial({ color: '#ffc363', transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false }), group, [0, .04, 0]); aura.rotation.x = -Math.PI / 2;
  return { group, lightBody, light, ring, aura };
}
function clearViews() {
  for (const view of lanternViews) { view.lightBody.material.dispose(); view.ring.geometry.dispose(); view.ring.material.dispose(); view.aura.geometry.dispose(); view.aura.material.dispose(); }
  // Geometries unique to dynamic groups are released on restart.
  const shared = new Set(Object.values(geo));
  dynamic.traverse(o => { if (o.isMesh && !shared.has(o.geometry)) o.geometry.dispose(); });
  dynamic.clear(); lanternViews = []; moteViews.clear(); shadeViews.clear();
  for (const e of effects) { scene.remove(e.obj); e.obj.geometry.dispose(); e.obj.material.dispose(); } effects = [];
}
let game = newGame();
let playing = false, paused = false, started = false, yaw = -.18, toastUntil = 0, lastTime = 0, accumulator = 0, audio = null, sound = false;
const keys = new Set();
const pendingActions = new Set();
const actionKeys = { jump: 'Space', interact: 'KeyE', pulse: 'KeyQ' };
function rebuild() {
  clearViews(); lanternViews = game.lanterns.map(createLantern);
  $('lantern-progress').innerHTML = game.lanterns.map(l => `<span class="lantern-badge" title="${l.id}">✧</span>`).join('');
}
rebuild();
function start() {
  game = newGame(); rebuild();
  keys.clear(); pendingActions.clear(); accumulator = 0; yaw = 0; playing = true; paused = false; started = true;
  $('intro').classList.add('hidden'); $('intro-footer').classList.add('hidden'); $('ending').classList.add('hidden'); $('help-panel').classList.add('hidden'); $('hud').classList.remove('hidden');
  toast('Đi theo đốm sáng. Đèn đầu tiên ở phía trước Mây.');
}
function toast(text) { $('toast').textContent = text; $('toast').classList.add('show'); toastUntil = performance.now() + 2800; }
function beep(frequency = 660, duration = .12, volume = .035) {
  if (!sound) return;
  audio ??= new AudioContext(); audio.resume();
  const osc = audio.createOscillator(), gain = audio.createGain();
  osc.type = 'sine'; osc.frequency.value = frequency;
  gain.gain.setValueAtTime(volume, audio.currentTime); gain.gain.exponentialRampToValueAtTime(.001, audio.currentTime + duration);
  osc.connect(gain); gain.connect(audio.destination); osc.start(); osc.stop(audio.currentTime + duration);
}
function pulseEffect() {
  const obj = new THREE.Mesh(new THREE.RingGeometry(.9, 1, 64), new THREE.MeshBasicMaterial({ color: '#ffe0a0', side: THREE.DoubleSide, transparent: true, opacity: .8, depthWrite: false }));
  obj.rotation.x = -Math.PI / 2; obj.position.set(game.player.pos[0], .18, game.player.pos[2]); scene.add(obj); effects.push({ obj, life: .65 });
}
function handle(events) {
  for (const e of events) {
    if (e.name === 'mote_picked') beep(520 + e.data.carried * 40, .1, .025);
    if (e.name === 'lantern_lit') { toast('Một ngọn đèn đã thức giấc. Ánh sáng giữ Bóng Mực ở xa.'); beep(880, .7); }
    if (e.name === 'deposit' && !game.lanterns.find(l => l.id === e.data.lantern_id).lit) toast(`Đã nạp ${e.data.amount} đom đóm. Gom thêm để thắp đèn nhé.`);
    if (e.name === 'pulse') { pulseEffect(); beep(220, .4); }
    if (e.name === 'player_hit') { toast('Mây mất một ngọn lửa. Tìm vùng sáng để trú nhé!'); beep(130, .4); $('world').classList.remove('hit-flash'); void $('world').offsetWidth; $('world').classList.add('hit-flash'); }
    if (e.name === 'game_over') showEnding(e.data);
  }
}
function showEnding(data) {
  playing = false; keys.clear(); $('ending').classList.remove('hidden'); $('prompt').classList.add('hidden');
  const won = data.result === 'won';
  $('ending-kicker').textContent = won ? 'NĂM NGỌN ĐÈN. MỘT HÒN ĐẢO THỨC GIẤC.' : 'MỖI HÀNH TRÌNH ĐỀU CÓ THỂ BẮT ĐẦU LẠI';
  $('ending-title').textContent = won ? 'Đảo đã sáng rồi!' : 'Giữ lại một đốm hy vọng.';
  $('ending-text').textContent = won ? 'Mây đã mang ánh sáng về nhà. Đêm đen lùi xa, hòn đảo lại ấm áp giữa biển mây.' : data.reason === 'dawn' ? 'Bình minh đã đến trước khi năm chiếc đèn được thắp. Thử lại một hành trình mới nhé.' : 'Ngọn lửa cuối cùng đã tắt. Những đốm sáng vẫn đang chờ Mây quay lại.';
  $('ending-score').textContent = `${game.score.toLocaleString('vi-VN')} điểm`;
}
function toggleHelp(force) {
  const show = force ?? $('help-panel').classList.contains('hidden');
  $('help-panel').classList.toggle('hidden', !show); paused = show; keys.clear(); pendingActions.clear(); accumulator = 0;
  $('help-title').textContent = started && playing ? 'Nghỉ bên ngọn đèn.' : 'Một chút ánh sáng.';
  $('resume').textContent = started && playing ? 'Tiếp tục hành trình' : 'Đã hiểu';
}
$('start').onclick = start; $('replay').onclick = start;
$('home').onclick = () => { started = false; playing = false; paused = false; game = newGame(); rebuild(); $('ending').classList.add('hidden'); $('hud').classList.add('hidden'); $('intro').classList.remove('hidden'); $('intro-footer').classList.remove('hidden'); };
$('help').onclick = () => toggleHelp(); $('resume').onclick = () => toggleHelp(false);
$('sound').onclick = () => { sound = !sound; $('sound').innerHTML = `♪ <span>Âm thanh ${sound ? 'bật' : 'tắt'}</span>`; $('sound').setAttribute('aria-label', `${sound ? 'Tắt' : 'Bật'} âm thanh`); if (sound) beep(); };
document.addEventListener('keydown', e => {
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
  if (e.repeat) return;
  if (e.code === 'Escape') { toggleHelp(); return; }
  if (e.code === 'Enter' && !started && !paused) { start(); return; }
  if (!paused && playing) {
    keys.add(e.code);
    if (Object.values(actionKeys).includes(e.code)) pendingActions.add(e.code);
  }
});
document.addEventListener('keyup', e => keys.delete(e.code));
window.addEventListener('blur', () => { keys.clear(); if (playing && !paused) toggleHelp(true); });
document.addEventListener('visibilitychange', () => { if (document.hidden && playing && !paused) toggleHelp(true); });
let dragging = false, dragX = 0;
$('world').addEventListener('pointerdown', e => { dragging = true; dragX = e.clientX; $('world').setPointerCapture(e.pointerId); });
$('world').addEventListener('pointermove', e => { if (dragging && !paused) { yaw -= (e.clientX - dragX) * .006; dragX = e.clientX; } });
$('world').addEventListener('pointerup', () => { dragging = false; });
$('world').addEventListener('pointercancel', () => { dragging = false; });

const map = $('minimap').getContext('2d');
function minimap() {
  map.clearRect(0, 0, 180, 180); const scale = 1.8;
  map.strokeStyle = '#7bada333'; map.fillStyle = '#1d414555'; map.lineWidth = 1;
  map.beginPath(); map.arc(90, 90, ISLAND_RADIUS * scale, 0, Math.PI * 2); map.fill(); map.stroke();
  const dot = (pos, radius, color) => { map.fillStyle = color; map.beginPath(); map.arc(90 - pos[0] * scale, 90 - pos[2] * scale, radius, 0, Math.PI * 2); map.fill(); };
  for (const m of game.motes) dot(m.pos, 1, '#e9cb6a99');
  for (const l of game.lanterns) { if (l.lit) dot(l.pos, tuning.safe_radius * scale, '#f8c06626'); dot(l.pos, 3, l.lit ? '#ffce76' : '#728a86'); }
  for (const s of game.shades) dot(s.pos, 2.5, s.state === 'stunned' ? '#c9bce6' : '#a777cd');
  dot(game.player.pos, 3.5, '#d6ffec');
  const x = 90 - game.player.pos[0] * scale, z = 90 - game.player.pos[2] * scale;
  map.strokeStyle = '#d6ffec88'; map.beginPath(); map.moveTo(x, z); map.lineTo(x - Math.sin(yaw) * 9, z - Math.cos(yaw) * 9); map.stroke();
}
function updateHUD() {
  $('flames').textContent = Array.from({ length: tuning.flames }, (_, i) => i < game.player.flames ? '●' : '○').join(' ');
  $('carried').textContent = game.player.carried;
  const seconds = Math.ceil(game.timeLeft); $('time').textContent = `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
  $('score').textContent = String(game.score).padStart(4, '0');
  const lit = game.lanterns.filter(l => l.lit).length;
  $('lit-count').textContent = `${lit} / 5`;
  [...$('lantern-progress').children].forEach((el, i) => { el.classList.toggle('lit', game.lanterns[i].lit); el.title = `${game.lanterns[i].id}: ${game.lanterns[i].deposited}/${tuning.lantern_cost}`; });
  const remaining = Math.max(0, (game.pulseReadyAt - game.tick) / HZ);
  $('pulse-status').textContent = remaining > 0 ? `Hồi lại sau ${remaining.toFixed(1)}s` : game.player.carried >= tuning.pulse_cost ? 'Sẵn sàng · −3 đom đóm' : 'Cần 3 đom đóm';
  $('pulse-meter').style.width = `${(1 - Math.min(1, remaining / tuning.pulse_cooldown_s)) * 100}%`;
  const near = game.lanterns.filter(l => distance(l.pos, game.player.pos) <= tuning.interact_radius).sort((a, b) => distance(a.pos, game.player.pos) - distance(b.pos, game.player.pos))[0];
  const prompt = $('prompt'); prompt.classList.toggle('hidden', !near || !playing || paused);
  if (near) prompt.innerHTML = near.lit ? '✧ Bạn đang ở trong vùng sáng an toàn' : `<span class="key">E</span> Nạp ánh sáng · ${near.deposited}/${tuning.lantern_cost}<small>${game.player.carried ? `Đang mang ${game.player.carried} đom đóm` : 'Đi gom thêm đom đóm rồi quay lại nhé'}</small>`;
  $('map-status').textContent = lit >= 3 ? 'ÁNH SÁNG TRỞ VỀ' : 'SƯƠNG ĐEN';
  minimap();
}
const targetCamera = new THREE.Vector3(), lookAt = new THREE.Vector3();
function syncWorld(time, delta) {
  const p = game.player;
  keeper.position.set(...p.pos);
  const moving = playing && !paused && (keys.has('KeyW') || keys.has('KeyA') || keys.has('KeyS') || keys.has('KeyD') || keys.has('ArrowUp') || keys.has('ArrowDown'));
  if (moving) { const x = Number(keys.has('KeyA')) - Number(keys.has('KeyD')), z = Number(keys.has('KeyW') || keys.has('ArrowUp')) - Number(keys.has('KeyS') || keys.has('ArrowDown')); keeper.rotation.y = Math.atan2(x * Math.cos(yaw) + z * Math.sin(yaw), -x * Math.sin(yaw) + z * Math.cos(yaw)); }
  legs.forEach((l, i) => { l.rotation.x = moving ? Math.sin(time * 12 + i * Math.PI) * .5 : 0; });
  arms.forEach((l, i) => { l.rotation.x = moving ? Math.sin(time * 12 - i * Math.PI) * .35 : .08; });
  hat.rotation.z = Math.sin(time * 1.8) * .025;
  keeper.visible = !playing || game.tick >= game.invulnerableUntil || Math.floor(time * 12) % 2 === 0;
  game.lanterns.forEach((l, i) => {
    const v = lanternViews[i]; v.group.position.set(...l.pos);
    v.lightBody.material.color.set(l.lit ? '#ffcf7a' : '#78816a'); v.lightBody.material.emissive.set(l.lit ? '#ff9f35' : '#9c8b53'); v.lightBody.material.emissiveIntensity = l.lit ? 2.2 : .23 + l.deposited / tuning.lantern_cost;
    v.light.intensity = l.lit ? 32 + Math.sin(time * 3 + i) * 2 : 1;
    v.ring.material.opacity = l.lit ? .25 : 0; v.aura.material.opacity = l.lit ? .08 : 0;
  });
  const moteIds = new Set(game.motes.map(m => m.id));
  for (const [id, view] of moteViews) if (!moteIds.has(id)) { dynamic.remove(view); moteViews.delete(id); }
  for (const m of game.motes) {
    if (!moteViews.has(m.id)) { const view = mesh(geo.orb, mats.glow, dynamic, [0, 0, 0], [.13, .13, .13]); view.castShadow = false; moteViews.set(m.id, view); }
    const v = moteViews.get(m.id), phase = Number(m.id.slice(1)) * 1.7;
    v.position.set(m.pos[0] + Math.sin(time * 1.2 + phase) * .12, .65 + Math.sin(time * 2 + phase) * .2, m.pos[2]);
  }
  for (const s of game.shades) {
    if (!shadeViews.has(s.id)) {
      const group = new THREE.Group(); dynamic.add(group);
      mesh(geo.orb, mats.shade, group, [0, .9, 0], [.75, .9, .6]);
      for (let i = 0; i < 3; i++) mesh(geo.cone, mats.shade, group, [(i - 1) * .36, .23, 0], [.22, .6, .25]).rotation.z = Math.PI;
      for (const x of [-.24, .24]) mesh(geo.orb, mats.eyes, group, [x, 1.08, .49], [.1, .065, .07]);
      const halo = mesh(new THREE.TorusGeometry(.9, .035, 4, 20), mats.eyes, group, [0, 1.75, 0]); halo.rotation.x = Math.PI / 2; halo.visible = false;
      shadeViews.set(s.id, { group, halo });
    }
    const v = shadeViews.get(s.id); v.group.position.set(s.pos[0], s.pos[1] + Math.sin(time * 3) * .13, s.pos[2]);
    v.group.rotation.y = Math.atan2(p.pos[0] - s.pos[0], p.pos[2] - s.pos[2]); v.halo.visible = s.state === 'stunned'; v.halo.rotation.z = time;
  }
  const lit = game.lanterns.filter(l => l.lit).length;
  ambient.intensity = 2 + lit * .18; scene.fog.density = .012 - lit * .0013;
  for (const e of effects) { e.life -= delta; const radius = (1 - e.life / .65) * tuning.pulse_radius; e.obj.scale.setScalar(Math.max(.1, radius)); e.obj.material.opacity = Math.max(0, e.life); }
  effects = effects.filter(e => { if (e.life > 0) return true; scene.remove(e.obj); e.obj.geometry.dispose(); e.obj.material.dispose(); return false; });
  if (!started) {
    const a = -.18 + Math.sin(time * .055) * .08;
    targetCamera.set(-18 + Math.sin(a) * 10, 24, -40); lookAt.set(6, 0, 4);
  } else {
    targetCamera.set(p.pos[0] - Math.sin(yaw) * 16, p.pos[1] * .35 + 12, p.pos[2] - Math.cos(yaw) * 16);
    lookAt.set(p.pos[0] + Math.sin(yaw) * 4, p.pos[1] * .6 + .6, p.pos[2] + Math.cos(yaw) * 4);
  }
  camera.position.lerp(targetCamera, 1 - Math.exp(-delta * 5)); camera.lookAt(lookAt);
}
function animate(ms) {
  requestAnimationFrame(animate);
  const delta = Math.min(.1, (ms - lastTime) / 1000 || DT); lastTime = ms;
  if (playing && !paused) {
    if (keys.has('ArrowLeft')) yaw += delta * 1.5;
    if (keys.has('ArrowRight')) yaw -= delta * 1.5;
    accumulator += delta;
    while (accumulator >= DT && playing) {
      // Buffer quick button taps so keydown+keyup between render frames is not lost.
      const actions = {};
      for (const [action, key] of Object.entries(actionKeys)) {
        if (pendingActions.has(key)) {
          actions[action] = !game.input[action];
          if (actions[action]) pendingActions.delete(key);
        } else actions[action] = keys.has(key);
      }
      handle(game.step({ move: [Number(keys.has('KeyA')) - Number(keys.has('KeyD')), Number(keys.has('KeyW') || keys.has('ArrowUp')) - Number(keys.has('KeyS') || keys.has('ArrowDown'))], cam_yaw_deg: yaw * 180 / Math.PI, ...actions }));
      accumulator -= DT;
    }
  }
  if (toastUntil && ms > toastUntil) { $('toast').classList.remove('show'); toastUntil = 0; }
  syncWorld(ms / 1000, delta); if (started) updateHUD(); renderer.render(scene, camera);
}
camera.position.set(-18, 24, -40);
window.addEventListener('resize', () => { renderer.setSize(innerWidth, innerHeight); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); });
$('loading').classList.add('hidden'); requestAnimationFrame(animate);
