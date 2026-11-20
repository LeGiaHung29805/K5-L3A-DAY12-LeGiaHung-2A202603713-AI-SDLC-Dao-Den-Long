import { WORLDS } from './world.js';
export const HZ = 60;
export const DT = 1 / HZ;
export const ISLAND_RADIUS = 40;
export const EPS = 1e-9;
export const distance = (a, b) => Math.hypot(a[0] - b[0], a[2] - b[2]);
export const distance3 = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
export const round = n => Math.round(n * 1000) / 1000 || 0;
export const vector = pos => pos.map(round);
export const seconds = ticks => ticks / HZ;
export const byId = (a, b) => {
  const x = /^([A-Za-z]+)(\d+)$/.exec(a.id), y = /^([A-Za-z]+)(\d+)$/.exec(b.id);
  if (x && y && x[1] === y[1]) return Number(x[2]) - Number(y[2]);
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
};
const buttons = ['jump', 'interact', 'pulse', 'dash', 'pause'];
export const neutralInput = () => ({ move: [0, 0], cam_yaw_deg: 0, ...Object.fromEntries(buttons.map(b => [b, false])) });
export class InputError extends Error {}
const requireValue = (ok, message) => { if (!ok) throw new InputError(message); };
const object = v => v !== null && typeof v === 'object' && !Array.isArray(v);
const finite = v => typeof v === 'number' && Number.isFinite(v);
const nonnegativeInt = v => Number.isSafeInteger(v) && v >= 0;
const position = v => Array.isArray(v) && v.length === 3 && v.every(finite);
const allowed = (value, keys, label) => requireValue(Object.keys(value).every(key => keys.includes(key)), `${label}: unknown field`);
export const SHADE_STATES = ['spawning', 'wander', 'chase', 'recoil', 'stunned'];
export const DRIFTER_STATES = ['idle', 'chase', 'flee', 'removed'];

