import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Game, validateScenario, InputError } from '../src/core.js';
import { worldFor } from '../src/world.js';
const { tuning } = JSON.parse(readFileSync(new URL('../game.contract.json', import.meta.url)));
const quiet = { random_motes: false, random_shades: false, random_drifters: false, wind_enabled: false, motes: [], shades: [], drifters: [], charms: [] };
const game = (s = {}, night = 1) => new Game({ tuning, night, seed: 7, scenario: { ...quiet, ...s } });
const run = (g, n) => { for (let i = 0; i < n && !['won', 'lost'].includes(g.state); i++) g.step(); return g; };
const lamp = (fuel, extra = {}) => ({ id: 'L1', pos: [0, 0, 0], lit: true, fuel, ...extra });
test('v1.2 setup fuel defaults/history/capacity; scenario lights do not count successes', () => {
  const g = game({ lanterns: [{ id: 'L1', lit: true }] }); const s = g.snapshot();
  assert.equal(s.lanterns[0].fuel, 100); assert.equal(s.lanterns[0].ever_lit, true); assert.equal(s.lanterns[0].relit_count, 0); assert.equal(s.player.capacity, 10); assert.equal(g.score, 0);
  assert.equal(game({ player: { successful_lights: 3, carried: 16 } }).capacity, 16);
  assert.equal(game({ player: { successful_lights: 100 } }).capacity, 20);
});
test('fuel burns exactly6000 integer units and turns off once at tick6000', () => {
  const g = game({ lanterns: [lamp(100)] }); run(g, 5999); assert.equal(g.lanterns[0].fuelUnits, 1); assert.equal(g.lanterns[0].lit, true);
  const e = g.step(); assert.equal(g.lanterns[0].lit, false); assert.equal(g.lanterns[0].deposited, 0); assert.equal(g.lanterns[0].ever_lit, true); assert.equal(e.filter(e => e.name === 'lantern_out').length, 1); assert.equal(g.snapshot().lanterns[0].fuel, 0); assert.equal(g.step().some(e => e.name === 'lantern_out'), false);
});
test('pause freezes fuel and drain counters, as well as gameplaytime', () => {
  const g = game({ player: { pos: [20, 0, 0] }, lanterns: [lamp(20)], shades: [{ pos: [1, .8, 0], state: 'drain', target_lantern_id: 'L1' }] });
  g.step({ pause: true }); run(g, 1000); assert.equal(g.lanterns[0].fuelUnits, 1200); assert.equal(g.shades[0].drainTicks, 0); assert.equal(g.simTick, 0);
});
test('refuel rounds usage up, caps fuel100, scores only5 per mote', () => {
  const g = game({ player: { carried: 10 }, lanterns: [lamp(85)] }); const e = g.step({ interact: true }).find(e => e.name === 'refuel');
  assert.deepEqual(e.data, { lantern_id: 'L1', amount: 2, fuel: 100 }); assert.equal(g.player.carried, 8); assert.equal(g.score, 10); assert.equal(g.player.successful_lights, 0);
});
test('full lamp cannot be selected and produces noevent/score beforedecay', () => {
  const g = game({ player: { carried: 10 }, lanterns: [lamp(100), { id: 'L2', pos: [1, 0, 0] }] });
  g.deposit(() => true); assert.equal(g.events[0].data.lantern_id, 'L2'); assert.equal(g.lanterns[0].fuelUnits, 6000);
  const h = game({ player: { carried: 3 }, lanterns: [lamp(100)] }); h.deposit(() => true); assert.deepEqual(h.events, []); assert.equal(h.player.carried, 3);
});
test('partial new light preserved; relightcost5 and capacity increase per success', () => {
  const g = game({ player: { carried: 5 }, lanterns: [{ id: 'L1', pos: [0, 0, 0], ever_lit: true }] });
  const e = g.step({ interact: true }).find(e => e.name === 'lantern_lit'); assert.deepEqual(e.data, { lantern_id: 'L1', relight: true }); assert.equal(g.score, 65); assert.equal(g.capacity, 12); assert.equal(g.lanterns[0].relit_count, 1); assert.equal(g.lanterns[0].fuelUnits, 6000);
  const h = game({ player: { carried: 10 }, lanterns: [{ id: 'L1', pos: [0, 0, 0], deposited: 4 }] }); h.step({ interact: true }); assert.equal(h.player.carried, 4); assert.equal(h.score, 130); assert.equal(h.lanterns[0].ever_lit, true);
});
test('relight again counts again and never grows capacity above20', () => {
  const g = game({ time_left_s: 10000, player: { carried: 10, successful_lights: 4 }, lanterns: [lamp(1 / 60)] , motes: Array.from({ length: 10 }, () => [0, 0, 0]) });
  g.step({ interact: true }); assert.equal(g.capacity, 20); assert.equal(g.player.successful_lights, 5); assert.equal(g.lanterns[0].relit_count, 1);
  g.step({ interact: false }); run(g, 5999); g.step({ interact: true }); assert.equal(g.player.successful_lights, 6); assert.equal(g.capacity, 20); assert.equal(g.lanterns[0].relit_count, 2);
});
test('safe boundary uses raw fuel30, not rounded snapshotfuel', () => {
  const g = game({ lanterns: [lamp(30)] }); assert.equal(g.isSafe([0, 0, 0]), true); g.step(); assert.equal(g.snapshot().lanterns[0].fuel, 30); assert.equal(g.isSafe([0, 0, 0]), false);
});
test('refueling restores safezone beforecontacts and ejects drainers without damage', () => {
  const g = game({ player: { carried: 3 }, lanterns: [lamp(20)], shades: [{ pos: [1, .8, 0], state: 'drain', target_lantern_id: 'L1' }] });
  const e = g.step({ interact: true }); assert.ok(e.some(e => e.name === 'refuel')); assert.equal(g.hasSafeZone(g.lanterns[0]), true); assert.equal(g.player.flames, 3); assert.ok(Math.hypot(g.shades[0].pos[0], g.shades[0].pos[2]) >= 6 - 1e-9);
});
test('two drainers add5/s each plus passive1/s; fuel_drain every60 active ticks', () => {
  const g = game({ player: { pos: [20, 0, 0] }, lanterns: [lamp(20)], shades: ['S1', 'S2'].map((id, i) => ({ id, pos: [i ? -1 : 1, .8, 0], state: 'drain', target_lantern_id: 'L1' })) });
  run(g, 59); const e = g.step(); assert.equal(g.lanterns[0].fuelUnits, 9 * 60); assert.equal(e.filter(e => e.name === 'fuel_drain').length, 2); assert.ok(e.filter(e => e.name === 'fuel_drain').every(e => e.tick === 60 && e.data.fuel === 9));
});
test('wander picks nearest weak lamp, tieid; chase doesnot retarget to fuel', () => {
  const g = game({ player: { pos: [35, 0, 0] }, lanterns: [lamp(20), lamp(20, { id: 'L2', pos: [10, 0, 0] })], shades: [{ pos: [5, .8, 0], state: 'wander' }] });
  g.step(); assert.equal(g.shades[0].target_lantern_id, 'L1'); assert.ok(g.shades[0].pos[0] < 5);
  const h = game({ player: { pos: [20, 0, 0] }, lanterns: [lamp(20)], shades: [{ pos: [18, .8, 0], state: 'chase' }] }); h.step(); assert.equal(h.shades[0].state, 'chase'); assert.ok(h.shades[0].pos[0] > 18);
});
test('drain enters atXZ2; stops onoff/range/refuel; player6 causeschase', () => {
  const g = game({ player: { pos: [20, 0, 0] }, lanterns: [lamp(20)], shades: [{ pos: [2, .8, 0], state: 'wander' }] }); g.step(); assert.equal(g.shades[0].state, 'drain');
  const h = game({ player: { pos: [7, 0, 0] }, lanterns: [lamp(20)], shades: [{ pos: [1, .8, 0], state: 'drain', target_lantern_id: 'L1' }] }); h.step(); assert.equal(h.shades[0].state, 'chase');
  const out = game({ player: { pos: [20, 0, 0] }, lanterns: [lamp(.1)], shades: [{ pos: [1, .8, 0], state: 'drain', target_lantern_id: 'L1' }] }); out.step(); assert.equal(out.lanterns[0].lit, false); assert.equal(out.shades[0].state, 'wander');
});
test('pulse awards total15 for drain,5 ordinary, resets stun and returns towander', () => {
  const g = game({ player: { carried: 10 }, lanterns: [lamp(20)], shades: [{ id: 'S1', pos: [1, .8, 0], state: 'drain', target_lantern_id: 'L1' }, { id: 'S2', pos: [2, .8, 0], state: 'stunned', state_ticks_left: 500 }] });
  g.step({ pulse: true }); assert.equal(g.score, 20); assert.equal(g.shades[0].state, 'stunned'); run(g, 120); assert.equal(g.shades[0].state, 'wander');
});
test('all lights never win early; dawn thresholds3/5,4/6,5/7', () => {
  const early = game({ lanterns: worldFor(1).lanterns.map(l => ({ id: l.id, lit: true })) }); early.step(); assert.equal(early.state, 'playing');
  for (const night of [1, 2, 3]) for (const offset of [-1, 0]) {
    const count = Math.ceil(.6 * worldFor(night).lanterns.length) + offset;
    const g = game({ time_left_s: 1 / 60, lanterns: worldFor(night).lanterns.slice(0, count).map(l => ({ id: l.id, lit: true })) }, night);
    g.step(); assert.equal(g.state, offset === 0 ? 'won' : 'lost'); assert.equal(g.events.at(-1).data.reason, offset === 0 ? 'dawn_survived' : 'dawn');
  }
});
test('stun expiry stays wander that tick even besideweaklamp; drains next tick', () => {
  const g = game({ player: { pos: [20, 0, 0] }, lanterns: [lamp(20)], shades: [{ pos: [1, .8, 0], state: 'stunned', state_ticks_left: 1 }] });
  g.step(); assert.equal(g.shades[0].state, 'wander'); g.step(); assert.equal(g.shades[0].state, 'drain');
});
test('dawn counts afterdecay/refuel; lastflame always loses', () => {
  const g = game({ time_left_s: 1 / 60, lanterns: [lamp(1 / 60), lamp(50, { id: 'L2' }), lamp(50, { id: 'L3' })] }); g.step(); assert.equal(g.state, 'lost');
  const h = game({ time_left_s: 1 / 60, player: { carried: 1 }, lanterns: [lamp(2 / 60), lamp(50, { id: 'L2' }), lamp(50, { id: 'L3' })] }); h.step({ interact: true }); assert.equal(h.state, 'won');
  const dead = game({ time_left_s: 1 / 60, player: { flames: 1 }, lanterns: [lamp(20, { pos: [10, 0, 10] }), lamp(20, { id: 'L2', pos: [12, 0, 12] }), lamp(20, { id: 'L3', pos: [14, 0, 14] })], shades: [{ pos: [0, .8, 0] }] }); dead.step(); assert.equal(dead.events.at(-1).data.reason, 'no_flames');
});
test('dawn score floors exact raw fuel, no time bonus, only litlamps', () => {
  const g = game({ time_left_s: 1 / 60, lanterns: [lamp(40.5), lamp(30, { id: 'L2' }), lamp(20, { id: 'L3' })] }); g.step(); assert.equal(g.score, 150 + (50 + 40) + (50 + 29) + (50 + 19));
});
test('rejectinvalid fuel/history/successcount/target; permit scenario capacity20', () => {
  for (const s of [{ lanterns: [lamp(101)] }, { lanterns: [lamp(-1)] }, { lanterns: [lamp(1, { ever_lit: 1 })] }, { player: { successful_lights: -1 } }, { shades: [{ pos: [0, 0, 0], target_lantern_id: 'L9' }] }]) assert.throws(() => validateScenario(s, tuning), InputError);
  assert.doesNotThrow(() => validateScenario({ player: { successful_lights: 5, carried: 20 } }, tuning));
});
