// This module has no renderer, DOM, filesystem, clock, or unseeded randomness.
export const HZ = 60;
export const ISLAND_RADIUS = 42;
export const DT = 1 / HZ;
const EPS = 1e-9;
export const distance = (a, b) => Math.hypot(a[0] - b[0], a[2] - b[2]);
const round = n => Math.round(n * 1000) / 1000 || 0;
const vector = pos => pos.map(round);
const buttons = ['jump', 'interact', 'pulse'];
export const neutralInput = () => ({ move: [0, 0], cam_yaw_deg: 0, jump: false, interact: false, pulse: false });

export class InputError extends Error {}
const requireValue = (ok, message) => { if (!ok) throw new InputError(message); };
const object = v => v !== null && typeof v === 'object' && !Array.isArray(v);
const finite = v => typeof v === 'number' && Number.isFinite(v);
const nonnegativeInt = v => Number.isSafeInteger(v) && v >= 0;
const position = v => Array.isArray(v) && v.length === 3 && v.every(finite);
const allowed = (value, keys, label) => requireValue(Object.keys(value).every(key => keys.includes(key)), `${label}: unknown field`);

export function validateInputs(value) {
  requireValue(object(value) && Array.isArray(value.frames), 'inputs.frames must be an array');
  allowed(value, ['frames'], 'inputs');
  let last = -1;
  for (const f of value.frames) {
    requireValue(object(f), 'input frame must be an object');
    allowed(f, ['tick', 'move', 'cam_yaw_deg', ...buttons], 'frame');
    requireValue(nonnegativeInt(f.tick) && f.tick > last, 'frame ticks must be nonnegative and strictly increasing');
    last = f.tick;
    if ('move' in f) requireValue(Array.isArray(f.move) && f.move.length === 2 && f.move.every(n => finite(n) && Math.abs(n) <= 1), 'move must contain two numbers in [-1,1]');
    if ('cam_yaw_deg' in f) requireValue(finite(f.cam_yaw_deg), 'cam_yaw_deg must be finite');
    for (const key of buttons) if (key in f) requireValue(typeof f[key] === 'boolean', `${key} must be boolean`);
  }
  return value;
}