export function validateInputs(value) {
  requireValue(object(value) && Array.isArray(value.frames), 'inputs.frames must be an array');
  allowed(value, ['frames'], 'inputs');
  let last = -1;
  for (const f of value.frames) {
    requireValue(object(f), 'input frame must be an object');
    allowed(f, ['tick', 'move', 'cam_yaw_deg', ...buttons], 'frame');
    requireValue(nonnegativeInt(f.tick) && f.tick > last, 'frame ticks must be nonnegative and strictly increasing'); last = f.tick;
    if ('move' in f) requireValue(Array.isArray(f.move) && f.move.length === 2 && f.move.every(n => finite(n) && Math.abs(n) <= 1), 'move must contain two numbers in [-1,1]');
    if ('cam_yaw_deg' in f) requireValue(finite(f.cam_yaw_deg), 'cam_yaw_deg must be finite');
    for (const key of buttons) if (key in f) requireValue(typeof f[key] === 'boolean', `${key} must be boolean`);
  }
  return value;
}
export function validateScenario(s, t, night = 1) {
  requireValue(!!WORLDS[night], 'night must be 1, 2 or 3');
  requireValue(object(s), 'scenario must be an object');
  allowed(s, ['player', 'random_motes', 'random_shades', 'random_drifters', 'wind_enabled', 'motes', 'shades', 'drifters', 'charms', 'lanterns', 'time_left_s'], 'scenario');
  if ('player' in s) {
    const p = s.player; requireValue(object(p), 'player must be an object');
    allowed(p, ['pos', 'carried', 'flames', 'invuln_ticks', 'dash_cd_ticks', 'pulse_cd_ticks', 'charm_ticks'], 'player');
    if ('pos' in p) requireValue(position(p.pos), 'player.pos must be a finite 3D position');
    if ('carried' in p) requireValue(nonnegativeInt(p.carried) && p.carried <= t.carry_capacity, 'invalid player.carried');
    if ('flames' in p) requireValue(nonnegativeInt(p.flames) && p.flames <= t.flames, 'invalid player.flames');
    for (const k of ['invuln_ticks', 'dash_cd_ticks', 'pulse_cd_ticks', 'charm_ticks']) if (k in p) requireValue(nonnegativeInt(p[k]), `${k} must be a nonnegative integer`);
  }
  for (const k of ['random_motes', 'random_shades', 'random_drifters', 'wind_enabled']) if (k in s) requireValue(typeof s[k] === 'boolean', `${k} must be boolean`);
  if ('time_left_s' in s) requireValue(finite(s.time_left_s) && s.time_left_s >= 0, 'invalid time_left_s');
  if ('motes' in s) {
    requireValue(Array.isArray(s.motes), 'motes must be an array');
    const ids = new Set();
    for (const m of s.motes) {
      if (Array.isArray(m)) { requireValue(position(m), 'invalid mote position'); continue; }
      requireValue(object(m) && position(m.pos), 'mote must be a position or object with pos');
      allowed(m, ['id', 'pos', 'kind', 'ttl_s'], 'mote');
      if ('id' in m) { requireValue(typeof m.id === 'string' && m.id.length > 0 && !ids.has(m.id), 'duplicate/invalid mote id'); ids.add(m.id); }
      if ('kind' in m) requireValue(['random', 'dropped'].includes(m.kind), 'invalid mote kind');
      if ('ttl_s' in m) requireValue(m.ttl_s === null || finite(m.ttl_s) && m.ttl_s >= 0, 'invalid mote ttl_s');
    }
  }
  for (const key of ['shades', 'drifters']) if (key in s) {
    requireValue(Array.isArray(s[key]), `${key} must be an array`);
    const ids = new Set();
    for (const item of s[key]) {
      requireValue(object(item) && position(item.pos), `${key}.pos must be a finite 3D position`);
      allowed(item, ['id', 'pos', 'state', 'state_ticks_left', ...(key === 'drifters' ? ['stolen'] : [])], key);
      if ('id' in item) { requireValue(typeof item.id === 'string' && item.id.length > 0 && !ids.has(item.id), `${key} ids must be unique strings`); ids.add(item.id); }
      if ('state' in item) requireValue((key === 'shades' ? SHADE_STATES : DRIFTER_STATES).includes(item.state), `invalid ${key} state`);
      if ('state_ticks_left' in item) requireValue(nonnegativeInt(item.state_ticks_left), 'invalid state_ticks_left');
      if ('stolen' in item) requireValue(nonnegativeInt(item.stolen), 'invalid stolen');
    }
  }
  if ('charms' in s) {
    requireValue(Array.isArray(s.charms), 'charms must be an array'); const ids = new Set();
    for (const c of s.charms) {
      requireValue(object(c) && typeof c.id === 'string' && c.id.length > 0 && !ids.has(c.id), 'invalid charm id'); ids.add(c.id);
      allowed(c, ['id', 'pos', 'available', 'respawn_s', 'respawn_ticks'], 'charm');
      requireValue(!('pos' in c) || position(c.pos), 'invalid charm position');
      requireValue('pos' in c || WORLDS[night].charms.some(item => item.id === c.id), 'custom charm needs a position');
      if ('available' in c) requireValue(typeof c.available === 'boolean', 'available must be boolean');
      if ('respawn_s' in c) requireValue(finite(c.respawn_s) && c.respawn_s >= 0, 'invalid respawn_s');
      if ('respawn_ticks' in c) requireValue(nonnegativeInt(c.respawn_ticks), 'invalid respawn_ticks');
    }
  }
  if ('lanterns' in s) {
    requireValue(Array.isArray(s.lanterns), 'lanterns must be an array'); const ids = new Set();
    for (const l of s.lanterns) {
      requireValue(object(l) && WORLDS[night].lanterns.some(item => item.id === l.id) && !ids.has(l.id), 'invalid/duplicate lantern id'); ids.add(l.id);
      allowed(l, ['id', 'pos', 'deposited', 'lit'], 'lantern');
      if ('pos' in l) requireValue(position(l.pos), 'invalid lantern position');
      if ('deposited' in l) requireValue(nonnegativeInt(l.deposited) && l.deposited <= t.lantern_cost, 'invalid deposited');
      if ('lit' in l) requireValue(typeof l.lit === 'boolean', 'lit must be boolean');
      requireValue(!(l.lit === false && l.deposited === t.lantern_cost), 'full lantern cannot be unlit');
    }
  }
  return s;
}
export function seededRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6D2B79F5) | 0;
    let n = Math.imul(state ^ state >>> 15, 1 | state);
    n ^= n + Math.imul(n ^ n >>> 7, 61 | n);
    return ((n ^ n >>> 14) >>> 0) / 4294967296;
  };
}
