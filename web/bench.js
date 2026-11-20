import { GameView } from './render.js';
import { createBenchmarkScene, benchmarkCamera } from './bench-scene.js';
import { benchmarkMetrics } from './src/bench-metrics.js';
const params = new URLSearchParams(location.search), seed = Number(params.get('seed') ?? 42), duration = Number(params.get('duration') ?? 30), token = params.get('token');
const contract = await fetch('./game.contract.json').then(r => r.json()), scene = createBenchmarkScene(contract.tuning, seed);
const view = new GameView(document.querySelector('#world')); view.benchmarkMode = true; view.renderer.setSize(1280, 720); view.camera.aspect = 1280 / 720; view.camera.updateProjectionMatrix(); view.build(scene.game);
const gl = view.renderer.getContext(), ext = gl.getExtension('WEBGL_debug_renderer_info'), renderer = ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
const status = document.querySelector('#status'), samples = []; let first = null, previous = null, accumulated = 0, finished = false, recorder = null, chunks = [];
const capture = document.createElement('canvas'); capture.width = 1280; capture.height = 720; const ctx = capture.getContext('2d');
if (params.get('record') === '1' && typeof MediaRecorder !== 'undefined') {
  const stream = capture.captureStream(30); recorder = new MediaRecorder(stream, { mimeType: MediaRecorder.isTypeSupported('video/webm;codecs=vp9') ? 'video/webm;codecs=vp9' : 'video/webm', videoBitsPerSecond: 2_500_000 });
  recorder.ondataavailable = e => { if (e.data.size) chunks.push(e.data); };
  recorder.onstop = async () => { const video = new Blob(chunks, { type: 'video/webm' }); await fetch('/__video', { method: 'POST', body: video }); };
}
async function finish() {
  finished = true;
  const metrics = benchmarkMetrics(samples), data = { token, seed, width: 1280, height: 720, shades: scene.game.shades.length, motes: scene.game.motes.length, renderer, viewport: { width: innerWidth, height: innerHeight }, frame_ms: samples };
  const response = await fetch('/__bench', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
  status.textContent = `Đã đo thật: ${metrics.avg_fps.toFixed(2)} FPS · 1% low ${metrics.p1_low_fps.toFixed(2)} · P95 ${metrics.frame_ms_p95.toFixed(2)} ms`;
  document.querySelector('#results').textContent = JSON.stringify({ ...metrics, response_ok: response.ok, renderer, viewport: data.viewport }, null, 2);
  ctx.fillStyle = '#071426'; ctx.fillRect(0, 510, 1280, 210); ctx.fillStyle = '#f5f1e6'; ctx.font = '24px monospace';
  [status.textContent, `seed ${seed} | 200 wandering Shadows | 100 fireflies | ${duration}s measured after 3s warmup`, 'Real browser rendering; vsync is browser controlled; RSS unavailable in web builds.'].forEach((line, i) => ctx.fillText(line, 20, 550 + i * 42));
  if (recorder?.state === 'recording') setTimeout(() => recorder.stop(), 2500);
}
function frame(now) {
  if (finished) return; first ??= now; previous ??= now;
  const delta = now - previous, elapsed = now - first; previous = now;
  accumulated += Math.min(delta, 250) / 1000; while (accumulated >= 1 / 60) { scene.step(); accumulated -= 1 / 60; }
  view.cameraOverride = benchmarkCamera(elapsed / 1000);
  view.sync(scene.game, elapsed / 1000, Math.min(delta / 1000, .1), 0, false);
  if (elapsed === 0) fetch('/__bench', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token, type: 'first_frame' }) });
  const end = 3000 + duration * 1000, intervalStart = elapsed - delta;
  const overlap = Math.max(0, Math.min(elapsed, end) - Math.max(intervalStart, 3000)); if (overlap > 0) samples.push(overlap);
  status.textContent = `${elapsed < 3000 ? 'Khởi động 3 giây' : 'Đang đo'} · 200 Bóng Mực wander · 100 đom đóm · ${Math.min(duration, Math.max(0, elapsed / 1000 - 3)).toFixed(1)}/${duration}s · 1280×720`;
  if (recorder) { ctx.drawImage(view.renderer.domElement, 0, 0); ctx.fillStyle = '#071426dd'; ctx.fillRect(0, 0, 1280, 80); ctx.fillStyle = '#F5F1E6'; ctx.font = '21px monospace'; ctx.fillText('DAO DEN LONG — REAL WEBGL BENCHMARK / CONTRACT 1.3', 18, 30); ctx.fillText(status.textContent, 18, 62); if (!first || recorder.state === 'inactive') recorder.start(1000); }
  if (elapsed >= end) finish().catch(e => { status.textContent = `Benchmark failed: ${e.message}`; }); else requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