export function validateScenario(s, t) {
  requireValue(object(s), 'scenario must be an object');
  allowed(s, ['player', 'random_motes', 'random_shades', 'motes', 'shades', 'lanterns', 'time_left_s'], 'scenario');
  if ('player' in s) {
    requireValue(object(s.player), 'player must be an object');
    allowed(s.player, ['pos', 'carried', 'flames'], 'player');
    if ('pos' in s.player) requireValue(position(s.player.pos) && s.player.pos[1] >= 0, 'player.pos must be a nonnegative-height 3D position');
    if ('carried' in s.player) requireValue(nonnegativeInt(s.player.carried) && s.player.carried <= t.carry_capacity, 'invalid player.carried');
    if ('flames' in s.player) requireValue(nonnegativeInt(s.player.flames) && s.player.flames <= t.flames, 'invalid player.flames');
  }
  for (const k of ['random_motes', 'random_shades']) if (k in s) requireValue(typeof s[k] === 'boolean', `${k} must be boolean`);
  if ('time_left_s' in s) requireValue(finite(s.time_left_s) && s.time_left_s >= 0, 'invalid time_left_s');
  if ('motes' in s) requireValue(Array.isArray(s.motes) && s.motes.every(position), 'motes must be an array of positions');
  if ('shades' in s) {
    requireValue(Array.isArray(s.shades), 'shades must be an array');
    const ids = new Set();
    for (const sh of s.shades) {
      requireValue(object(sh) && position(sh.pos), 'shade.pos must be a 3D position');
      allowed(sh, ['id', 'pos'], 'shade');
      if ('id' in sh) {
        requireValue(typeof sh.id === 'string' && sh.id.length > 0 && !ids.has(sh.id), 'shade ids must be unique nonempty strings');
        ids.add(sh.id);
      }
    }
  }
  if ('lanterns' in s) {
    requireValue(Array.isArray(s.lanterns), 'lanterns must be an array');
    const ids = new Set();
    for (const l of s.lanterns) {
      requireValue(object(l) && /^L[1-5]$/.test(l.id) && !ids.has(l.id), 'lantern ids must be unique L1..L5');
      ids.add(l.id);
      allowed(l, ['id', 'pos', 'deposited', 'lit'], 'lantern');
      if ('pos' in l) requireValue(position(l.pos), 'invalid lantern position');
      if ('deposited' in l) requireValue(nonnegativeInt(l.deposited) && l.deposited <= t.lantern_cost, 'invalid lantern.deposited');
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

export class Game {
  constructor({ tuning, seed = 1, scenario = {} }) {
    validateScenario(scenario, tuning);
    this.t = tuning;
    this.random = seededRandom(seed);
    this.tick = 0;
    this.state = 'playing';
    this.score = 0;
    this.initialTime = scenario.time_left_s ?? tuning.night1_duration_s;
    this.timeLeft = this.initialTime;
    this.input = neutralInput();
    this.player = { pos: [0, 0, 0], carried: 0, flames: tuning.flames, ...structuredClone(scenario.player ?? {}) };
    this.vy = 0;
    this.invulnerableUntil = 0;
    this.pulseReadyAt = 0;
    this.randomMotes = scenario.random_motes ?? true;
    this.randomShades = scenario.random_shades ?? true;
    this.moteCounter = 0;
    this.shadeCounter = 0;
    this.events = [];
    this.lanterns = Array.from({ length: 5 }, (_, i) => {
      const angle = i * Math.PI * 2 / 5;
      const l = { id: `L${i + 1}`, pos: [Math.sin(angle) * 25, 0, Math.cos(angle) * 25], deposited: 0, lit: false };
      Object.assign(l, structuredClone(scenario.lanterns?.find(item => item.id === l.id) ?? {}));
      if (l.lit || l.deposited >= tuning.lantern_cost) { l.lit = true; l.deposited = tuning.lantern_cost; }
      return l;
    });
    this.motes = [];
    if (scenario.motes) for (const pos of scenario.motes) this.addMote(pos);
    else if (this.randomMotes) {
      // A small, visible starting trail; the rest is seeded across the island.
      for (let i = 1; i <= 10; i++) this.addMote([Math.sin(i) * 0.7, 0, i * 1.8]);
      for (let i = 0; i < 100; i++) this.addMote(this.randomPosition(35));
    }
    this.shades = [];
    this.reservedShadeIds = new Set(scenario.shades?.filter(s => s.id).map(s => s.id) ?? []);
    if (scenario.shades) for (const s of scenario.shades) this.addShade(s.pos, s.id, false);
    else if (this.randomShades) for (let i = 0; i < 3; i++) this.addShade(this.randomPosition(35, 29), undefined, false);
  }

  randomPosition(max, min = 0) {
    const angle = this.random() * Math.PI * 2;
    const r = Math.sqrt(min * min + this.random() * (max * max - min * min));
    return [Math.sin(angle) * r, 0, Math.cos(angle) * r];
  }
  addMote(pos) { this.motes.push({ id: `M${++this.moteCounter}`, pos: [...pos] }); }
  addShade(pos, id, event = true) {
    if (!id) { do { id = `S${++this.shadeCounter}`; } while (this.reservedShadeIds.has(id) || this.shades.some(s => s.id === id)); }
    this.shades.push({ id, pos: [...pos], state: 'chase', stunnedUntil: 0 });
    if (event) this.emit('shade_spawned', { id });
  }
  emit(name, data) { this.events.push({ type: 'event', tick: this.tick, name, data }); }
  isSafe(pos) { return this.lanterns.some(l => l.lit && distance(pos, l.pos) <= this.t.safe_radius + EPS); }
  keepShadeOutside(shade) {
    // Repeated projection also handles overlapping safe circles in a scenario.
    for (let pass = 0; pass < 12; pass++) for (const l of this.lanterns) if (l.lit) {
      const d = distance(shade.pos, l.pos);
      if (d < this.t.safe_radius + EPS) {
        const dx = d > EPS ? (shade.pos[0] - l.pos[0]) / d : 1;
        const dz = d > EPS ? (shade.pos[2] - l.pos[2]) / d : 0;
        shade.pos[0] = l.pos[0] + dx * (this.t.safe_radius + 0.001);
        shade.pos[2] = l.pos[2] + dz * (this.t.safe_radius + 0.001);
      }
    }
  }
  finish(state, reason) {
    this.state = state;
    if (state === 'won') this.score += Math.floor(this.timeLeft + EPS) * this.t.score.per_second_left + this.player.flames * this.t.score.per_flame_left;
    this.emit('game_over', { result: state, reason });
  }
  step(patch = {}) {
    if (this.state !== 'playing') return [];
    this.events = [];
    const previous = this.input;
    this.input = { ...previous, ...patch };
    const input = this.input;
    const pressed = key => input[key] && !previous[key];
    const p = this.player;
    const t = this.t;
    this.tick++;
    let [x, z] = input.move;
    const length = Math.max(1, Math.hypot(x, z));
    x /= length; z /= length;
    const yaw = input.cam_yaw_deg * Math.PI / 180;
    p.pos[0] += (x * Math.cos(yaw) + z * Math.sin(yaw)) * t.player_speed * DT;
    p.pos[2] += (-x * Math.sin(yaw) + z * Math.cos(yaw)) * t.player_speed * DT;
    const radius = Math.hypot(p.pos[0], p.pos[2]);
    if (radius > ISLAND_RADIUS) { p.pos[0] *= ISLAND_RADIUS / radius; p.pos[2] *= ISLAND_RADIUS / radius; }
    if (pressed('jump') && p.pos[1] <= EPS) this.vy = 7;
    this.vy -= 20 * DT;
    p.pos[1] = Math.max(0, p.pos[1] + this.vy * DT);
    if (p.pos[1] === 0) this.vy = 0;

    this.motes = this.motes.filter(m => {
      if (p.carried < t.carry_capacity && distance(p.pos, m.pos) <= t.pickup_radius + EPS) {
        p.carried++; this.score += t.score.per_mote;
        this.emit('mote_picked', { carried: p.carried });
        return false;
      }
      return true;
    });
    if (pressed('interact') && p.carried > 0) {
      const l = this.lanterns.filter(l => !l.lit && distance(p.pos, l.pos) <= t.interact_radius + EPS)
        .sort((a, b) => distance(p.pos, a.pos) - distance(p.pos, b.pos) || a.id.localeCompare(b.id, 'en'))[0];
      if (l) {
        const amount = Math.min(p.carried, t.lantern_cost - l.deposited);
        p.carried -= amount; l.deposited += amount;
        this.emit('deposit', { lantern_id: l.id, amount, deposited: l.deposited });
        if (l.deposited === t.lantern_cost) {
          l.lit = true; this.score += t.score.per_lantern;
          this.emit('lantern_lit', { lantern_id: l.id });
        }
      }
    }
    if (pressed('pulse') && p.carried >= t.pulse_cost && this.tick >= this.pulseReadyAt) {
      p.carried -= t.pulse_cost;
      this.pulseReadyAt = this.tick + Math.ceil(t.pulse_cooldown_s * HZ);
      const stunnedIds = [];
      for (const s of this.shades) if (distance(p.pos, s.pos) <= t.pulse_radius + EPS) {
        if (s.state !== 'stunned') this.score += t.score.per_stun;
        const d = distance(p.pos, s.pos);
        s.pos[0] += (d > EPS ? (s.pos[0] - p.pos[0]) / d : 1) * t.pulse_push_m;
        s.pos[2] += (d > EPS ? (s.pos[2] - p.pos[2]) / d : 0) * t.pulse_push_m;
        s.state = 'stunned'; s.stunnedUntil = this.tick + Math.ceil(t.pulse_stun_s * HZ);
        stunnedIds.push(s.id);
      }
      this.emit('pulse', { stunned_ids: stunnedIds });
    }
    for (const s of this.shades) {
      this.keepShadeOutside(s);
      if (s.state === 'stunned' && this.tick >= s.stunnedUntil) s.state = 'chase';
      if (s.state === 'stunned') continue;
      const d = distance(s.pos, p.pos);
      const amount = Math.min(d, t.shade_speed * DT);
      if (d > EPS) { s.pos[0] += (p.pos[0] - s.pos[0]) / d * amount; s.pos[2] += (p.pos[2] - s.pos[2]) / d * amount; }
      this.keepShadeOutside(s);
      if (distance(s.pos, p.pos) <= t.shade_hit_radius + EPS && this.tick >= this.invulnerableUntil && !this.isSafe(p.pos) && p.flames > 0) {
        p.flames--;
        this.invulnerableUntil = this.tick + Math.ceil(t.invuln_s * HZ);
        const dropped = Math.floor(p.carried * t.hit_drop_ratio);
        p.carried -= dropped;
        // Dropped motes disappear; no score on damage or scenario setup.
        this.emit('player_hit', { by: 'shade', flames: p.flames, dropped });
      }
    }
    this.timeLeft = Math.max(0, this.initialTime - this.tick / HZ);
    if (p.flames <= 0) this.finish('lost', 'no_flames');
    else if (this.lanterns.every(l => l.lit)) this.finish('won', 'all_lit');
    else if (this.timeLeft <= EPS) this.finish('lost', 'dawn');
    if (this.state === 'playing') {
      if (this.randomMotes && this.tick % 300 === 0 && this.motes.length < 130) for (let i = 0; i < 8; i++) this.addMote(this.randomPosition(35));
      if (this.randomShades && this.tick % 600 === 0 && this.shades.length < 10) this.addShade(this.randomPosition(36, 32));
    }
    return this.events;
  }
  snapshot() {
    return { type: 'snapshot', tick: this.tick, sim_tick: this.tick, state: this.state, time_left_s: this.timeLeft, score: this.score,
      player: { pos: vector(this.player.pos), flames: this.player.flames, carried: this.player.carried },
      lanterns: this.lanterns.map(l => ({ id: l.id, pos: vector(l.pos), lit: l.lit, deposited: l.deposited })),
      shades: this.shades.map(s => ({ id: s.id, pos: vector(s.pos), state: s.state })),
      motes_active: this.motes.length, motes: this.motes.map(m => ({ id: m.id, pos: vector(m.pos) })) };
  }
}

export function simulate({ tuning, seed = 1, scenario = {}, inputs = { frames: [] }, ticks, snapshotEvery = 10, write }) {
  validateInputs(inputs);
  const game = new Game({ tuning, seed, scenario });
  write(game.snapshot());
  let index = 0;
  while (game.tick < ticks && game.state === 'playing') {
    const frame = inputs.frames[index]?.tick === game.tick ? inputs.frames[index++] : {};
    for (const event of game.step(frame)) write(event);
    if (game.tick % snapshotEvery === 0) write(game.snapshot());
  }
  write({ type: 'end', ticks: game.tick, state: game.state, score: game.score });
  return game;
}
