import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import os from 'node:os';
import { performance } from 'node:perf_hooks';
import assert from 'node:assert/strict';
import { Game, distance } from '../src/core.js';
import { worldFor } from '../src/world.js';
const dir = 'docs/proof/phase-2', fixtures = 'tests/fixtures/phase2';
mkdirSync(dir, { recursive: true }); mkdirSync(fixtures, { recursive: true });
const { tuning } = JSON.parse(readFileSync('game.contract.json', 'utf8'));
const json = (path, value) => writeFileSync(path, JSON.stringify(value, null, 2) + '\n');
const digest = file => createHash('sha256').update(readFileSync(file)).digest('hex');
const quiet = { random_motes: false, random_shades: false, random_drifters: false, wind_enabled: false, motes: [], shades: [], drifters: [] };
const definitions = {
  dash: { night: 1, scenario: { ...quiet, player: { pos: [0, 3, 0] } }, frames: [{ tick: 0, dash: true }, { tick: 1, dash: false }], ticks: 100, event: 'dash' },
  pause: { night: 2, scenario: { ...quiet, player: { invuln_ticks: 120, charm_ticks: 600 }, motes: [{ pos: [10, 0, 0], kind: 'dropped', ttl_s: 8 }] }, frames: [{ tick: 0, pause: true }, { tick: 60, pause: false }, { tick: 120, pause: true }, { tick: 121, pause: false }], ticks: 180, event: 'resumed' },
  charm: { night: 2, scenario: { ...quiet, player: { pos: [35, 0, 0] } }, frames: [{ tick: 0, move: [1, 0] }, { tick: 1, dash: true }, { tick: 2, dash: false }, { tick: 13, move: [0, 0] }], ticks: 650, event: 'charm_picked' },
  drifter: { night: 2, scenario: { ...quiet, player: { carried: 8 }, drifters: [{ id: 'D1', pos: [.5, .8, 0], state: 'chase' }] }, frames: [{ tick: 2, pulse: true }, { tick: 3, pulse: false }], ticks: 150, event: 'drifter_drop' },
  fall: { night: 1, scenario: { ...quiet, player: { pos: [41, -11, 0], carried: 10, invuln_ticks: 600 } }, frames: [], ticks: 70, event: 'player_hit' },
  pad: { night: 2, scenario: { ...quiet, player: { pos: [20, 0, 18] } }, frames: [{ tick: 0, move: [0, 0] }, { tick: 1, move: [-1, 0] }, { tick: 84, move: [0, 0] }], ticks: 100 },
  tiers: { night: 3, scenario: { ...quiet, player: { pos: [30 * Math.cos(Math.PI / 6), 0, 15] } }, frames: [{ tick: 0, move: [-Math.cos(Math.PI / 6), -.5] }, { tick: 61, move: [0, 0] }], ticks: 100 },
  tower: { night: 3, scenario: { ...quiet, player: { pos: [0, 3, 13] } }, frames: [{ tick: 1, move: [1, 0] }, { tick: 52, move: [0, 0] }], ticks: 70 },
  wind: { night: 3, scenario: { ...quiet, wind_enabled: true }, frames: [], ticks: 2120 },
  dropped: { night: 1, scenario: { ...quiet, motes: [{ pos: [10, 0, 0], kind: 'dropped', ttl_s: 1 }] }, frames: [], ticks: 65 },
  spawns: { night: 2, scenario: { random_motes: true, random_shades: true, random_drifters: true, player: { invuln_ticks: 10000 } }, frames: [], ticks: 2450, event: 'shade_spawned' }
};
const checks = [];
function run(name, night, scenarioFile, inputFile, maxTicks, every = 10, requiredEvent) {
  const out = `${dir}/${name}.jsonl`, args = ['src/headless.mjs', '--seed', '2026', '--night', String(night), '--ticks', String(maxTicks), '--snapshot-every', String(every), '--out', out];
  if (scenarioFile) args.push('--scenario', scenarioFile); if (inputFile) args.push('--inputs', inputFile);
  const start = performance.now(), result = spawnSync(process.execPath, args, { encoding: 'utf8', maxBuffer: 10_000_000 });
  assert.equal(result.status, 0, result.stderr); const elapsed = performance.now() - start;
  const rows = readFileSync(out, 'utf8').trim().split('\n').map(JSON.parse); assert.equal(rows.at(-1).type, 'end');
  if (requiredEvent) assert.ok(rows.some(r => r.name === requiredEvent), `${name}: missing ${requiredEvent}`);
  checks.push({ name, command: `node ${args.join(' ')}`, sha256: digest(out), elapsed_ms: Math.round(elapsed * 100) / 100, end: rows.at(-1) }); return rows;
}
for (const [name, d] of Object.entries(definitions)) {
  const scenarioFile = `${fixtures}/${name}.json`, inputFile = `${fixtures}/${name}.inputs.json`;
  json(scenarioFile, d.scenario); json(inputFile, { frames: d.frames }); const rows = run(name, d.night, scenarioFile, inputFile, d.ticks, 10, d.event);
  const snapshots = rows.filter(r => r.type === 'snapshot');
  if (name === 'pause') { assert.equal(snapshots.find(s => s.tick === 120).sim_tick, 0); assert.equal(snapshots.find(s => s.tick === 130).sim_tick, 10); }
  if (name === 'fall') { assert.equal(rows.filter(r => r.name === 'player_hit').length, 1); assert.deepEqual(snapshots.at(-1).player.pos, [0, 0, 0]); }
  if (name === 'pad') assert.ok(snapshots.at(-1).player.pos[0] > 48);
  if (name === 'tiers') assert.equal(snapshots.at(-1).player.pos[1], 3);
  if (name === 'tower') assert.equal(snapshots.at(-1).player.pos[1], 6);
  if (name === 'wind') { assert.equal(snapshots.find(s => s.tick === 1800).wind.active, true); assert.equal(snapshots.find(s => s.tick === 2100).wind.active, false); }
  if (name === 'dropped') assert.equal(snapshots.at(-1).motes.length, 0);
}
for (const night of [1, 2, 3]) {
  const w = worldFor(night), pos = w.spawn;
  const scenario = { ...quiet, player: { pos, carried: 10 }, time_left_s: 120, lanterns: w.lanterns.map((l, i) => i ? { id: l.id, lit: true } : { id: l.id, pos }) };
  json(`${fixtures}/campaign-${night}.json`, scenario); json(`${fixtures}/win.inputs.json`, { frames: [{ tick: 0, interact: true }] });
  assert.equal(run(`night-${night}-win`, night, `${fixtures}/campaign-${night}.json`, `${fixtures}/win.inputs.json`, 100).at(-1).state, 'won');
  const route = makeRoute(night), scenarioFile = `${dir}/route-${night}.scenario.json`, inputFile = `${dir}/route-${night}.inputs.json`;
  json(scenarioFile, route.scenario); json(inputFile, { frames: route.frames });
  const rows = run(`route-${night}`, night, scenarioFile, inputFile, route.ticks + 1, 60);
  assert.equal(rows.at(-1).state, 'won'); assert.equal(rows.filter(r => r.name === 'lantern_lit').length, w.lanterns.length);
}
const benchmarkScenario = `${fixtures}/benchmark.json`;
json(benchmarkScenario, { player: { invuln_ticks: 21601 }, wind_enabled: false });
const full = run('headless-21600', 3, benchmarkScenario, null, 21600, 60); assert.equal(full.at(-1).ticks, 21600); assert.ok(checks.at(-1).elapsed_ms <= 30000);
run('seed-a', 3, benchmarkScenario, null, 2400, 30); run('seed-b', 3, benchmarkScenario, null, 2400, 30);
assert.equal(digest(`${dir}/seed-a.jsonl`), digest(`${dir}/seed-b.jsonl`));
const tests = spawnSync(process.execPath, ['--test'], { encoding: 'utf8' }); writeFileSync(`${dir}/tests.txt`, tests.stdout + tests.stderr); assert.equal(tests.status, 0);
json(`${dir}/summary.json`, { generated_at: new Date().toISOString(), platform: `${os.platform()} ${os.release()} ${os.arch()}`, node: process.version, cpu: os.cpus()[0]?.model, contract_version: '1.1', source_sha256: Object.fromEntries(['src/core.js', 'src/simulation.js', 'src/rules.js', 'src/world.js', 'src/campaign.js', 'game.contract.json'].map(file => [file, digest(file)])), deterministic: true, test_exit_code: tests.status, checks });
console.log(`Phase 2 evidence saved: ${checks.length} real CLI runs, complete 5/6/7-lantern routes, 21600-tick benchmark, deterministic replay.`);

