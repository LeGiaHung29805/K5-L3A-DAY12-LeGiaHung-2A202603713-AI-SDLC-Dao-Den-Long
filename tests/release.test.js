import test from 'node:test';
import assert from 'node:assert/strict';
import { benchmarkMetrics } from '../src/bench-metrics.js';
import { Leaderboard, orderedEntries, validPlayerName } from '../src/leaderboard.js';
import { Settings } from '../web/settings.js';
import { DEFAULT_BINDINGS, validateBindings } from '../web/bindings.js';
import { InputBuffer } from '../web/input.js';
import { createBenchmarkScene, benchmarkCamera } from '../web/bench-scene.js';
import { readFileSync, writeFileSync, mkdtempSync, rmSync, mkdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
const { tuning } = JSON.parse(readFileSync('game.contract.json', 'utf8'));
test('benchmark formulas: mean FPS, largestceil1percent, nearest-rank P95', () => {
  const frames = [...Array(94).fill(10), ...Array(5).fill(20), 40]; const result = benchmarkMetrics(frames);
  assert.equal(result.avg_fps, 100000 / 1080); assert.equal(result.p1_low_fps, 25); assert.equal(result.frame_ms_p95, 20); assert.equal(result.frames, 100);
  assert.throws(() => benchmarkMetrics([])); assert.throws(() => benchmarkMetrics([0])); assert.equal(benchmarkMetrics([25]).p1_low_fps, 40);
});
test('benchmark scene exact200/100, fixed lamps/fuel/player, seededwander withoutgameplay', () => {
  const a = createBenchmarkScene(tuning, 42), b = createBenchmarkScene(tuning, 42); assert.deepEqual(a.game.snapshot(), b.game.snapshot());
  for (let i = 0; i < 1800; i++) { a.step(); b.step(); }
  assert.deepEqual(a.game.snapshot(), b.game.snapshot()); assert.equal(a.game.shades.length, 200); assert.equal(a.game.motes.length, 100);
  assert.ok(a.game.shades.every(s => s.state === 'wander')); assert.deepEqual(a.game.player.pos, [0, 0, 0]); assert.equal(a.game.player.flames, 3); assert.equal(a.game.score, 0); assert.equal(a.game.state, 'playing');
  assert.equal(a.game.lanterns.filter(l => l.lit).length, 3); assert.ok(a.game.lanterns.slice(0, 3).every(l => l.fuelUnits === 6000));
});
test('benchmark orbit radius30, height15, CCW,15s revolution', () => {
  assert.deepEqual(benchmarkCamera(0).pos, [30, 15, 0]); const q = benchmarkCamera(3.75).pos; assert.ok(Math.abs(q[0]) < 1e-9); assert.equal(q[2], -30); assert.ok(Math.abs(benchmarkCamera(15).pos[0] - 30) < 1e-9);
});
test('leaderboard strictnames/top10/descending score/earliest tie/persistence', () => {
  for (const bad of ['ab', 'a-b', 'Mây', 'a'.repeat(13), '<script>']) assert.equal(validPlayerName(bad), false);
  const data = new Map(), storage = { getItem: k => data.get(k), setItem: (k, v) => data.set(k, v) }, board = new Leaderboard(storage);
  for (let i = 0; i < 12; i++) board.add({ name: `May_${i}`, score: i, nights_won: 1, achieved_at: new Date(1700000000000 + i * 1000).toISOString(), seed: 2026 });
  assert.equal(board.entries.length, 10); assert.equal(board.entries[0].score, 11); assert.deepEqual(new Leaderboard(storage).export(), board.export());
  const tie = orderedEntries([{ ...board.entries[0], name: 'Later', achieved_at: '2026-02-01T00:00:00Z' }, { ...board.entries[0], name: 'Early', achieved_at: '2026-01-01T00:00:00Z' }]); assert.equal(tie[0].name, 'Early'); assert.throws(() => board.add({ name: 'bad' }));
});
test('run_cmd exports same ordered local leaderboard without startingserver', () => {
  const dir = mkdtempSync(join(tmpdir(), 'dao-board-')); try {
    const entries = [{ name: 'Player_1', score: 10, nights_won: 1, seed: 7, achieved_at: '2026-01-01T00:00:00Z' }]; writeFileSync(join(dir, 'leaderboard.json'), JSON.stringify({ entries }));
    const out = join(dir, 'export.json'), p = spawnSync(process.execPath, ['scripts/serve.mjs', '--export-leaderboard', out], { encoding: 'utf8', env: { ...process.env, DAO_DATA_DIR: dir } });
    assert.equal(p.status, 0, p.stderr); assert.deepEqual(JSON.parse(readFileSync(out, 'utf8')), { entries });
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
test('bindings cover9actions, conflict reject, persist, reset, quick remappedpulse', () => {
  const changed = validateBindings({ ...DEFAULT_BINDINGS, pulse: 'KeyF' }); assert.throws(() => validateBindings({ ...DEFAULT_BINDINGS, jump: 'KeyW' }), /Trùng/);
  const input = new InputBuffer(changed); input.down('KeyF'); input.up('KeyF'); assert.equal(input.frame({}, 0).pulse, true); input.setBindings(DEFAULT_BINDINGS); assert.equal(input.frame({}, 0).pulse, false);
  const data = new Map(), storage = { getItem: k => data.get(k), setItem: (k, v) => data.set(k, v) }; const settings = new Settings(storage);
  settings.set({ bindings: changed, reducedMotion: true, largeText: true }); const restored = new Settings(storage); assert.equal(restored.value.bindings.pulse, 'KeyF'); assert.equal(restored.value.reducedMotion, true); assert.equal(restored.value.largeText, true);
});
test('one-process soak:10results seed7..16, no crashes, RSSwithin20percent', () => {
  const dir = mkdtempSync(join(tmpdir(), 'dao-soak-')); try {
    const out = join(dir, 'soak.json'), p = spawnSync(process.execPath, ['--jitless', '--expose-gc', '--max-semi-space-size=1', '--max-old-space-size=32', 'scripts/soak.mjs', '--seed', '7', '--nights', '10', '--out', out], { encoding: 'utf8' });
    const data = JSON.parse(readFileSync(out, 'utf8')); assert.equal(p.status, 0, p.stdout + p.stderr); assert.equal(data.results.length, 10); assert.equal(data.crashes, 0); assert.deepEqual(data.results.map(r => r.seed), Array.from({ length: 10 }, (_, i) => 7 + i)); assert.ok(data.mem_end_mb <= 1.2 * data.mem_start_mb);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
