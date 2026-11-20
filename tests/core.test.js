import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Game, simulate, validateInputs, validateScenario, InputError, distance, ISLAND_RADIUS } from '../src/core.js';
const { tuning: t } = JSON.parse(readFileSync(new URL('../game.contract.json', import.meta.url)));
const empty = { random_motes: false, random_shades: false, motes: [], shades: [] };
const game = scenario => new Game({ tuning: t, seed: 42, scenario: { ...empty, ...scenario } });
const run = (g, n, patch = {}) => { for (let i = 0; i < n && g.state === 'playing'; i++) g.step(i === 0 ? patch : {}); return g; };
const approx = (a, b, epsilon = 1e-8) => assert.ok(Math.abs(a - b) <= epsilon, `${a} != ${b}`);

test('scenario tick 0 is event-free, score-free, preserves omitted lanterns', () => {
  const g = game({ player: { pos: [1, 2, 3], carried: 4 }, lanterns: [{ id: 'L2', lit: true }] });
  const s = g.snapshot(); assert.equal(s.tick, 0); assert.equal(s.sim_tick, 0); assert.equal(s.score, 0);
  assert.equal(s.lanterns.length, 5); assert.equal(s.lanterns[1].deposited, t.lantern_cost); assert.deepEqual(s.player.pos, [1, 2, 3]); assert.deepEqual(g.events, []);
});
test('60 steps move exactly player_speed metres and consume one second', () => {
  const g = run(game(), 60, { move: [0, 1] }); approx(g.player.pos[2], t.player_speed); approx(g.timeLeft, t.night1_duration_s - 1);
});
test('time_left_s retains contract precision; only coordinates are rounded', () => {
  const g = game(); g.step(); assert.equal(g.snapshot().time_left_s, t.night1_duration_s - 1 / 60);
});
test('yaw follows contract formula and diagonals normalize', () => {
  const g = run(game(), 60, { move: [1, 1], cam_yaw_deg: 90 });
  approx(g.player.pos[0], t.player_speed / Math.sqrt(2)); approx(g.player.pos[2], -t.player_speed / Math.sqrt(2));
});
test('partial frames preserve movement and camera', () => {
  const g = game(); g.step({ move: [0, 1], cam_yaw_deg: 90 }); g.step({ jump: true });
  approx(g.player.pos[0], 2 * t.player_speed / 60); approx(g.player.pos[2], 0); assert.ok(g.player.pos[1] > 0);
});
test('held jump triggers once, a new edge jumps again', () => {
  const g = run(game(), 100, { jump: true }); assert.equal(g.player.pos[1], 0);
  g.step({ jump: false }); g.step({ jump: true }); assert.ok(g.player.pos[1] > 0);
});
test('island edge is a non-damaging boundary', () => {
  const g = run(game(), 600, { move: [1, 0] }); approx(g.player.pos[0], ISLAND_RADIUS); assert.equal(g.player.flames, t.flames);
});
test('pickup includes boundary, ignores height, honors capacity and scores per mote', () => {
  const g = game({ player: { pos: [0, 2, 0], carried: t.carry_capacity - 1 }, motes: [[t.pickup_radius, 0, 0], [0, 0, 0], [t.pickup_radius + .001, 0, 0]] });
  const events = g.step(); assert.equal(g.player.carried, t.carry_capacity); assert.equal(g.motes.length, 2);
  assert.equal(g.score, t.score.per_mote); assert.equal(events[0].tick, 1); assert.equal(events[0].name, 'mote_picked');
});
test('empty inputs keep player still and collect nothing out of reach', () => {
  const g = run(game({ motes: [[0, 0, 5]] }), 60); assert.deepEqual(g.player.pos, [0, 0, 0]); assert.equal(g.player.carried, 0);
});
test('partial deposit consumes all carried and needs a fresh interact edge', () => {
  const g = game({ player: { carried: 4 }, lanterns: [{ id: 'L1', pos: [0, 0, t.interact_radius] }] });
  let events = g.step({ interact: true }); assert.equal(g.lanterns[0].deposited, 4); assert.equal(g.player.carried, 0);
  assert.deepEqual(events[0].data, { lantern_id: 'L1', amount: 4, deposited: 4 });
  g.addMote([0, 0, 0]); events = g.step(); assert.equal(g.lanterns[0].deposited, 4); assert.equal(g.player.carried, 1); assert.equal(events.filter(e => e.name === 'deposit').length, 0);
  g.step({ interact: false }); g.step({ interact: true }); assert.equal(g.lanterns[0].deposited, 5);
});
test('full deposit lights exactly once, preserves excess, and adds declared points', () => {
  const g = game({ player: { carried: 12 }, lanterns: [{ id: 'L1', pos: [0, 0, 0], deposited: 3 }] });
  const events = g.step({ interact: true }); assert.equal(g.player.carried, 5); assert.equal(g.lanterns[0].lit, true); assert.equal(g.score, t.score.per_lantern);
  assert.deepEqual(events.map(e => e.name), ['deposit', 'lantern_lit']);
  g.step({ interact: false }); assert.deepEqual(g.step({ interact: true }), []); assert.equal(g.score, t.score.per_lantern);
});
test('interact selects nearest unlit lantern, fails outside inclusive radius', () => {
  const g = game({ player: { carried: 12 }, lanterns: [{ id: 'L1', pos: [t.interact_radius + .001, 0, 0] }] });
  assert.deepEqual(g.step({ interact: true }), []); assert.equal(g.player.carried, 12);
  const h = game({ player: { carried: 12 }, lanterns: [{ id: 'L1', pos: [2, 0, 0] }, { id: 'L2', pos: [1, 0, 0] }] });
  assert.equal(h.step({ interact: true })[0].data.lantern_id, 'L2');
});
test('pulse pays exact cost, includes radius boundary, pushes and stuns only nearby shades', () => {
  const g = game({ player: { carried: 12 }, shades: [{ id: 'near', pos: [t.pulse_radius, 0, 0] }, { id: 'far', pos: [t.pulse_radius + .01, 0, 0] }] });
  const events = g.step({ pulse: true }); assert.deepEqual(events[0].data.stunned_ids, ['near']);
  assert.equal(g.player.carried, 12 - t.pulse_cost); assert.equal(g.shades[0].state, 'stunned');
  approx(g.shades[0].pos[0], t.pulse_radius + t.pulse_push_m); assert.equal(g.score, t.score.per_stun);
});
test('pulse with insufficient energy has no event and no effect', () => {
  const g = game({ player: { carried: t.pulse_cost - 1 }, shades: [{ pos: [3, 0, 0] }] });
  assert.equal(g.step({ pulse: true }).filter(e => e.name === 'pulse').length, 0); assert.equal(g.player.carried, t.pulse_cost - 1);
});
test('held pulse never repeats; cooldown rejects fresh edges until ready', () => {
  const g = game({ player: { carried: 12 } }); g.step({ pulse: true }); run(g, 90);
  assert.equal(g.player.carried, 9); g.step({ pulse: false }); g.step({ pulse: true }); assert.equal(g.player.carried, 6);
  g.step({ pulse: false }); g.step({ pulse: true }); assert.equal(g.player.carried, 6);
  run(g, 60); assert.equal(g.player.carried, 6); g.step({ pulse: false }); g.step({ pulse: true }); assert.equal(g.player.carried, 3);
});
test('stunned shade stays still for declared duration then chases again', () => {
  const g = game({ player: { carried: 12 }, shades: [{ pos: [5, 0, 0] }] }); g.step({ pulse: true });
  const x = g.shades[0].pos[0]; run(g, t.pulse_stun_s * 60 - 1); assert.equal(g.shades[0].state, 'stunned'); approx(g.shades[0].pos[0], x);
  g.step(); assert.equal(g.shades[0].state, 'chase'); assert.ok(g.shades[0].pos[0] < x);
});
test('shade speed approaches player without overshooting', () => {
  const g = run(game({ shades: [{ pos: [20, 0, 0] }] }), 60); approx(g.shades[0].pos[0], 20 - t.shade_speed);
});
test('damage uses global invulnerability, rounds dropped count down, and has exact event ticks', () => {
  const g = game({ player: { carried: 11 }, shades: [{ pos: [0, 0, 0] }, { pos: [0, 0, 0] }] });
  const hit = g.step(); assert.equal(hit.length, 1); assert.deepEqual(hit[0].data, { by: 'shade', flames: 2, dropped: 2 });
  assert.equal(g.player.carried, 9); run(g, t.invuln_s * 60 - 1); assert.equal(g.player.flames, 2);
  assert.equal(g.step()[0].tick, 1 + t.invuln_s * 60); assert.equal(g.player.flames, 1);
});
test('lit lanterns exclude shades and protect player; unlit lanterns do not', () => {
  const g = game({ lanterns: [{ id: 'L1', pos: [0, 0, 0], lit: true }], shades: [{ pos: [0, 0, 0] }] });
  run(g, 180); assert.equal(g.player.flames, 3); assert.ok(distance(g.shades[0].pos, [0, 0, 0]) >= t.safe_radius);
  const h = game({ lanterns: [{ id: 'L1', pos: [0, 0, 0] }], shades: [{ pos: [0, 0, 0] }] }); h.step(); assert.equal(h.player.flames, 2);
});
test('no flames loses once and stops further simulation', () => {
  const g = game({ player: { flames: 1 }, shades: [{ pos: [0, 0, 0] }] });
  assert.deepEqual(g.step().map(e => e.name), ['player_hit', 'game_over']); assert.equal(g.state, 'lost');
  assert.deepEqual(g.events.at(-1).data, { result: 'lost', reason: 'no_flames' }); g.step(); assert.equal(g.tick, 1);
});
test('dawn occurs on exact final step', () => {
  const g = run(game({ time_left_s: 1 }), 59); assert.equal(g.state, 'playing');
  assert.deepEqual(g.step().at(-1).data, { result: 'lost', reason: 'dawn' }); assert.equal(g.tick, 60); assert.equal(g.timeLeft, 0);
});
test('all five lanterns win with declared floor time and flame bonuses', () => {
  const scenario = JSON.parse(readFileSync(new URL('./fixtures/near-win.json', import.meta.url)));
  const g = game(scenario); const events = g.step({ interact: true });
  assert.equal(g.state, 'won'); assert.deepEqual(events.at(-1).data, { result: 'won', reason: 'all_lit' });
  assert.equal(g.score, t.score.per_lantern + 119 * t.score.per_second_left + 3 * t.score.per_flame_left);
});
test('same seed + scenario + inputs produces byte-identical output and stable IDs', () => {
  const output = seed => { const lines = []; simulate({ tuning: t, seed, ticks: 800, write: row => lines.push(JSON.stringify(row)) }); return lines.join('\n'); };
  assert.equal(output(77), output(77)); assert.notEqual(output(77), output(78));
});
test('explicit empty lists and random false disable initial and periodic generation', () => {
  const g = run(game({ player: { flames: 3 } }), 1201); assert.equal(g.motes.length, 0); assert.equal(g.shades.length, 0);
});
test('random shades spawn at tick 600 and preserve unique scenario/generated IDs', () => {
  const g = game({ random_shades: true, shades: [{ id: 'S1', pos: [40, 0, 0] }, { pos: [-40, 0, 0] }] });
  assert.equal(g.shades[1].id, 'S2'); run(g, 599); const event = g.step().find(e => e.name === 'shade_spawned');
  assert.equal(event.tick, 600); assert.equal(event.data.id, 'S3');
});
test('snapshot schedule includes zero, end is mandatory, ticks N executes N steps', () => {
  const rows = []; simulate({ tuning: t, scenario: empty, ticks: 25, snapshotEvery: 10, write: r => rows.push(r) });
  assert.deepEqual(rows.filter(r => r.type === 'snapshot').map(r => r.tick), [0, 10, 20]);
  assert.deepEqual(rows.at(-1), { type: 'end', ticks: 25, state: 'playing', score: 0 });
});
test('zero ticks outputs initial snapshot and end only; positions round to 3 decimals', () => {
  const rows = []; simulate({ tuning: t, scenario: { ...empty, player: { pos: [1.23456, 0, -.00001] } }, ticks: 0, write: r => rows.push(r) });
  assert.equal(rows.length, 2); assert.deepEqual(rows[0].player.pos, [1.235, 0, 0]); assert.equal(rows[1].ticks, 0);
});
test('invalid input and scenario formats fail validation', () => {
  for (const bad of [null, {}, { frames: null }, { frames: [{ tick: 1 }, { tick: 1 }] }, { frames: [{ tick: 2 }, { tick: 1 }] }, { frames: [{ tick: -1 }] }, { frames: [{ tick: .5 }] }, { frames: [{ tick: 0, move: [2, 0] }] }, { frames: [{ tick: 0, pulse: 1 }] }, { frames: [{ tick: 0, cam_yaw_deg: Infinity }] }]) assert.throws(() => validateInputs(bad), InputError);
  for (const bad of [null, [], { player: null }, { player: { carried: 13 } }, { random_motes: 0 }, { motes: [[1, 2]] }, { shades: [{ pos: [0, 0, 0], id: 'A' }, { pos: [0, 0, 0], id: 'A' }] }, { lanterns: [{ id: 'L6' }] }, { time_left_s: -1 }]) assert.throws(() => validateScenario(bad, t), InputError);
});
