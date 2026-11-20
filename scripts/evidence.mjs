import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import os from 'node:os';
import { performance } from 'node:perf_hooks';
import { Game, distance } from '../src/core.js';
const dir = 'docs/proof/phase-1'; mkdirSync(dir, { recursive: true });
const { tuning } = JSON.parse(readFileSync('game.contract.json', 'utf8'));
const digest = file => createHash('sha256').update(readFileSync(file)).digest('hex');
const checks = [];
function run(name, extras, ticks = 120, every = 10) {
  const out = `${dir}/${name}.jsonl`;
  const args = ['src/headless.mjs', '--seed', '2026', '--night', '1', '--ticks', String(ticks), '--snapshot-every', String(every), '--out', out, ...extras];
  const start = performance.now(); const result = spawnSync(process.execPath, args, { encoding: 'utf8' });
  if (result.status !== 0) throw new Error(`${name}: ${result.stderr}`);
  const lines = readFileSync(out, 'utf8').trim().split('\n').map(JSON.parse);
  const end = lines.at(-1); if (end.type !== 'end') throw new Error('Missing end');
  const record = { name, command: `node ${args.join(' ')}`, sha256: digest(out), elapsed_ms: Math.round((performance.now() - start) * 100) / 100, end };
  checks.push(record); return lines;
}
run('win', ['--scenario', 'tests/fixtures/near-win.json', '--inputs', 'tests/fixtures/win-inputs.json']);
run('loss', ['--scenario', 'tests/fixtures/near-loss.json']);
run('pulse', ['--scenario', 'tests/fixtures/pulse.json', '--inputs', 'tests/fixtures/pulse-inputs.json'], 210);
run('seed-a', [], 900, 30); run('seed-b', [], 900, 30);
if (digest(`${dir}/seed-a.jsonl`) !== digest(`${dir}/seed-b.jsonl`)) throw new Error('Nondeterministic output');

// A complete five-lantern run, using ordinary legal move/interact input frames.
// Random enemies disabled by an explicit contract scenario, not by a code shortcut.
const scenario = { random_motes: false, random_shades: false, motes: [], shades: [] };
const frames = []; let tick = 0, x = 0, z = 0;
for (let i = 0; i < 5; i++) {
  const angle = i * Math.PI * 2 / 5;
  const target = [Math.sin(angle) * 25, 0, Math.cos(angle) * 25];
  // Ten motes per lamp, placed within pickup radius of its stopping point.
  for (let j = 0; j < tuning.lantern_cost; j++) scenario.motes.push([...target]);
  const dx = target[0] - x, dz = target[2] - z, d = Math.hypot(dx, dz);
  const steps = Math.round(d / (tuning.player_speed / 60));
  frames.push({ tick, move: [dx / d, dz / d], interact: false });
  x += dx / d * steps * tuning.player_speed / 60; z += dz / d * steps * tuning.player_speed / 60;
  tick += steps; frames.push({ tick, move: [0, 0], interact: true }); tick++;
}
writeFileSync(`${dir}/full-route.scenario.json`, JSON.stringify(scenario, null, 2) + '\n');
writeFileSync(`${dir}/full-route.inputs.json`, JSON.stringify({ frames }, null, 2) + '\n');
const route = run('full-route', ['--scenario', `${dir}/full-route.scenario.json`, '--inputs', `${dir}/full-route.inputs.json`], tick + 1, 60);
if (route.at(-1).state !== 'won' || route.filter(e => e.name === 'lantern_lit').length !== 5) throw new Error('Full route must light all five lanterns');
// Play the unchanged default world using legal inputs, including live enemies.
const auto = new Game({ tuning, seed: 2026 });
const autoFrames = [];
while (auto.state === 'playing' && auto.tick < 18000) {
  const p = auto.player;
  const targets = p.carried >= tuning.lantern_cost ? auto.lanterns.filter(l => !l.lit) : auto.motes;
  const target = [...targets].sort((a, b) => distance(a.pos, p.pos) - distance(b.pos, p.pos))[0];
  const dx = target ? target.pos[0] - p.pos[0] : 0, dz = target ? target.pos[2] - p.pos[2] : 0;
  const d = Math.hypot(dx, dz);
  const nearShade = auto.shades.some(s => s.state !== 'stunned' && distance(s.pos, p.pos) < 3);
  const frame = { tick: auto.tick, move: d > .1 ? [dx / Math.max(d, .1), dz / Math.max(d, .1)] : [0, 0], interact: !auto.input.interact, pulse: nearShade && p.carried >= tuning.pulse_cost && !auto.input.pulse };
  autoFrames.push(frame); auto.step(frame);
}
writeFileSync(`${dir}/default-world.inputs.json`, JSON.stringify({ frames: autoFrames }) + '\n');
const defaultRun = run('default-world', ['--inputs', `${dir}/default-world.inputs.json`], auto.tick + 1, 60);
if (defaultRun.at(-1).state !== 'won') throw new Error('Default-world autoplayer did not win: inspect balancing');
const test = spawnSync(process.execPath, ['--test'], { encoding: 'utf8' });
writeFileSync(`${dir}/tests.txt`, test.stdout + test.stderr); if (test.status !== 0) throw new Error('Tests failed');
writeFileSync(`${dir}/summary.json`, JSON.stringify({ generated_at: new Date().toISOString(), platform: `${os.platform()} ${os.release()} ${os.arch()}`, node: process.version, cpu: os.cpus()[0]?.model, source_sha256: digest('src/core.js'), contract_sha256: digest('game.contract.json'), deterministic: true, test_exit_code: test.status, checks }, null, 2) + '\n');
console.log(`Evidence saved in ${dir}: tests, win/loss/pulse, deterministic replay, complete five-lantern route.`);
