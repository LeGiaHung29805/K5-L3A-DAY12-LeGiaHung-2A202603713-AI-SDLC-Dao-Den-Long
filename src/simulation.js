import { HZ, DT, EPS, distance, distance3, vector, seconds, neutralInput, validateInputs, validateScenario, seededRandom, byId } from './rules.js';
import { worldFor, terrainHeight, rampAt, towerBlocks } from './world.js';
const ticks = s => Math.round(s * HZ);
const dec = (obj, key) => { if (obj[key] > 0) obj[key]--; };
const horizontalDirection = (from, to) => { const d = distance(from, to); return d > EPS ? [(to[0] - from[0]) / d, (to[2] - from[2]) / d] : [1, 0]; };

export class Game {
  constructor({ tuning, seed = 1, night = 1, scenario = {} }) {
    validateScenario(scenario, tuning, night);
    this.t = tuning; this.night = night; this.world = worldFor(night); this.random = seededRandom(seed);
    this.tick = 0; this.simTick = 0; this.state = 'playing'; this.score = 0; this.events = [];
    this.initialTime = scenario.time_left_s ?? tuning[`night${night}_duration_s`]; this.timeLeft = this.initialTime;
    this.input = neutralInput(); this.facing = [0, 1]; this.launch = null; this.dashDirection = [0, 1];
    this.player = { pos: [...this.world.spawn], vel: [0, 0, 0], carried: 0, flames: tuning.flames, successful_lights: 0, invuln_ticks: 0, dash_cd_ticks: 0, pulse_cd_ticks: 0, charm_ticks: 0, ...structuredClone(scenario.player ?? {}) };
    const ground = terrainHeight(this.world, this.player.pos[0], this.player.pos[2]);
    this.player.grounded = ground !== null && Math.abs(this.player.pos[1] - ground) < EPS;
    this.dashTicks = 0; this.respawnTicks = 0; this.respawnedThisTick = false;
    this.randomMotes = scenario.random_motes ?? true; this.randomShades = scenario.random_shades ?? true;
    this.randomDrifters = scenario.random_drifters ?? true; this.windEnabled = scenario.wind_enabled ?? true;
    this.wind = { active: false, dir_deg: 0 }; this.windWarning = false;
    this.counters = { M: 0, S: 0, D: 0 }; this.reserved = { M: new Set(), S: new Set(), D: new Set() };
    for (const [key, prefix] of [['motes', 'M'], ['shades', 'S'], ['drifters', 'D']]) for (const item of scenario[key] ?? []) if (item.id) this.reserved[prefix].add(item.id);
    this.lanterns = this.world.lanterns.map(item => {
      const l = { ...item, deposited: 0, lit: false, ever_lit: false, relit_count: 0, ...structuredClone(scenario.lanterns?.find(l => l.id === item.id) ?? {}) };
      if (l.lit || l.deposited >= (l.ever_lit ? tuning.relight_cost : tuning.lantern_cost)) { l.lit = true; l.deposited = l.ever_lit ? tuning.relight_cost : tuning.lantern_cost; }
      l.fuelUnits = l.lit ? Math.round((l.fuel ?? tuning.fuel_max) * HZ) : 0;
      if (l.lit) l.ever_lit = true;
      if (l.lit && l.fuelUnits === 0) { l.lit = false; l.deposited = 0; }
      return l;
    });
    this.motes = []; this.shades = []; this.drifters = [];
    if (scenario.motes) for (const m of scenario.motes) this.addMote(Array.isArray(m) ? m : m.pos, Array.isArray(m) ? {} : m);
    else if (this.randomMotes) for (let i = 0; i < 20; i++) this.spawnMote();
    for (const s of scenario.shades ?? []) this.addShade(s.pos, s.id, false, s);
    for (const d of scenario.drifters ?? []) this.addDrifter(d.pos, d);
    this.charms = (scenario.charms ?? this.world.charms).map(c => ({ ...structuredClone(c), pos: [...(c.pos ?? this.world.charms.find(p => p.id === c.id).pos)], available: c.available ?? true, respawnTicks: c.respawn_ticks ?? ticks(c.respawn_s ?? (c.available === false ? tuning.charm_respawn_s : 0)) }));
  }
  id(prefix) { let id; do { id = `${prefix}${++this.counters[prefix]}`; } while (this.reserved[prefix].has(id)); this.reserved[prefix].add(id); return id; }
  emit(name, data = {}) { this.events.push({ type: 'event', tick: this.tick, name, data }); }
  addMote(pos, opts = {}) {
    const id = opts.id ?? this.id('M'); this.reserved.M.add(id);
    this.motes.push({ id, pos: [...pos], kind: opts.kind ?? 'random', ttlTicks: opts.kind === 'dropped' ? ticks(opts.ttl_s ?? this.t.dropped_mote_ttl_s) : null, born: this.simTick });
  }
  spawnMote() {
    if (this.motes.filter(m => m.kind === 'random').length >= 30) return;
    const spots = this.world.moteSpawns.filter(p => !this.motes.some(m => m.kind === 'random' && distance3(m.pos, p) < .01));
    if (spots.length) this.addMote(spots[Math.floor(this.random() * spots.length)]);
  }
  addShade(pos, id, event = true, opts = {}) {
    id ??= this.id('S'); this.reserved.S.add(id);
    const state = opts.state ?? (event ? 'spawning' : 'chase');
    this.shades.push({ id, pos: [...pos], state, target_lantern_id: opts.target_lantern_id ?? null, drainTicks: 0, stateTicks: opts.state_ticks_left ?? (state === 'spawning' ? ticks(this.t.shade_spawn_s) : state === 'stunned' ? ticks(this.t.pulse_stun_s) : state === 'recoil' ? ticks(this.t.shade_recoil_s) : 0), pushTicks: 0, pushStep: [0, 0], recoilStep: [0, 0], wanderAngle: this.random() * Math.PI * 2, born: this.simTick });
    if (event) this.emit('shade_spawned', { id });
  }
  addDrifter(pos, opts = {}) {
    const id = opts.id ?? this.id('D'); this.reserved.D.add(id);
    this.drifters.push({ id, pos: [...pos], state: opts.state ?? 'idle', stolen: opts.stolen ?? 0, stateTicks: opts.state_ticks_left ?? (opts.state === 'flee' ? 240 : 0), wanderAngle: this.random() * Math.PI * 2, born: this.simTick });
  }
  get capacity() { return Math.min(this.t.capacity_max, this.t.carry_capacity + 2 * this.player.successful_lights); }
  fuel(l) { return Math.round(l.fuelUnits / HZ * 10) / 10; }
  hasSafeZone(l) { return l.lit && l.fuelUnits >= this.t.low_fuel_threshold * HZ; }
  accepts(l) { return !l.lit || l.fuelUnits < this.t.fuel_max * HZ; }
  lightCost(l) { return l.ever_lit ? this.t.relight_cost : this.t.lantern_cost; }
  isSafe(pos) { return this.lanterns.some(l => this.hasSafeZone(l) && distance(pos, l.pos) <= this.t.safe_radius + EPS); }
  updateFuel() {
    const drains = new Map();
    for (const s of [...this.shades].sort(byId)) {
      const l = this.lanterns.find(l => l.id === s.target_lantern_id);
      if (s.state !== 'drain' || !l?.lit || l.fuelUnits >= this.t.low_fuel_threshold * HZ || distance(s.pos, l.pos) > 2 + EPS) { s.drainTicks = 0; continue; }
      if (!drains.has(l.id)) drains.set(l.id, []); drains.get(l.id).push(s);
    }
    for (const l of this.lanterns) if (l.lit) {
      const shades = drains.get(l.id) ?? [];
      l.fuelUnits = Math.max(0, l.fuelUnits - this.t.fuel_decay_per_s - this.t.drain_per_s * shades.length);
      for (const s of shades) { s.drainTicks++; if (s.drainTicks % HZ === 0) this.emit('fuel_drain', { lantern_id: l.id, shade_id: s.id, fuel: this.fuel(l) }); }
      if (l.fuelUnits === 0) { l.lit = false; l.deposited = 0; this.emit('lantern_out', { lantern_id: l.id }); }
    }
  }
  updateSafeZones() {
    for (const s of this.shades) for (const l of this.lanterns) if (this.hasSafeZone(l) && distance(s.pos, l.pos) < this.t.safe_radius - EPS) {
      const dir = horizontalDirection(l.pos, s.pos);
      s.pos[0] = l.pos[0] + dir[0] * this.t.safe_radius; s.pos[2] = l.pos[2] + dir[1] * this.t.safe_radius;
      if (s.state !== 'stunned') { s.state = 'recoil'; s.stateTicks = 30; s.recoilStep = [0, 0]; }
    }
  }
  moveShade(s, dx, dz) {
    const next = [s.pos[0] + dx, s.pos[1], s.pos[2] + dz];
    const oldGround = terrainHeight(this.world, s.pos[0], s.pos[2]), ground = terrainHeight(this.world, next[0], next[2]);
    if (ground === null || towerBlocks(this.world, next) || ground > s.pos[1] + .15) return;
    for (const l of this.lanterns) if (this.hasSafeZone(l) && distance(next, l.pos) < this.t.safe_radius - EPS) {
      const dir = horizontalDirection(l.pos, s.pos); next[0] = l.pos[0] + dir[0] * this.t.safe_radius; next[2] = l.pos[2] + dir[1] * this.t.safe_radius;
    }
    if (oldGround !== null) next[1] += ground - oldGround;
    s.pos = next;
  }
  decrementTimers() {
    const p = this.player;
    for (const key of ['invuln_ticks', 'dash_cd_ticks', 'pulse_cd_ticks', 'charm_ticks']) dec(p, key);
    dec(this, 'dashTicks');
    for (const s of this.shades) {
      s.justRecovered = s.state === 'stunned' && s.stateTicks === 1;
      dec(s, 'stateTicks');
      if (s.stateTicks === 0 && ['stunned', 'spawning'].includes(s.state)) s.state = 'wander';
    }
    for (const d of this.drifters) if (d.state === 'flee') { dec(d, 'stateTicks'); if (d.stateTicks === 0) d.state = 'removed'; }
    for (const m of this.motes) if (m.ttlTicks !== null) dec(m, 'ttlTicks');
    this.motes = this.motes.filter(m => m.ttlTicks === null || m.ttlTicks > 0);
    this.drifters = this.drifters.filter(d => d.state !== 'removed');
    for (const c of this.charms) if (!c.available) { dec(c, 'respawnTicks'); if (c.respawnTicks === 0) c.available = true; }
    if (this.respawnTicks > 0) {
      dec(this, 'respawnTicks');
      if (this.respawnTicks === 0) {
        p.pos = [...this.world.spawn]; p.vel = [0, 0, 0]; p.grounded = true; p.invuln_ticks = ticks(this.t.invuln_s); this.launch = null; this.dashTicks = 0; this.respawnedThisTick = true;
      }
    }
  }
  updateWind() {
    if (this.night !== 3 || !this.windEnabled) { this.wind.active = false; this.windWarning = false; return; }
    const phase = this.simTick % 1800;
    if (phase === 1680) this.wind.dir_deg = this.random() * 360;
    this.windWarning = phase >= 1680;
    this.wind.active = this.simTick >= 1800 && phase < 300;
  }
  movePlayer(pressed) {
    const p = this.player, t = this.t;
    if (this.respawnTicks > 0 || this.respawnedThisTick || p.flames <= 0) { p.vel = [0, 0, 0]; return; }
    let [x, z] = this.input.move; const len = Math.max(1, Math.hypot(x, z)); x /= len; z /= len;
    const a = this.input.cam_yaw_deg * Math.PI / 180;
    const move = [x * Math.cos(a) + z * Math.sin(a), -x * Math.sin(a) + z * Math.cos(a)];
    if (Math.hypot(...move) > EPS) this.facing = horizontalDirection([0, 0, 0], [move[0], 0, move[1]]);
    if (pressed('jump') && p.grounded) { p.vel[1] = t.jump_speed; p.grounded = false; }
    if (pressed('dash') && this.dashTicks === 0 && (p.dash_cd_ticks === 0 || p.charm_ticks > 0)) {
      this.dashDirection = [...this.facing]; this.dashTicks = ticks(t.dash_duration_s);
      p.dash_cd_ticks = p.charm_ticks > 0 ? 0 : ticks(t.dash_cooldown_s); this.emit('dash');
    }
    const old = [...p.pos];
    const speed = p.charm_ticks > 0 ? t.charm_player_speed : t.player_speed;
    let velocity = this.launch ? [...this.launch] : [move[0] * speed, move[1] * speed];
    if (this.dashTicks > 0) velocity = this.dashDirection.map(n => n * t.dash_speed);
    if (this.wind.active) { const w = this.wind.dir_deg * Math.PI / 180; velocity[0] += Math.cos(w) * 2; velocity[1] += Math.sin(w) * 2; }
    p.pos[0] += velocity[0] * DT; p.pos[2] += velocity[1] * DT;
    const targetGround = terrainHeight(this.world, p.pos[0], p.pos[2]);
    const climbingRamp = !!rampAt(this.world, p.pos[0], p.pos[2]) && p.grounded;
    if (towerBlocks(this.world, p.pos) || targetGround !== null && targetGround > old[1] + .15 && !climbingRamp) {
      p.pos[0] = old[0]; p.pos[2] = old[2];
    }
    const ground = terrainHeight(this.world, p.pos[0], p.pos[2]);
    if (p.grounded && (ground === null || ground < old[1] - .15)) p.grounded = false;
    if (p.grounded && ground !== null) { p.pos[1] = ground; p.vel[1] = 0; }
    else if (this.dashTicks === 0) {
      p.vel[1] += t.gravity * DT; p.pos[1] += p.vel[1] * DT;
      if (ground !== null && p.vel[1] <= 0 && old[1] >= ground - EPS && p.pos[1] <= ground) {
        p.pos[1] = ground; p.vel[1] = 0; p.grounded = true; this.launch = null;
      }
    }
    for (const pad of this.world.pads) if (p.grounded && distance(p.pos, pad.pos) <= pad.radius + EPS && Math.abs(p.pos[1] - pad.pos[1]) < .1) {
      const dir = horizontalDirection(pad.pos, pad.target); this.launch = dir.map(n => n * pad.speed); p.vel[1] = pad.vy; p.grounded = false;
    }
    p.vel[0] = (p.pos[0] - old[0]) * HZ; p.vel[2] = (p.pos[2] - old[2]) * HZ;
    if (p.pos[1] < t.fall_threshold_y && t.fall_enabled) {
      const lost = p.carried; p.carried = 0; p.flames--; p.vel = [0, 0, 0]; this.launch = null; this.dashTicks = 0;
      this.respawnTicks = p.flames > 0 ? ticks(t.respawn_s) : 0;
      this.emit('player_hit', { by: 'fall', flames: p.flames, dropped: 0, lost });
    }
  }
  canPick(pos) { return distance(this.player.pos, pos) <= this.t.pickup_radius + EPS && Math.abs(this.player.pos[1] - pos[1]) <= this.t.pickup_height + EPS; }
  pickup() {
    const p = this.player; if (this.respawnTicks > 0 || p.flames <= 0) return;
    this.motes = this.motes.filter(m => {
      if (p.carried < this.capacity && this.canPick(m.pos) && (m.kind !== 'dropped' || m.born < this.simTick)) { p.carried++; this.emit('mote_picked', { carried: p.carried }); return false; }
      return true;
    });
    for (const c of this.charms) if (c.available && this.canPick(c.pos)) {
      p.charm_ticks = ticks(this.t.charm_duration_s); p.dash_cd_ticks = 0; c.available = false; c.respawnTicks = ticks(this.t.charm_respawn_s);
      this.emit('charm_picked', { charm_id: c.id, charm_ticks: p.charm_ticks });
    }
  }
  deposit(pressed) {
    const p = this.player, t = this.t; if (!pressed('interact') || this.respawnTicks > 0 || p.carried === 0 || p.flames <= 0) return;
    const l = this.lanterns.filter(l => this.accepts(l) && distance(p.pos, l.pos) <= t.interact_radius + EPS).sort((a, b) => distance(p.pos, a.pos) - distance(p.pos, b.pos) || byId(a, b))[0];
    if (!l) return;
    if (l.lit) {
      const amount = Math.min(p.carried, Math.ceil((t.fuel_max * HZ - l.fuelUnits) / (t.fuel_per_mote * HZ)));
      if (amount === 0) return;
      p.carried -= amount; l.fuelUnits = Math.min(t.fuel_max * HZ, l.fuelUnits + amount * t.fuel_per_mote * HZ); this.score += amount * t.score.per_mote;
      this.emit('refuel', { lantern_id: l.id, amount, fuel: this.fuel(l) }); return;
    }
    const relight = l.ever_lit, cost = this.lightCost(l);
    const amount = Math.min(p.carried, cost - l.deposited); p.carried -= amount; l.deposited += amount; this.score += amount * t.score.per_mote;
    this.emit('deposit', { lantern_id: l.id, amount, deposited: l.deposited });
    if (l.deposited === cost) { l.lit = true; l.fuelUnits = t.fuel_max * HZ; l.ever_lit = true; if (relight) l.relit_count++; p.successful_lights++; this.score += relight ? t.score.per_relight : t.score.per_lantern; this.emit('lantern_lit', { lantern_id: l.id, relight }); }
  }
  pulse(pressed) {
    const p = this.player, t = this.t;
    if (!pressed('pulse') || this.respawnTicks > 0 || p.flames <= 0 || p.pulse_cd_ticks > 0 || p.carried < t.pulse_cost) return;
    p.carried -= t.pulse_cost; p.pulse_cd_ticks = ticks(t.pulse_cooldown_s);
    const center = [p.pos[0], p.pos[1] + .8, p.pos[2]], stunnedIds = [];
    for (const s of [...this.shades].sort(byId)) if (distance3(center, s.pos) <= t.pulse_radius + EPS) {
      const draining = s.state === 'drain';
      s.state = 'stunned'; s.stateTicks = ticks(t.pulse_stun_s); s.pushTicks = ticks(t.pulse_push_s);
      const dir = horizontalDirection(p.pos, s.pos); s.pushStep = dir.map(n => n * t.pulse_push_m / s.pushTicks);
      this.score += draining ? t.score.per_drain_stun : t.score.per_stun; stunnedIds.push(s.id);
    }
    for (const d of [...this.drifters].sort(byId)) if (distance3(center, d.pos) <= t.pulse_radius + EPS) {
      if (d.state === 'chase') { d.state = 'flee'; d.stateTicks = 240; }
      else if (d.state === 'flee' && d.stolen > 0) {
        const amount = d.stolen; d.stolen = 0; d.stateTicks = 120;
        const ground = terrainHeight(this.world, d.pos[0], d.pos[2]) ?? 0;
        for (let i = 0; i < amount; i++) this.addMote([d.pos[0], ground, d.pos[2]], { kind: 'dropped' });
        this.emit('drifter_drop', { drifter_id: d.id, amount });
      }
    }
    this.emit('pulse', { stunned_ids: stunnedIds });
  }
  moveEnemies() {
    const p = this.player, t = this.t;
    for (const s of this.shades) {
      if (s.state === 'stunned') { if (s.pushTicks > 0) { this.moveShade(s, ...s.pushStep); s.pushTicks--; } continue; }
      if (s.state === 'spawning') continue;
      if (s.state === 'recoil') { this.moveShade(s, ...s.recoilStep); if (s.stateTicks === 0) s.state = 'wander'; continue; }
      if (s.justRecovered) continue;
      if (s.state === 'drain') {
        const l = this.lanterns.find(l => l.id === s.target_lantern_id);
        if (!l?.lit || this.hasSafeZone(l) || distance(s.pos, l.pos) > 2 + EPS) { s.state = 'wander'; s.drainTicks = 0; }
        else if (distance(s.pos, p.pos) <= 6 + EPS && this.respawnTicks === 0) { s.state = 'chase'; s.drainTicks = 0; }
        else continue;
      }
      const d = distance(s.pos, p.pos), targetable = this.respawnTicks === 0 && !this.isSafe(p.pos);
      if (s.state === 'chase' && (d > t.shade_lose_radius || !targetable)) s.state = 'wander';
      else if (s.state === 'wander' && !s.justRecovered && d <= t.shade_detect_radius + EPS && targetable) s.state = 'chase';
      if (s.state === 'chase') {
        const dir = horizontalDirection(s.pos, p.pos), speed = this.night === 3 ? t.shade_speed_night3 : t.shade_speed;
        const step = Math.min(d, speed * DT); this.moveShade(s, dir[0] * step, dir[1] * step);
      } else {
        const weak = this.lanterns.filter(l => l.lit && !this.hasSafeZone(l));
        const target = (weak.length ? weak : this.lanterns.filter(l => !l.lit)).sort((a, b) => distance(s.pos, a.pos) - distance(s.pos, b.pos) || byId(a, b))[0];
        s.target_lantern_id = target?.id ?? null;
        if (target) {
          const d = distance(s.pos, target.pos), dir = horizontalDirection(s.pos, target.pos), step = Math.min(d, t.shade_wander_speed * DT);
          this.moveShade(s, dir[0] * step, dir[1] * step);
          if (target.lit && !this.hasSafeZone(target) && distance(s.pos, target.pos) <= 2 + EPS) { s.state = 'drain'; s.drainTicks = 0; }
        } else {
          if (this.simTick % 120 === 0) s.wanderAngle = this.random() * Math.PI * 2;
          this.moveShade(s, Math.cos(s.wanderAngle) * t.shade_wander_speed * DT, Math.sin(s.wanderAngle) * t.shade_wander_speed * DT);
        }
      }
    }
    for (const d of this.drifters) {
      if (d.state === 'flee') { const dir = horizontalDirection(p.pos, d.pos); d.pos[0] += dir[0] * 7 * DT; d.pos[2] += dir[1] * 7 * DT; continue; }
      d.state = p.carried >= 5 && distance(d.pos, p.pos) <= 15 + EPS && this.respawnTicks === 0 ? 'chase' : 'idle';
      if (d.state === 'chase') { const dir = horizontalDirection(d.pos, p.pos), step = Math.min(distance(d.pos, p.pos), 7 * DT); d.pos[0] += dir[0] * step; d.pos[2] += dir[1] * step; }
      else { d.pos[0] += Math.cos(d.wanderAngle) * 2 * DT; d.pos[2] += Math.sin(d.wanderAngle) * 2 * DT; }
    }
  }
  contacts() {
    const p = this.player, t = this.t; if (this.respawnTicks > 0 || p.flames <= 0) return;
    for (const d of [...this.drifters].sort(byId)) if (d.state === 'chase' && distance(d.pos, p.pos) <= 1.2 + EPS) {
      const amount = Math.min(3, p.carried); p.carried -= amount; d.stolen = amount; d.state = 'flee'; d.stateTicks = 240;
      this.emit('drifter_steal', { drifter_id: d.id, amount, carried: p.carried });
    }
    if (p.invuln_ticks > 0 || this.isSafe(p.pos)) return;
    for (const s of [...this.shades].sort(byId)) if (['wander', 'chase'].includes(s.state) && distance(s.pos, p.pos) <= t.shade_hit_radius + EPS && Math.abs(s.pos[1] - p.pos[1]) <= t.shade_hit_height + EPS) {
      p.flames--; const dropped = Math.floor(p.carried * t.hit_drop_ratio); p.carried -= dropped; p.invuln_ticks = ticks(t.invuln_s);
      for (let i = 0; i < dropped; i++) {
        const a = this.random() * Math.PI * 2, r = 1.5 + this.random(); const x = p.pos[0] + Math.cos(a) * r, z = p.pos[2] + Math.sin(a) * r;
        this.addMote([x, terrainHeight(this.world, x, z) ?? 0, z], { kind: 'dropped' });
      }
      s.state = 'recoil'; s.stateTicks = ticks(t.shade_recoil_s); const dir = horizontalDirection(p.pos, s.pos); s.recoilStep = dir.map(n => n * t.shade_recoil_m / s.stateTicks);
      this.emit('player_hit', { by: 'shade', flames: p.flames, dropped }); break;
    }
  }
  spawnScheduled() {
    if (this.randomMotes && this.simTick % 240 === 0) this.spawnMote();
    if (this.randomShades && this.simTick >= 300 && (this.simTick - 300) % this.world.shadeInterval === 0) {
      const count = this.simTick === 300 ? 2 : 1;
      for (let i = 0; i < count && this.shades.length < this.world.shadeCap; i++) {
        const spots = this.world.shadeSpawns.filter(pos => distance(pos, this.player.pos) >= 15 - EPS && !this.isSafe(pos) && !this.shades.some(s => distance(s.pos, pos) < 1));
        if (!spots.length) break; const pos = [...spots[Math.floor(this.random() * spots.length)]]; pos[1] += .8; this.addShade(pos);
      }
    }
    if (this.randomDrifters && this.night >= 2 && this.simTick % 1200 === 0 && this.drifters.length < 2) {
      const pos = [...this.world.shadeSpawns[Math.floor(this.random() * this.world.shadeSpawns.length)]]; pos[1] += 1; this.addDrifter(pos);
    }
  }
  finish(state, reason) {
    this.state = state;
    if (state === 'won') this.score += this.lanterns.filter(l => l.lit).reduce((sum, l) => sum + this.t.score.per_lit_at_dawn + Math.floor(l.fuelUnits / HZ), 0) + this.player.flames * this.t.score.per_flame_left;
    this.emit('game_over', { result: state, reason });
  }
  step(patch = {}) {
    if (['won', 'lost'].includes(this.state)) return [];
    this.events = []; const previous = this.input; this.input = { ...previous, ...patch }; const pressed = key => this.input[key] && !previous[key];
    this.tick++;
    if (this.tick === 1) this.emit('night_start', { night: this.night });
    if (pressed('pause')) { this.state = this.state === 'paused' ? 'playing' : 'paused'; this.emit(this.state === 'paused' ? 'paused' : 'resumed'); }
    if (this.state === 'paused') return this.events;
    this.simTick++; this.respawnedThisTick = false; this.timeLeft = Math.max(0, this.initialTime - this.simTick / HZ);
    this.updateFuel(); this.decrementTimers(); this.updateWind();
    this.movePlayer(pressed); this.pickup(); this.deposit(pressed); this.updateSafeZones(); this.pulse(pressed);
    this.moveEnemies(); this.contacts(); this.spawnScheduled();
    if (this.player.flames <= 0) this.finish('lost', 'no_flames');
    else if (this.timeLeft <= EPS) this.finish(this.lanterns.filter(l => l.lit).length >= Math.ceil(this.t.win_ratio * this.lanterns.length) ? 'won' : 'lost', this.lanterns.filter(l => l.lit).length >= Math.ceil(this.t.win_ratio * this.lanterns.length) ? 'dawn_survived' : 'dawn');
    return this.events;
  }
  snapshot() {
    const p = this.player;
    return { type: 'snapshot', tick: this.tick, sim_tick: this.simTick, night: this.night, state: this.state, time_left_s: this.timeLeft, score: this.score,
      wind: { active: this.wind.active, dir_deg: this.wind.dir_deg },
      player: { pos: vector(p.pos), vel: vector(p.vel), grounded: p.grounded, flames: p.flames, carried: p.carried, capacity: this.capacity, invuln: p.invuln_ticks > 0, dash_cd_s: seconds(p.dash_cd_ticks), pulse_cd_s: seconds(p.pulse_cd_ticks), charm_s: seconds(p.charm_ticks) },
      lanterns: this.lanterns.map(l => ({ id: l.id, pos: vector(l.pos), lit: l.lit, deposited: l.deposited, fuel: l.lit ? this.fuel(l) : 0, ever_lit: l.ever_lit, relit_count: l.relit_count })),
      shades: this.shades.map(s => ({ id: s.id, pos: vector(s.pos), state: s.state })), motes_active: this.motes.length,
      motes: this.motes.map(m => ({ id: m.id, pos: vector(m.pos), kind: m.kind, ttl_s: m.ttlTicks === null ? null : seconds(m.ttlTicks) })),
      drifters: this.drifters.map(d => ({ id: d.id, pos: vector(d.pos), state: d.state, stolen: d.stolen })),
      charms: this.charms.map(c => ({ id: c.id, available: c.available, respawn_s: seconds(c.respawnTicks) })) };
  }
}
export function simulate({ tuning, seed = 1, night = 1, scenario = {}, inputs = { frames: [] }, ticks: maxTicks, snapshotEvery = 10, write }) {
  validateInputs(inputs); const game = new Game({ tuning, seed, night, scenario }); write(game.snapshot());
  let index = 0;
  while (game.tick < maxTicks && !['won', 'lost'].includes(game.state)) {
    const frame = inputs.frames[index]?.tick === game.tick ? inputs.frames[index++] : {};
    for (const event of game.step(frame)) write(event);
    if (game.tick % snapshotEvery === 0) write(game.snapshot());
  }
  write({ type: 'end', ticks: game.tick, state: game.state, score: game.score }); return game;
}