function makeRoute(night) {
  const w = worldFor(night), scenario = { ...quiet, motes: w.lanterns.flatMap(l => Array.from({ length: 10 }, () => [...l.pos])) };
  const lamp = id => ({ pos: w.lanterns.find(l => l.id === id).pos, lamp: id });
  const waypoint = (x, z) => ({ pos: [x, 0, z] });
  const route = night === 1 ? w.lanterns.map(l => lamp(l.id)) : night === 2 ? [lamp('L1'), lamp('L2'), lamp('L3'), { pos: [20, 0, 18], pad: true }, lamp('L4'), lamp('L5'), lamp('L6')] : [lamp('L4'), lamp('L6'), lamp('L7'), lamp('L5'), waypoint(-30 * Math.cos(Math.PI / 6), 15), waypoint(-24 * Math.cos(Math.PI / 6), 12), lamp('L3'), waypoint(-12.73, 12.73), waypoint(0, 18), waypoint(12.73, 12.73), lamp('L2'), waypoint(12.73, 12.73), waypoint(0, 18), { pos: [0, 3, 13], pad: true }, lamp('L1')];
  const g = new Game({ tuning, night, seed: 2026, scenario }); let index = 0, last = '', frames = [];
  while (!['won', 'lost'].includes(g.state) && g.tick < 16000 && index < route.length) {
    const goal = route[index], d = distance(g.player.pos, goal.pos), dx = goal.pos[0] - g.player.pos[0], dz = goal.pos[2] - g.player.pos[2];
    const move = d > .12 ? [dx / d, dz / d].map(n => Math.round(n * 1e6) / 1e6) : [0, 0];
    const action = { move, interact: !!goal.lamp && d <= .8 && g.player.grounded && g.player.carried === 10 && !g.input.interact };
    const encoded = JSON.stringify(action); if (encoded !== last) { frames.push({ tick: g.tick, ...action }); last = encoded; }
    g.step(action);
    if (goal.lamp ? g.lanterns.find(l => l.id === goal.lamp).lit : goal.pad ? !!g.launch : d < .25 && g.player.grounded) index++;
  }
  assert.equal(g.state, 'won', `N${night} route stuck at waypoint${index}, pos${g.player.pos}`);
  return { scenario, frames, ticks: g.tick };
}
