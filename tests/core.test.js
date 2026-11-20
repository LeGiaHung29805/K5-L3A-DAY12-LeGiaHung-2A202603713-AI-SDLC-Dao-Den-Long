import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Game, simulate, validateInputs, validateScenario, InputError, distance, distance3 } from '../src/core.js';
import { worldFor, terrainHeight, onLand } from '../src/world.js';
const { tuning: t } = JSON.parse(readFileSync(new URL('../game.contract.json', import.meta.url)));
const empty = { random_motes: false, random_shades: false, random_drifters: false, wind_enabled: false, motes: [], shades: [], drifters: [], charms: [] };
const game = (scenario = {}, night = 1) => new Game({ tuning: t, seed: 42, night, scenario: { ...empty, ...scenario } });
const run = (g, n, patch = {}) => { for (let i = 0; i < n && !['won', 'lost'].includes(g.state); i++) g.step(i === 0 ? patch : {}); return g; };
const events = (g, patch = {}) => g.step(patch).filter(e => e.name !== 'night_start');
const approx = (a, b, epsilon = 1e-8) => assert.ok(Math.abs(a - b) <= epsilon, `${a} != ${b}`);

test('standard tuning overrides Phase 1; canonical map counts and lamp coordinates', () => {
  assert.equal(t.player_speed, 6); assert.equal(t.carry_capacity, 10); assert.equal(t.pulse_radius, 5); assert.equal(t.pulse_cooldown_s, 3);
  assert.deepEqual([1, 2, 3].map(n => worldFor(n).lanterns.length), [5, 6, 7]);
  assert.deepEqual([1, 2, 3].map(n => worldFor(n).moteSpawns.length), [24, 24, 30]);
  assert.deepEqual(worldFor(1).lanterns[1].pos, [23.8, 0, 7.7]); assert.deepEqual(worldFor(2).lanterns[5].pos, [53, 0, -10]);
  assert.deepEqual(worldFor(3).lanterns[0].pos, [0, 6, 6]);
});
test('scenario tick0 has no score/events, override by lamp id keeps all other lamps', () => {
  const g = game({ player: { pos: [1, 2, 3], carried: 4 }, lanterns: [{ id: 'L2', lit: true }] });
  assert.deepEqual(g.snapshot().player.pos, [1, 2, 3]); assert.equal(g.score, 0); assert.equal(g.tick, 0); assert.deepEqual(g.events, []);
  assert.equal(g.lanterns.length, 5); assert.equal(g.lanterns[1].deposited, 10);
});
test('movement 60Hz speed, exact time precision, yaw rotation, diagonal normalization', () => {
  const a = run(game(), 60, { move: [0, 1] }); approx(a.player.pos[2], 6); assert.equal(a.timeLeft, 239);
  const b = run(game(), 60, { move: [1, 1], cam_yaw_deg: 90 }); approx(b.player.pos[0], 6 / Math.sqrt(2)); approx(b.player.pos[2], -6 / Math.sqrt(2));
  const c = game(); c.step(); assert.equal(c.snapshot().time_left_s, 240 - 1 / 60);
});
test('partial input retains movement/camera; jump launches only on ground and fresh edge', () => {
  const g = game(); g.step({ move: [0, 1], cam_yaw_deg: 90 }); g.step({ jump: true }); approx(g.player.pos[0], .2); assert.ok(g.player.pos[1] > 0);
  run(g, 100, { move: [0, 0] }); assert.equal(g.player.pos[1], 0); assert.equal(g.player.grounded, true);
  g.step({ jump: false }); g.step({ jump: true }); assert.ok(g.player.pos[1] > 0);
});
test('pickup is inclusive XZ1m, <=1.5m height, capacity10; no pickup points', () => {
  const g = game({ player: { pos: [0, 1.5, 0], carried: 9 }, motes: [[1, 0, 0], [0, 0, 0], [1.001, 0, 0]] });
  const e = events(g); assert.equal(g.player.carried, 10); assert.equal(g.motes.length, 2); assert.equal(g.score, 0); assert.equal(e[0].tick, 1);
  const high = game({ player: { pos: [0, 1.6, 0] }, motes: [[0, 0, 0]] }); high.step(); assert.equal(high.player.carried, 0);
});
test('empty inputs stay still and preserve out-of-range motes', () => {
  const g = run(game({ motes: [[0, 0, 5]] }), 60); assert.deepEqual(g.player.pos, [0, 0, 0]); assert.equal(g.player.carried, 0);
});
test('partial deposit remembers progress, scores deposit amount, held interact does not repeat', () => {
  const g = game({ player: { carried: 4 }, lanterns: [{ id: 'L1', pos: [0, 0, 2] }] });
  assert.deepEqual(events(g, { interact: true })[0].data, { lantern_id: 'L1', amount: 4, deposited: 4 }); assert.equal(g.score, 20);
  g.addMote([0, 0, 0]); g.step(); assert.equal(g.lanterns[0].deposited, 4); assert.equal(g.player.carried, 1);
  g.step({ interact: false }); g.step({ interact: true }); assert.equal(g.lanterns[0].deposited, 5); assert.equal(g.score, 25);
});
test('full deposit preserves excess; light scores once; exact ties use id', () => {
  const g = game({ player: { carried: 10 }, lanterns: [{ id: 'L1', pos: [0, 0, 0], deposited: 3 }, { id: 'L2', pos: [0, 0, 0] }] });
  const e = events(g, { interact: true }); assert.equal(e[0].data.lantern_id, 'L1'); assert.equal(g.player.carried, 3); assert.equal(g.score, 135);
  assert.deepEqual(e.map(e => e.name), ['deposit', 'lantern_lit']); g.step(); assert.equal(g.score, 135);
});
test('deposit selects nearest accepting lamp, refuses outside range and accepts lit lamps', () => {
  const g = game({ player: { carried: 10 }, lanterns: [{ id: 'L1', pos: [2.001, 0, 0] }] }); assert.deepEqual(events(g, { interact: true }), []);
  const h = game({ player: { carried: 10 }, lanterns: [{ id: 'L1', pos: [0, 0, 0], lit: true }, { id: 'L2', pos: [1, 0, 0] }] }); assert.equal(events(h, { interact: true })[0].data.lantern_id, 'L1');
});
test('pulse measures 3D from foot+.8; inclusive radius and no phantom XZ-only hit', () => {
  const g = game({ player: { carried: 10 }, shades: [{ id: 'near', pos: [5, .8, 0] }, { id: 'outside', pos: [5.001, .8, 0] }, { id: 'high', pos: [0, 6, 0] }] });
  const e = events(g, { pulse: true }); assert.deepEqual(e.at(-1).data.stunned_ids, ['near']); assert.equal(g.player.carried, 7); assert.equal(g.score, 5);
  approx(g.shades[0].pos[0], 5 + 4 / 15); run(g, 14); approx(g.shades[0].pos[0], 9); assert.equal(g.shades[0].state, 'stunned');
});
test('pulse cost/cooldown/edge; hitting an already stunned shade scores again', () => {
  const insufficient = game({ player: { carried: 2 } }); assert.deepEqual(events(insufficient, { pulse: true }), []);
  const g = game({ player: { carried: 10 }, shades: [{ pos: [2, .8, 0], state: 'stunned', state_ticks_left: 300 }] });
  g.step({ pulse: true }); assert.equal(g.score, 5); assert.equal(g.player.pulse_cd_ticks, 180); run(g, 180); assert.equal(g.player.carried, 7);
  // Reposition is not used: pulse again at the valid original target's new position.
  g.step({ pulse: false }); g.step({ pulse: true }); assert.equal(g.player.carried, 4);
});
test('stun expires at120 ticks and changes to allowed wander/chase state', () => {
  const g = game({ player: { carried: 10 }, shades: [{ pos: [2, .8, 0] }] }); g.step({ pulse: true }); run(g, 119);
  assert.equal(g.shades[0].state, 'stunned'); g.step(); assert.equal(g.shades[0].state, 'wander');
});
test('shade normal and N3 chase speeds and detect/lose hysteresis', () => {
  const g = run(game({ shades: [{ pos: [10, .8, 0] }] }), 60); approx(g.shades[0].pos[0], 6);
  const h = game({ player: { pos: [30, 0, 0] }, shades: [{ pos: [40, .8, 0] }] }, 3); run(h, 60); approx(h.shades[0].pos[0], 35.5);
  const far = game({ shades: [{ pos: [20, .8, 0], state: 'chase' }] }); far.step(); assert.equal(far.shades[0].state, 'wander');
});
test('damage drops floor half on seeded ring, gives90 invulnerability, max1 hit/tick sorted id', () => {
  const g = game({ player: { carried: 9 }, shades: [{ id: 'S2', pos: [0, .8, 0] }, { id: 'S1', pos: [0, .8, 0] }] });
  const e = events(g); assert.deepEqual(e[0].data, { by: 'shade', flames: 2, dropped: 4 }); assert.equal(g.player.carried, 5); assert.equal(g.player.invuln_ticks, 90);
  assert.equal(g.shades.find(s => s.id === 'S1').state, 'recoil'); assert.equal(g.shades.find(s => s.id === 'S2').state, 'chase');
  for (const m of g.motes) { assert.equal(m.kind, 'dropped'); assert.equal(m.ttlTicks, 480); assert.ok(distance(m.pos, g.player.pos) >= 1.5 && distance(m.pos, g.player.pos) <= 2.5); }
  run(g, 89); assert.equal(g.player.flames, 2); g.step(); assert.equal(g.player.flames, 1);
});
test('shade contact requires height<=1.5 and dash gives no invulnerability', () => {
  const high = game({ shades: [{ pos: [0, 2, 0] }] }); high.step(); assert.equal(high.player.flames, 3);
  const g = game({ shades: [{ pos: [0, .8, .5] }] }); g.step({ dash: true }); assert.equal(g.player.flames, 2);
});
test('numeric shade IDs order S2 beforeS10 when both canhit', () => {
  const g = game({ shades: [{ id: 'S10', pos: [0, .8, 0] }, { id: 'S2', pos: [0, .8, 0] }] }); g.step();
  assert.equal(g.shades.find(s => s.id === 'S2').state, 'recoil'); assert.equal(g.shades.find(s => s.id === 'S10').state, 'chase');
});
test('dropped mote waits next tick, expires at480 ticks and is pickable like normal', () => {
  const g = game({ motes: [{ pos: [0, 0, 0], kind: 'dropped', ttl_s: 8 }] }); g.step(); assert.equal(g.player.carried, 1); assert.equal(g.score, 0);
  const h = game({ motes: [{ pos: [10, 0, 0], kind: 'dropped', ttl_s: 8 }] }); run(h, 479); assert.equal(h.motes.length, 1); h.step(); assert.equal(h.motes.length, 0);
});
test('lit safety excludes shades at6m and protects; unlit lamp does not', () => {
  const g = game({ lanterns: [{ id: 'L1', pos: [0, 0, 0], lit: true }], shades: [{ pos: [0, .8, 0] }] }); run(g, 180);
  assert.equal(g.player.flames, 3); assert.ok(distance(g.shades[0].pos, [0, 0, 0]) >= 6 - 1e-8);
  const h = game({ lanterns: [{ id: 'L1', pos: [0, 0, 0] }], shades: [{ pos: [0, .8, 0] }] }); h.step(); assert.equal(h.player.flames, 2);
});
test('lighting resolves safety before pulse and contacts in the same tick', () => {
  const g = game({ player: { carried: 10 }, lanterns: [{ id: 'L1', pos: [0, 0, 0] }], shades: [{ pos: [0, .8, 0] }] });
  g.step({ interact: true, pulse: true }); assert.equal(g.player.flames, 3); assert.equal(g.lanterns[0].lit, true); assert.equal(g.player.carried, 0);
});
test('dash travels2.8m over12 ticks, cooldown begins at start, held/active presses ignored', () => {
  const g = game(); assert.equal(events(g, { dash: true })[0].name, 'dash'); assert.equal(g.player.dash_cd_ticks, 90);
  run(g, 11); approx(g.player.pos[2], 2.8); g.step(); approx(g.player.pos[2], 2.8); assert.equal(g.dashTicks, 0);
  run(g, 80); approx(g.player.pos[2], 2.8); g.step({ dash: false }); g.step({ dash: true }); assert.ok(g.player.pos[2] > 2.8);
});
test('air dash preserves altitude, direction from facing when idle', () => {
  const g = game({ player: { pos: [0, 4, 0] } }); g.step({ dash: true }); run(g, 11); approx(g.player.pos[1], 4); approx(g.player.pos[2], 2.8);
  const h = game(); h.step({ move: [1, 0] }); h.step({ move: [0, 0], dash: true }); assert.ok(h.player.pos[0] > .3); approx(h.player.pos[2], 0);
});
test('fall waits untilY<-10, ignores invulnerability, only once, losesall then respawns after60', () => {
  const g = game({ player: { pos: [41, -9.999, 0], carried: 9, invuln_ticks: 1000 } });
  assert.equal(events(g)[0].data.by, 'fall'); assert.equal(g.player.flames, 2); assert.equal(g.player.carried, 0); assert.equal(g.respawnTicks, 60);
  run(g, 59, { move: [0, 0] }); assert.equal(g.player.flames, 2); assert.ok(g.player.pos[1] < -10); g.step({ move: [1, 0] }); assert.deepEqual(g.player.pos, [0, 0, 0]); assert.deepEqual(g.player.vel, [0, 0, 0]); assert.equal(g.player.invuln_ticks, 90);
  g.step(); approx(g.player.pos[0], .1);
});
test('last-flame fall loses immediately without resurrection', () => {
  const g = game({ player: { pos: [41, -11, 0], flames: 1 } }); const e = events(g); assert.equal(g.state, 'lost'); assert.equal(g.respawnTicks, 0); assert.equal(e.at(-1).data.reason, 'no_flames');
});
test('bridge boundaries support feet and leaving the bridge falls', () => {
  const w = worldFor(2); assert.equal(onLand(w, 35, 2), true); assert.equal(onLand(w, 35, 2.001), false);
  const g = game({ player: { pos: [35, 0, 0] } }, 2); run(g, 60, { move: [0, 1] }); assert.ok(g.player.pos[1] < 0);
});
test('N2 launch pad preserves horizontal momentum against input, lands on other island', () => {
  const g = game({ player: { pos: [20, 0, 18] } }, 2); g.step(); assert.equal(g.player.vel[1], 14); assert.equal(g.player.grounded, false);
  run(g, 84, { move: [-1, 0] }); assert.ok(g.player.pos[0] > 48); assert.ok(g.player.pos[0] < 70); assert.equal(g.player.grounded, true); approx(g.player.pos[1], 0);
});
test('N3 walls cannot be walked up, ramps climb to3m and step off descends', () => {
  assert.equal(terrainHeight(worldFor(3), 0, 18), 3); assert.equal(terrainHeight(worldFor(3), 0, -18), 0);
  const wall = game({ player: { pos: [0, 0, 24.1] } }, 3); run(wall, 10, { move: [0, -1] }); assert.ok(wall.player.pos[2] >= 24);
  const a = Math.PI / 6, g = game({ player: { pos: [30 * Math.cos(a), 0, 30 * Math.sin(a)] } }, 3);
  run(g, 61, { move: [-Math.cos(a), -Math.sin(a)] }); assert.equal(g.player.grounded, true); approx(g.player.pos[1], 3);
  const ledge = game({ player: { pos: [0, 3, 12.05] } }, 3); run(ledge, 30, { move: [0, -1] }); assert.ok(ledge.player.pos[1] < 3);
});
test('N3 pad reaches upper tier; central bell tower is solid', () => {
  const g = game({ player: { pos: [0, 3, 13] } }, 3); g.step(); run(g, 52, { move: [1, 0] }); assert.equal(g.player.grounded, true); approx(g.player.pos[1], 6);
  const tower = game({ player: { pos: [0, 6, 3] } }, 3); run(tower, 20, { move: [0, -1] }); assert.ok(tower.player.pos[2] >= 2 - 1e-8);
});
test('charm pickup600ticks run7.2m/s, resets duration and respawns at2700', () => {
  const g = game({ charms: [{ id: 'C1', pos: [0, 0, 0] }] }, 2); assert.equal(events(g)[0].name, 'charm_picked'); assert.equal(g.player.charm_ticks, 600); assert.equal(g.charms[0].respawnTicks, 2700);
  run(g, 60, { move: [0, 1] }); approx(g.player.pos[2], 7.2); run(g, 540, { move: [0, 0] }); assert.equal(g.player.charm_ticks, 0);
  run(g, 2099); assert.equal(g.charms[0].available, false); g.step(); assert.equal(g.charms[0].available, true);
  const refresh = game({ player: { charm_ticks: 5 }, charms: [{ id: 'C1', pos: [0, 0, 0] }] }, 2); refresh.step(); assert.equal(refresh.player.charm_ticks, 600);
});
test('charm dash haszero cooldown but cannot restart a running dash', () => {
  const g = game({ player: { charm_ticks: 600 } }, 2); g.step({ dash: true }); assert.equal(g.player.dash_cd_ticks, 0); g.step({ dash: false }); assert.equal(events(g, { dash: true }).filter(e => e.name === 'dash').length, 0);
  run(g, 10, { dash: false }); assert.equal(events(g, { dash: true })[0].name, 'dash');
});
test('drifter chase conditions, steals once, ignores invulnerability and safezones', () => {
  const g = game({ player: { carried: 8, invuln_ticks: 100 }, lanterns: [{ id: 'L1', pos: [0, 0, 0], lit: true }], drifters: [{ id: 'D1', pos: [0, .8, 0] }] }, 2);
  const e = events(g); assert.deepEqual(e[0].data, { drifter_id: 'D1', amount: 3, carried: 5 }); assert.equal(g.player.flames, 3); assert.equal(g.drifters[0].state, 'flee');
  run(g, 239); assert.equal(g.drifters.length, 1); g.step(); assert.equal(g.drifters.length, 0);
  const idle = game({ player: { carried: 4 }, drifters: [{ pos: [3, 1, 0] }] }, 2); idle.step(); assert.equal(idle.drifters[0].state, 'idle');
});
test('pulse forces chasing drifter to flee, recovers stolen motes next tick, then removes after120', () => {
  const g = game({ player: { carried: 10 }, drifters: [{ id: 'D1', pos: [3, .8, 0], state: 'chase' }, { id: 'D2', pos: [0, .8, 0], state: 'flee', stolen: 3, state_ticks_left: 240 }] }, 2);
  const e = events(g, { pulse: true }); assert.ok(e.some(e => e.name === 'drifter_drop' && e.data.amount === 3)); assert.equal(g.player.carried, 7); assert.equal(g.motes.length, 3);
  assert.equal(g.drifters[0].state, 'flee'); g.step(); assert.equal(g.player.carried, 10); run(g, 119); assert.equal(g.drifters.some(d => d.id === 'D2'), false);
});
test('drifter theft precedes shade damage, so dropped count is based on remainingcarried', () => {
  const g = game({ player: { carried: 8 }, drifters: [{ id: 'D1', pos: [0, .8, 0] }], shades: [{ pos: [0, .8, 0] }] }, 2);
  const e = events(g); assert.deepEqual(e.map(e => e.name), ['drifter_steal', 'player_hit']); assert.equal(e[1].data.dropped, 2); assert.equal(g.player.carried, 3);
});
test('pause increments tick but freezes sim_tick/timers/cooldowns/TTL/enemies/spawns', () => {
  const g = game({ player: { invuln_ticks: 20, dash_cd_ticks: 40, pulse_cd_ticks: 50, charm_ticks: 60 }, motes: [{ pos: [10, 0, 0], kind: 'dropped', ttl_s: 3 }], shades: [{ pos: [10, .8, 0], state: 'stunned', state_ticks_left: 50 }] });
  assert.equal(events(g, { pause: true })[0].name, 'paused'); const before = g.snapshot(); run(g, 240);
  const after = g.snapshot(); assert.equal(after.tick, 241); assert.equal(after.sim_tick, 0); assert.equal(after.state, 'paused'); assert.equal(after.time_left_s, 240);
  assert.deepEqual(after.player, before.player); assert.deepEqual(after.shades, before.shades); assert.deepEqual(after.motes, before.motes);
  g.step({ pause: false }); assert.equal(events(g, { pause: true })[0].name, 'resumed'); assert.equal(g.simTick, 1); assert.equal(g.player.invuln_ticks, 19);
});
test('wind warns2s before30s, active5s at2m/s; disabled flag stopswind', () => {
  const g = game({ wind_enabled: true }, 3); run(g, 1679); assert.equal(g.windWarning, false); g.step(); assert.equal(g.windWarning, true);
  run(g, 119); assert.equal(g.wind.active, false); const p = [...g.player.pos]; g.step(); assert.equal(g.wind.active, true); approx(distance(g.player.pos, p), 2 / 60);
  run(g, 299); assert.equal(g.wind.active, true); g.step(); assert.equal(g.wind.active, false);
});
test('canonical random population20 distinct, no initialshade, spawn at240/300/780', () => {
  const g = new Game({ tuning: t, seed: 2026 }); assert.equal(g.motes.length, 20); assert.equal(new Set(g.motes.map(m => m.pos.join(','))).size, 20); assert.equal(g.shades.length, 0);
  run(g, 239); assert.equal(g.motes.length, 20); g.step(); assert.equal(g.motes.length, 21); run(g, 59); assert.equal(g.shades.length, 0);
  const e = g.step(); assert.equal(e.filter(e => e.name === 'shade_spawned').length, 2); assert.equal(g.shades[0].state, 'spawning'); assert.ok(g.shades.every(s => distance(s.pos, g.player.pos) >= 15));
  const h = game({ random_shades: true, player: { invuln_ticks: 10000 } }); run(h, 780); assert.equal(h.shades.length, 3);
});
test('drifter schedule1200/2400, cap2, stableDids, N1 never spawn drifters', () => {
  const g = game({ random_drifters: true }, 2); run(g, 1199); assert.equal(g.drifters.length, 0); g.step(); assert.equal(g.drifters[0].id, 'D1'); run(g, 1200); assert.equal(g.drifters[1].id, 'D2'); run(g, 1200); assert.equal(g.drifters.length, 2);
  const h = game({ random_drifters: true }); run(h, 2400); assert.equal(h.drifters.length, 0);
});
test('all three nights win at dawn, exact fuel bonuses, night_start once', () => {
  for (const night of [1, 2, 3]) {
    const lamps = worldFor(night).lanterns.map((l, i) => i ? { id: l.id, lit: true } : { id: l.id, pos: [0, 0, 0] });
    const g = game({ player: { pos: [0, 0, -10], carried: 10 }, lanterns: lamps.map(l => l.lit ? l : { ...l, pos: [0, 0, -10] }), time_left_s: 1 / 60 }, night);
    const e = g.step({ interact: true }); assert.equal(g.state, 'won'); assert.equal(g.score, 450 + 149 * (lamps.length - 1)); assert.equal(e.filter(e => e.name === 'night_start').length, 1);
    assert.deepEqual(g.step(), []); assert.equal(g.tick, 1);
  }
});
test('end priorities: last-flame loses; threshold wins at dawn; otherwise dawn', () => {
  const g = game({ player: { flames: 1 }, shades: [{ pos: [0, .8, 0] }] }); assert.equal(events(g).at(-1).data.reason, 'no_flames');
  const won = game({ lanterns: worldFor(1).lanterns.map(l => ({ id: l.id, lit: true })), time_left_s: 1 / 60 }); won.step(); assert.equal(won.state, 'won');
  const dawn = run(game({ time_left_s: 1 }), 60); assert.equal(dawn.state, 'lost'); assert.equal(dawn.events.at(-1).data.reason, 'dawn');
});
test('simulation snapshots startzero, exactNsteps, mandatoryend, pausedstateincluded', () => {
  const rows = []; simulate({ tuning: t, scenario: empty, ticks: 25, snapshotEvery: 10, write: r => rows.push(r) });
  assert.deepEqual(rows.filter(r => r.type === 'snapshot').map(r => r.tick), [0, 10, 20]); assert.deepEqual(rows.at(-1), { type: 'end', ticks: 25, state: 'playing', score: 0 });
  const paused = []; simulate({ tuning: t, scenario: empty, inputs: { frames: [{ tick: 0, pause: true }] }, ticks: 25, write: r => paused.push(r) }); assert.equal(paused.at(-1).state, 'paused');
});
test('mandatoryv1.1fields, scenario counters, coordinate rounding; setuphasnoeffects', () => {
  const g = game({ player: { pos: [1.23456, 0, -.00001], invuln_ticks: 5, dash_cd_ticks: 90, pulse_cd_ticks: 180, charm_ticks: 600 } }); const s = g.snapshot();
  assert.deepEqual(s.player.pos, [1.235, 0, 0]); assert.equal(s.player.invuln, true); assert.equal(s.player.dash_cd_s, 1.5); assert.equal(s.player.pulse_cd_s, 3); assert.equal(s.player.charm_s, 10);
  for (const key of ['night', 'wind', 'motes', 'drifters', 'charms']) assert.ok(key in s);
});
test('same seedscenarioinputs yields identicalbytes, including allnewentities and wind', () => {
  const output = seed => { const lines = []; simulate({ tuning: t, seed, night: 3, scenario: { player: { invuln_ticks: 20000 } }, ticks: 2400, write: row => lines.push(JSON.stringify(row)) }); return lines.join('\n'); };
  assert.equal(output(77), output(77)); assert.notEqual(output(77), output(78));
});
test('malformed inputs/scenarios rejectnewfields aswellasoldones', () => {
  for (const bad of [null, {}, { frames: [{ tick: 1 }, { tick: 1 }] }, { frames: [{ tick: 0, move: [2, 0] }] }, { frames: [{ tick: 0, pause: 1 }] }, { frames: [{ tick: 0, dash: 'true' }] }, { frames: [{ tick: 0, cam_yaw_deg: Infinity }] }]) assert.throws(() => validateInputs(bad), InputError);
  for (const bad of [null, [], { player: null }, { player: { carried: 11 } }, { player: { invuln_ticks: .5 } }, { random_drifters: 1 }, { motes: [[1, 2]] }, { shades: [{ pos: [0, 0, 0], state: 'dead' }] }, { drifters: [{ pos: [0, 0, 0], stolen: -1 }] }, { charms: [{ id: 'C9' }] }, { lanterns: [{ id: 'L6' }] }]) assert.throws(() => validateScenario(bad, t), InputError);
});
