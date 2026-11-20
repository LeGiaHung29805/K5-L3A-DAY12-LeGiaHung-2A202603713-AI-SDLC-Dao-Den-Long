import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { performance } from 'node:perf_hooks';
import os from 'node:os';
import assert from 'node:assert/strict';
import { worldFor } from '../src/world.js';
const dir = 'docs/proof/phase-3', fixtures = 'tests/fixtures/phase3';
mkdirSync(dir, { recursive: true }); mkdirSync(fixtures, { recursive: true });
const json = (path, value) => writeFileSync(path, JSON.stringify(value, null, 2) + '\n');
const hash = path => createHash('sha256').update(readFileSync(path)).digest('hex');
const quiet = { random_motes: false, random_shades: false, random_drifters: false, wind_enabled: false, motes: [], shades: [], drifters: [], charms: [] };
const lamp = (fuel, extra = {}) => ({ id: 'L1', pos: [0, 0, 0], lit: true, fuel, ...extra });
const cases = {
  'fuel-out': { scenario: { ...quiet, lanterns: [lamp(100)] }, ticks: 6001, event: 'lantern_out' },
  refuel: { scenario: { ...quiet, player: { carried: 10 }, lanterns: [lamp(85)] }, frames: [{ tick: 0, interact: true }], ticks: 10, event: 'refuel' },
  relight: { scenario: { ...quiet, player: { carried: 5 }, lanterns: [lamp(1 / 60)] }, frames: [{ tick: 0, interact: true }], ticks: 10, event: 'lantern_lit' },
  drain: { scenario: { ...quiet, player: { pos: [20, 0, 0] }, lanterns: [lamp(20)], shades: ['S1', 'S2'].map((id, i) => ({ id, pos: [i ? -1 : 1, .8, 0], state: 'drain', target_lantern_id: 'L1' })) }, ticks: 120, event: 'fuel_drain' },
  'drain-pulse': { scenario: { ...quiet, player: { carried: 10 }, lanterns: [lamp(20)], shades: [{ pos: [1, .8, 0], state: 'drain', target_lantern_id: 'L1' }] }, frames: [{ tick: 0, pulse: true }], ticks: 10, event: 'pulse' },
  'safe-restored': { scenario: { ...quiet, player: { carried: 3 }, lanterns: [lamp(20)], shades: [{ pos: [1, .8, 0], state: 'drain', target_lantern_id: 'L1' }] }, frames: [{ tick: 0, interact: true }], ticks: 10, event: 'refuel' },
  capacity: { scenario: { ...quiet, player: { carried: 18, successful_lights: 4 }, lanterns: [lamp(1 / 60)], motes: [[0, 0, 0], [0, 0, 0]] }, frames: [{ tick: 0, interact: true }], ticks: 10, event: 'lantern_lit' },
  'pause-fuel': { scenario: { ...quiet, lanterns: [lamp(20)] }, frames: [{ tick: 0, pause: true }], ticks: 120, event: 'paused' },
  'no-early-win': { scenario: { ...quiet, lanterns: worldFor(1).lanterns.map(l => ({ id: l.id, lit: true })) }, ticks: 120 },
  'dawn-out': { scenario: { ...quiet, time_left_s: 1 / 60, lanterns: [lamp(1 / 60), lamp(50, { id: 'L2' }), lamp(50, { id: 'L3' })] }, ticks: 10, event: 'game_over' }
};
const checks = [];
function run(name, scenario, frames, tickCount, night = 1, every = 10) {
  const scenarioFile = `${fixtures}/${name}.json`, inputsFile = `${fixtures}/${name}.inputs.json`, out = `${dir}/${name}.jsonl`;
  json(scenarioFile, scenario); json(inputsFile, { frames: frames ?? [] });
  const args = ['src/headless.mjs', '--seed', '2026', '--night', String(night), '--scenario', scenarioFile, '--inputs', inputsFile, '--ticks', String(tickCount), '--snapshot-every', String(every), '--out', out];
  const start = performance.now(), result = spawnSync(process.execPath, args, { encoding: 'utf8' }); assert.equal(result.status, 0, result.stderr);
  const elapsed_ms = Math.round((performance.now() - start) * 100) / 100;
  const rows = readFileSync(out, 'utf8').trim().split('\n').map(JSON.parse); assert.equal(rows.at(-1).type, 'end');
  checks.push({ name, command: `node ${args.join(' ')}`, elapsed_ms, sha256: hash(out), end: rows.at(-1) }); return rows;
}
for (const [name, c] of Object.entries(cases)) {
  const rows = run(name, c.scenario, c.frames, c.ticks); if (c.event) assert.ok(rows.some(r => r.name === c.event), `${name}: missing ${c.event}`);
  if (name === 'fuel-out') assert.equal(rows.find(r => r.name === 'lantern_out').tick, 6000);
  if (name === 'drain') assert.equal(rows.filter(r => r.name === 'fuel_drain').length, 2);
  if (name === 'drain-pulse') assert.equal(rows.at(-1).score, 15);
  if (name === 'capacity') assert.equal(rows.find(r => r.tick === 10 && r.type === 'snapshot').player.capacity, 20);
  if (name === 'pause-fuel') { const s = rows.findLast(r => r.type === 'snapshot'); assert.equal(s.lanterns[0].fuel, 20); assert.equal(s.sim_tick, 0); }
  if (name === 'no-early-win') assert.equal(rows.at(-1).state, 'playing');
  if (name === 'dawn-out') assert.equal(rows.at(-1).state, 'lost');
}
for (const night of [1, 2, 3]) {
  const world = worldFor(night), need = Math.ceil(.6 * world.lanterns.length);
  for (const offset of [-1, 0]) {
    const scenario = { ...quiet, time_left_s: 2, lanterns: world.lanterns.slice(0, need + offset).map(l => ({ id: l.id, lit: true, fuel: 50 })) };
    const rows = run(`dawn-${night}-${offset === 0 ? 'won' : 'lost'}`, scenario, [], 130, night);
    assert.equal(rows.at(-1).state, offset === 0 ? 'won' : 'lost');
  }
  json(`${fixtures}/campaign-${night}.json`, { ...quiet, player: { pos: world.spawn, carried: 10 }, time_left_s: 4, lanterns: [{ id: 'L1', pos: world.spawn }, ...world.lanterns.slice(1, need).map(l => ({ id: l.id, lit: true, fuel: 50 }))] });
}
const full = run('full-night-3', { player: { invuln_ticks: 18001 }, wind_enabled: false }, [], 18000, 3, 60);
assert.equal(full.at(-1).ticks, 18000); assert.ok(checks.at(-1).elapsed_ms < 30000);
for (const suffix of ['a', 'b']) run(`seed-${suffix}`, cases.drain.scenario, [], 2400, 1, 30);
assert.equal(hash(`${dir}/seed-a.jsonl`), hash(`${dir}/seed-b.jsonl`));
const tests = spawnSync(process.execPath, ['--test'], { encoding: 'utf8' }); writeFileSync(`${dir}/tests.txt`, tests.stdout + tests.stderr); assert.equal(tests.status, 0);
json(`${dir}/summary.json`, { contract_version: '1.2', generated_at: new Date().toISOString(), node: process.version, platform: `${os.platform()} ${os.release()} ${os.arch()}`, cpu: os.cpus()[0]?.model, source_sha256: Object.fromEntries(['src/simulation.js', 'src/rules.js', 'game.contract.json'].map(p => [p, hash(p)])), deterministic: true, test_exit_code: tests.status, checks });
console.log(`Phase 3: ${checks.length} real headless runs passed; fuel/drain/relight/dawn/capacity + full 18000-tick night.`);
