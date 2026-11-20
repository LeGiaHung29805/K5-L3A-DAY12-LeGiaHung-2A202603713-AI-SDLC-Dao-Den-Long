import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
const runner = resolve('src/headless.mjs');
const invoke = args => spawnSync(process.execPath, [runner, ...args], { encoding: 'utf8' });

test('CLI supports contract command, emits parseable JSONL, stops immediately on win', () => {
  const dir = mkdtempSync(join(tmpdir(), 'lantern-cli-'));
  try {
    const out = join(dir, 'win.jsonl');
    const scenario = join(dir, 'dawn.json');
    const data = JSON.parse(readFileSync(resolve('tests/fixtures/near-win.json'), 'utf8')); data.time_left_s = 1 / 60; writeFileSync(scenario, JSON.stringify(data));
    const result = invoke(['--seed', '-123', '--night', '1', '--ticks', '100', '--scenario', scenario, '--inputs', resolve('tests/fixtures/win-inputs.json'), '--out', out]);
    assert.equal(result.status, 0, result.stderr); assert.equal(result.stderr, '');
    const rows = readFileSync(out, 'utf8').trim().split('\n').map(JSON.parse);
    assert.equal(rows[0].type, 'snapshot'); assert.equal(rows[0].tick, 0); assert.equal(rows[0].score, 0);
    assert.deepEqual(rows.at(-1), { type: 'end', ticks: 1, state: 'won', score: 1046 });
    assert.equal(rows.find(r => r.name === 'game_over').tick, 1);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
test('CLI malformed JSON, duplicate ticks and bad scenario produce exit 2 on stderr', () => {
  const dir = mkdtempSync(join(tmpdir(), 'lantern-invalid-'));
  try {
    const file = join(dir, 'bad.json'), out = join(dir, 'out.jsonl');
    const base = ['--seed', '1', '--night', '1', '--ticks', '1', '--out', out];
    for (const [flag, body] of [['--inputs', '{'], ['--inputs', '{"frames":[{"tick":0},{"tick":0}]}'], ['--scenario', '{"motes":[[0]]}'], ['--scenario', 'null']]) {
      writeFileSync(file, body); const result = invoke([...base, flag, file]); assert.equal(result.status, 2); assert.match(result.stderr, /Input error/); assert.equal(result.stdout, '');
    }
    for (const extra of [['--snapshot-every', '0'], ['--ticks', '-1'], ['--night', '4'], ['--unknown', '1']]) assert.equal(invoke([...base, ...extra]).status, 2);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
test('CLI output is byte-identical on repeat; snapshots have sim_tick=tick', () => {
  const dir = mkdtempSync(join(tmpdir(), 'lantern-repeat-'));
  try {
    const outputs = [];
    for (let i = 0; i < 2; i++) {
      const out = join(dir, `${i}.jsonl`);
      const result = invoke(['--seed', '9', '--night', '1', '--ticks', '120', '--snapshot-every', '17', '--out', out]);
      assert.equal(result.status, 0, result.stderr); outputs.push(readFileSync(out, 'utf8'));
    }
    assert.equal(outputs[0], outputs[1]);
    for (const row of outputs[0].trim().split('\n').map(JSON.parse)) if (row.type === 'snapshot') assert.equal(row.sim_tick, row.tick);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
