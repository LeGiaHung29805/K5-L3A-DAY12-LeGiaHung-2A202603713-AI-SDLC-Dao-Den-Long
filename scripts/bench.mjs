import { parseArgs } from 'node:util';
import { fileURLToPath } from 'node:url';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { randomBytes, createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import { performance } from 'node:perf_hooks';
import os from 'node:os';
import { createGameServer } from './server-lib.mjs';
import { benchmarkMetrics } from '../src/bench-metrics.js';
const started = performance.now(), processEpoch = Date.now();
try {
  const { values } = parseArgs({ options: { seed: { type: 'string' }, duration: { type: 'string' }, out: { type: 'string' }, port: { type: 'string' }, 'no-open': { type: 'boolean' }, video: { type: 'string' } } });
  const seed = Number(values.seed ?? 42), duration = Number(values.duration ?? 30), port = Number(values.port ?? 5174);
  if (!Number.isSafeInteger(seed) || !Number.isFinite(duration) || duration <= 0 || duration > 300 || !values.out) throw Error('Usage: --seed 42 --duration 30 --out bench.json');
  const token = randomBytes(16).toString('hex'); let loadMs = null, completed = false;
  const server = createGameServer({ root: fileURLToPath(new URL('../dist/', import.meta.url)),
    receiveBenchmark: async (data, send) => {
      if (data.token !== token) return send(403, { error: 'Wrong benchmark job' });
      if (data.type === 'first_frame') { loadMs ??= performance.now() - started; return send(200, { ok: true }); }
      const metrics = benchmarkMetrics(data.frame_ms);
      const sum = data.frame_ms.reduce((a, b) => a + b, 0);
      if (Math.abs(sum - duration * 1000) > 1 || data.seed !== seed || data.width !== 1280 || data.height !== 720 || data.shades !== 200 || data.motes !== 100) return send(400, { error: 'Scene or measurement interval mismatch' });
      const result = { contract_version: '1.3', ...metrics, load_ms: loadMs, peak_mem_mb: null, vsync_off: false, renderer: data.renderer, os: `${os.type()} ${os.release()} ${os.arch()}`,
        seed, duration_s: duration, warmup_s: 3, width: 1280, height: 720, viewport: data.viewport, shadows: 200, fireflies: 100, memory_note: 'Web build: browser process RSS is not available to JavaScript.', vsync_note: 'requestAnimationFrame is browser scheduled; WebGL has no portable vsync-disable API.', frame_data_sha256: createHash('sha256').update(JSON.stringify(data.frame_ms)).digest('hex') };
      await mkdir(dirname(resolve(values.out)), { recursive: true }); await writeFile(values.out, JSON.stringify(result, null, 2) + '\n');
      await writeFile(values.out.replace(/\.json$/i, '') + '.frames.json', JSON.stringify(data.frame_ms) + '\n');
      completed = true; console.log(JSON.stringify(result)); send(200, { ok: true });
      if (!values.video) { server.close(); clearTimeout(timeout); }
    },
    receiveVideo: values.video ? async (data, send) => { await writeFile(values.video, data); send(200, { ok: true }); server.close(); clearTimeout(timeout); console.log(`Recorded actual benchmark video: ${values.video}`); } : undefined
  });
  const timeout = setTimeout(() => { console.error(completed ? 'Video recording did not arrive' : 'Benchmark browser did not complete. No result fabricated.'); server.close(); process.exitCode = 1; }, (duration + 120) * 1000);
  server.listen(port, '127.0.0.1', () => {
    const query = new URLSearchParams({ seed: String(seed), duration: String(duration), token, process_start: String(processEpoch), record: values.video ? '1' : '0' });
    const url = `http://localhost:${port}/bench.html?${query}`; console.log(`BENCH_URL=${url}`);
    if (!values['no-open']) {
      const command = process.platform === 'win32' ? ['cmd', ['/c', 'start', '', url]] : process.platform === 'darwin' ? ['open', [url]] : ['xdg-open', [url]];
      const opener = spawn(command[0], command[1], { stdio: 'ignore', windowsHide: true }); opener.on('error', () => console.log('Open BENCH_URL manually.'));
    }
  });
  server.on('error', error => { clearTimeout(timeout); console.error(error.message); process.exitCode = 1; });
} catch (error) { console.error(error.message); process.exitCode = 2; }
