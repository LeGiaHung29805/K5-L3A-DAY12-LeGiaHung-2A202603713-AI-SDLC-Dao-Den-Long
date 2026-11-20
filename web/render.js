import * as THREE from './vendor/three.module.js';
import { PALETTE as P } from './palette.js';
import { seededRandom, distance } from './src/core.js';
import { terrainHeight } from './src/world.js';

export class GameView {
  constructor(canvas) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(1); this.renderer.setSize(innerWidth, innerHeight);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace; this.renderer.toneMapping = THREE.ACESFilmicToneMapping; this.renderer.toneMappingExposure = 1.3;
    this.scene = new THREE.Scene(); this.scene.background = new THREE.Color(P.sky); this.scene.fog = new THREE.FogExp2(P.fog, .011);
    this.camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, .1, 300); this.camera.position.set(-16, 24, -38);
    this.ambient = new THREE.AmbientLight(P.text, .15); this.scene.add(this.ambient);
    const moonLight = new THREE.DirectionalLight('#c9d4ed', 2.2); moonLight.position.set(-20, 40, -15); this.scene.add(moonLight);
    const fill = new THREE.DirectionalLight('#8b9cba', .6); fill.position.set(30, 15, 40); this.scene.add(fill);
    this.worldGroup = new THREE.Group(); this.dynamic = new THREE.Group(); this.scene.add(this.worldGroup, this.dynamic);
    const mat = (color, opts = {}) => new THREE.MeshStandardMaterial({ color, roughness: .95, flatShading: true, ...opts });
    this.materials = {
      grass: mat(P.grass), sand: mat(P.sand), wood: mat(P.wood), sea: mat(P.sea), stone: mat('#71837f'), rock: mat('#263744'),
      leaves: mat('#326654'), gold: mat(P.gold), robe: mat(P.robe), scarf: mat(P.scarf), hat: mat(P.sand),
      lantern: mat(P.lantern, { emissive: P.lantern, emissiveIntensity: .6 }), core: mat(P.lanternCore, { emissive: P.lanternCore, emissiveIntensity: 1.4 }),
      off: mat(P.lanternOff), mote: new THREE.MeshBasicMaterial({ color: P.mote }),
      moteHalo: new THREE.MeshBasicMaterial({ color: P.moteHalo, transparent: true, opacity: .13, depthWrite: false }),
      shade: mat(P.shade), shadeStunned: mat(P.shadeStunned), rim: new THREE.MeshBasicMaterial({ color: P.shadeRim }),
      drifter: mat(P.drifter, { emissive: P.drifter, emissiveIntensity: .15 }), black: mat('#272522')
    };
    this.geo = { orb: new THREE.IcosahedronGeometry(1, 1), box: new THREE.BoxGeometry(1, 1, 1), cone: new THREE.ConeGeometry(1, 1, 8), disk: new THREE.CircleGeometry(1, 48), cylinder: new THREE.CylinderGeometry(1, 1, 1, 12) };
    this.effects = []; this.keeper = this.makeKeeper(); this.scene.add(this.keeper);
    this.keeperLight = new THREE.PointLight(P.lantern, 12, 9, 2); this.keeperLight.position.set(.4, 1.4, 0); this.keeper.add(this.keeperLight);
    this.targetCamera = new THREE.Vector3(); this.lookTarget = new THREE.Vector3(); this.projected = new THREE.Vector3();
    const random = seededRandom(7321), vertices = [];
    for (let i = 0; i < 500; i++) { const a = random() * 6.28, r = 90 + random() * 80; vertices.push(Math.cos(a) * r + 20, 20 + random() * 90, Math.sin(a) * r); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    this.scene.add(new THREE.Points(g, new THREE.PointsMaterial({ color: '#b3c4de', size: .15, transparent: true, opacity: .7 })));
    this.add(new THREE.SphereGeometry(5, 20, 12), new THREE.MeshBasicMaterial({ color: '#d2dac8' }), this.scene, [65, 50, 80]);
    this.windLeaves = [];
    for (let i = 0; i < 18; i++) { const leaf = this.add(this.geo.orb, this.materials.leaves, this.scene, [0, 0, 0], [.16, .025, .35]); leaf.visible = false; this.windLeaves.push(leaf); }
  }
  add(g, m, parent, pos = [0, 0, 0], scale = [1, 1, 1]) { const o = new THREE.Mesh(g, m); o.position.set(...pos); o.scale.set(...scale); parent.add(o); return o; }
  makeKeeper() {
    const g = new THREE.Group(), m = this.materials;
    this.add(new THREE.CylinderGeometry(.26, .46, .85, 8), m.robe, g, [0, .97, 0]);
    this.add(this.geo.orb, m.hat, g, [0, 1.7, 0], [.31, .34, .3]);
    this.hat = this.add(new THREE.ConeGeometry(.8, .42, 20), m.hat, g, [0, 2.06, 0]);
    this.add(this.geo.cylinder, m.scarf, g, [0, 1.37, 0], [.38, .13, .38]);
    const tail = this.add(this.geo.box, m.scarf, g, [.12, 1.03, -.37], [.22, .75, .07]); tail.rotation.x = -.2;
    this.legs = [-1, 1].map(n => this.add(this.geo.box, m.wood, g, [n * .2, .3, 0], [.22, .6, .24]));
    this.arms = [-1, 1].map(n => this.add(this.geo.box, m.robe, g, [n * .4, 1.04, .05], [.21, .56, .24]));
    this.add(this.geo.cylinder, m.gold, g, [.62, 1.67, .12], [.07, .25, .07]);
    this.add(this.geo.orb, m.core, g, [.62, 1.4, .12], [.2, .25, .2]);
    for (const x of [-.12, .12]) this.add(this.geo.orb, m.black, g, [x, 1.73, .28], [.035, .05, .03]);
    return g;
  }
  clearGroup(group) {
    const shared = new Set(Object.values(this.geo));
    group.traverse(o => { if (o.isMesh && !shared.has(o.geometry)) o.geometry.dispose(); if (o.userData.ownMaterial) o.material.dispose(); }); group.clear();
  }
  sector(inner, outer, y, bottom = 0) {
    const vertices = [], segments = 48;
    const tri = (a, b, c) => vertices.push(...a, ...b, ...c);
    for (let i = 0; i < segments; i++) {
      const a = i * Math.PI / segments, b = (i + 1) * Math.PI / segments;
      const p = (r, angle, h) => [r * Math.cos(angle), h, r * Math.sin(angle)];
      const ia = p(inner, a, y), ib = p(inner, b, y), oa = p(outer, a, y), ob = p(outer, b, y);
      tri(ia, ob, oa); tri(ia, ib, ob);
      tri(oa, ob, p(outer, a, bottom)); tri(ob, p(outer, b, bottom), p(outer, a, bottom));
      tri(ib, ia, p(inner, a, bottom)); tri(ib, p(inner, a, bottom), p(inner, b, bottom));
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3)); g.computeVertexNormals(); return g;
  }
  build(game) {
    this.clearGroup(this.worldGroup); this.clearGroup(this.dynamic);
    for (const e of this.effects) { this.scene.remove(e.mesh); e.mesh.geometry.dispose(); e.mesh.material.dispose(); } this.effects = [];
    this.motes = new Map(); this.shades = new Map(); this.drifters = new Map(); this.charms = new Map(); this.lamps = []; this.crowd = null;
    const w = game.world, m = this.materials, random = seededRandom(7300 + game.night);
    const sea = this.add(new THREE.CircleGeometry(230, 64), m.sea, this.worldGroup, [30, -18, 0]); sea.rotation.x = -Math.PI / 2;
    for (const island of w.islands) {
      const [cx, , cz] = island.center, r = island.radius;
      this.add(new THREE.CylinderGeometry(r, r - 1, 1.2, 64), m.sand, this.worldGroup, [cx, -.61, cz]);
      this.add(new THREE.CylinderGeometry(r - 1.3, r - 1.3, .13, 64), m.grass, this.worldGroup, [cx, -.05, cz]);
      this.add(new THREE.CylinderGeometry(r - .7, r * .75, 5, 16), m.rock, this.worldGroup, [cx, -3.7, cz]);
      const cone = this.add(new THREE.ConeGeometry(r * .75, 15, 10), m.rock, this.worldGroup, [cx, -13.7, cz]); cone.rotation.z = Math.PI;
      for (let i = 0; i < 18; i++) {
        const a = random() * Math.PI * 2, radius = r - 3 + random() * 2;
        this.add(this.geo.orb, m.rock, this.worldGroup, [cx + Math.cos(a) * radius, .05, cz + Math.sin(a) * radius], [1.1 + random(), .25 + random() * .4, .7 + random()]);
      }
      for (let i = 0; i < 12; i++) {
        const a = random() * Math.PI * 2, radius = 13 + random() * (r - 18), x = cx + Math.cos(a) * radius, z = cz + Math.sin(a) * radius;
        const point = [x, terrainHeight(w, x, z) ?? 0, z];
        if ([...w.lanterns, ...w.pads, ...w.charms].some(o => distance(o.pos, point) < 4) || w.night === 3 && z > 0 && Math.abs(Math.atan2(z, x) - Math.PI / 6) < .15) continue;
        const tree = new THREE.Group(); tree.position.set(...point); this.worldGroup.add(tree);
        this.add(this.geo.cylinder, m.wood, tree, [0, 1.2, 0], [.22, 2.4, .22]);
        this.add(this.geo.orb, m.leaves, tree, [0, 3.1, 0], [1.6, 1.6, 1.5]); this.add(this.geo.orb, m.leaves, tree, [1, 2.8, 0], [1.2, 1.2, 1.2]);
      }
    }
    if (w.bridge) for (let x = 26; x <= 44; x += .9) this.add(this.geo.box, m.wood, this.worldGroup, [x, -.08, 0], [.8, .16, 4]);
    if (w.night === 3) {
      this.add(this.sector(12, 24, 3), m.grass, this.worldGroup);
      this.add(new THREE.CylinderGeometry(8, 8, 6, 48), m.grass, this.worldGroup, [0, 3, 0]);
      for (const ramp of w.ramps) {
        const a = ramp.angle * Math.PI / 180, vertices = [];
        const point = (u, v, y) => [u * Math.cos(a) - v * Math.sin(a), y, u * Math.sin(a) + v * Math.cos(a)];
        const p0 = point(30, -1.5, 0), p1 = point(30, 1.5, 0), p2 = point(24, 1.5, 3), p3 = point(24, -1.5, 3);
        vertices.push(...p0, ...p2, ...p1, ...p0, ...p3, ...p2);
        const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3)); g.computeVertexNormals(); this.add(g, m.sand, this.worldGroup);
        for (const side of [-1.8, 1.8]) for (const u of [24, 30]) this.add(this.geo.cylinder, m.gold, this.worldGroup, point(u, side, u === 24 ? 3.3 : .3), [.08, .6, .08]);
      }
      this.add(new THREE.CylinderGeometry(2, 2, 8, 16), m.wood, this.worldGroup, [0, 10, 0]);
      this.add(new THREE.ConeGeometry(3, 1.6, 8), m.gold, this.worldGroup, [0, 14.6, 0]);
      this.add(this.geo.orb, m.lantern, this.worldGroup, [0, 13, 0], [1, 1, 1]);
    }
    // Decorative stepping stones never introduce collision or gameplay entities.
    for (const l of game.lanterns) {
      const island = w.islands.reduce((a, b) => distance(a.center, l.pos) < distance(b.center, l.pos) ? a : b);
      for (let j = 1; j <= 10; j++) {
        const p = [island.center[0] + (l.pos[0] - island.center[0]) * j / 11, 0, island.center[2] + (l.pos[2] - island.center[2]) * j / 11]; p[1] = (terrainHeight(w, p[0], p[2]) ?? 0) + .025;
        const stone = this.add(this.geo.orb, m.stone, this.worldGroup, p, [.5, .035, .65]); stone.rotation.y = random() * 6;
      }
    }
    for (const pad of w.pads) {
      this.add(new THREE.CylinderGeometry(1, 1.1, .12, 20), m.gold, this.worldGroup, [pad.pos[0], pad.pos[1] + .06, pad.pos[2]]);
      const ring = this.add(new THREE.TorusGeometry(.65, .045, 6, 24), m.core, this.worldGroup, [pad.pos[0], pad.pos[1] + .14, pad.pos[2]]); ring.rotation.x = -Math.PI / 2;
    }
    if (w.night === 1) for (let i = 0; i < 7; i++) this.add(this.geo.box, m.wood, this.worldGroup, [-10, .04, -32 - i * .75], [3, .1, .6]);
    for (const l of game.lanterns) {
      const g = new THREE.Group(); g.position.set(...l.pos); this.dynamic.add(g);
      this.add(this.geo.cylinder, m.stone, g, [0, .1, 0], [1.1, .2, 1.1]); this.add(this.geo.cylinder, m.wood, g, [0, 1.5, 0], [.17, 2.7, .17]);
      this.add(this.geo.box, m.wood, g, [.5, 2.8, 0], [1.2, .15, .18]);
      const body = this.add(new THREE.SphereGeometry(.55, 12, 8), m.off, g, [.7, 2.18, 0], [.9, 1.2, .9]);
      for (const y of [1.5, 2.85]) this.add(this.geo.cylinder, m.gold, g, [.7, y, 0], [.28, .08, .28]);
      this.add(this.geo.cone, m.wood, g, [.7, 3.05, 0], [.58, .34, .58]); this.add(this.geo.box, m.gold, g, [.7, 1.23, 0], [.04, .45, .04]);
      const light = new THREE.PointLight(P.lantern, 0, 15, 2); light.position.set(.7, 2.1, 0); g.add(light);
      const ringMat = new THREE.MeshBasicMaterial({ color: P.lantern, transparent: true, opacity: .3, side: THREE.DoubleSide, depthWrite: false });
      const ring = this.add(new THREE.RingGeometry(5.92, 6, 64), ringMat, g, [0, .05, 0]); ring.rotation.x = -Math.PI / 2; ring.userData.ownMaterial = true;
      const tear = new THREE.Group(); g.add(tear);
      for (let j = 0; j < 3; j++) { const cut = this.add(this.geo.box, m.black, tear, [.7 + (j - 1) * .11, 2.1 + j * .09, .48], [.18, .045, .03]); cut.rotation.z = j % 2 ? -.5 : .5; }
      const barBack = this.add(this.geo.box, m.off, g, [.7, 3.55, 0], [1.4, .12, .09]);
      const bar = this.add(this.geo.box, m.gold, g, [.7, 3.55, -.01], [1.4, .1, .12]);
      this.lamps.push({ g, body, light, ring, tear, barBack, bar });
    }
    for (const c of game.charms) {
      const g = new THREE.Group(); this.dynamic.add(g); const paper = this.add(this.geo.box, m.scarf, g, [0, 0, 0], [.48, .75, .04]);
      this.add(this.geo.box, m.gold, g, [0, .32, .04], [.5, .055, .05]); this.add(this.geo.box, m.gold, g, [0, -.32, .04], [.5, .055, .05]);
      this.add(this.geo.box, m.gold, g, [-.22, 0, .04], [.05, .65, .05]); this.add(this.geo.box, m.gold, g, [.22, 0, .04], [.05, .65, .05]);
      this.add(this.geo.cone, m.gold, g, [0, 0, .07], [.12, .2, .03]); this.charms.set(c.id, { g, paper });
    }
    if (this.benchmarkMode) this.makeCrowd(game);
    const cx = w.night === 2 ? 30 : 0; this.camera.position.set(cx - 22, 28, -43); this.lookTarget.set(cx, 0, 2);
  }
  makeCrowd(game) {
    // Identical models/materials, batched for the fixed 200-wanderer benchmark.
    const instanced = (geometry, material, count) => { const mesh = new THREE.InstancedMesh(geometry, material, count); mesh.frustumCulled = false; mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage); this.dynamic.add(mesh); return mesh; };
    this.crowd = { body: instanced(this.geo.orb, this.materials.shade, game.shades.length), eyes: instanced(this.geo.orb, this.materials.rim, game.shades.length * 2), tails: instanced(this.geo.cone, this.materials.shade, game.shades.length * 3), motes: instanced(this.geo.orb, this.materials.mote, game.motes.length), halos: instanced(this.geo.orb, this.materials.moteHalo, game.motes.length), dummy: new THREE.Object3D() };
  }
  syncCrowd(game, time) {
    const c = this.crowd, o = c.dummy;
    const set = (mesh, i, x, y, z, sx, sy, sz, yaw = 0, roll = 0) => { o.position.set(x, y, z); o.rotation.set(0, yaw, roll); o.scale.set(sx, sy, sz); o.updateMatrix(); mesh.setMatrixAt(i, o.matrix); };
    game.shades.forEach((s, i) => {
      const [x, y, z] = s.pos, bob = Math.sin(time * 3) * .08, a = Math.atan2(-x, -z), ca = Math.cos(a), sa = Math.sin(a);
      set(c.body, i, x, y + bob, z, .68, .8, .6, a);
      for (let j = 0; j < 2; j++) { const local = j ? .23 : -.23; set(c.eyes, i * 2 + j, x + local * ca + .5 * sa, y + bob + .12, z - local * sa + .5 * ca, .09, .065, .06, a); }
      for (let j = 0; j < 3; j++) { const local = (j - 1) * .33; set(c.tails, i * 3 + j, x + local * ca, y + bob - .52, z - local * sa, .2, .6, .23, a, Math.PI); }
    });
    game.motes.forEach((m, i) => { const phase = Number(m.id.replace(/\D/g, '')) || 1, [x, y, z] = m.pos, height = y + .6 + Math.sin(time * 2 + phase) * .15; set(c.motes, i, x, height, z, .12, .12, .12); set(c.halos, i, x, height, z, .3, .3, .3); });
    for (const key of ['body', 'eyes', 'tails', 'motes', 'halos']) c[key].instanceMatrix.needsUpdate = true;
  }
  effect(name, pos) {
    if (!['pulse', 'dash', 'lantern_lit'].includes(name)) return;
    const material = new THREE.MeshBasicMaterial({ color: name === 'dash' ? P.drifter : P.lantern, side: THREE.DoubleSide, transparent: true, opacity: .7, depthWrite: false });
    const mesh = new THREE.Mesh(new THREE.RingGeometry(.88, 1, 48), material); mesh.rotation.x = -Math.PI / 2; mesh.position.set(pos[0], pos[1] + .12, pos[2]); this.scene.add(mesh);
    this.effects.push({ mesh, left: .6, radius: name === 'pulse' ? 5 : name === 'lantern_lit' ? 6 : 2 });
  }
  sync(game, time, delta, yaw, menu = false) {
    const p = game.player, m = this.materials;
    this.keeper.position.set(...p.pos); this.keeper.rotation.y = Math.atan2(game.facing[0], game.facing[1]);
    this.keeper.visible = game.respawnTicks === 0 && (this.reducedMotion || p.invuln_ticks === 0 || Math.floor(time * 12) % 2 === 0);
    const moving = Math.hypot(p.vel[0], p.vel[2]) > .1 && game.state === 'playing';
    this.legs.forEach((o, i) => { o.rotation.x = moving ? Math.sin(time * 12 + i * Math.PI) * .5 : 0; }); this.arms.forEach((o, i) => { o.rotation.x = moving ? Math.sin(time * 12 - i * Math.PI) * .35 : .08; }); this.hat.rotation.z = Math.sin(time * 1.8) * .025;
    game.lanterns.forEach((l, i) => {
      const v = this.lamps[i], fuel = l.fuelUnits / 60, blink = !this.reducedMotion && l.lit && fuel < game.t.low_fuel_threshold && Math.floor(time * 2) % 2 === 0;
      v.body.material = l.lit ? m.core : m.off; v.body.scale.set(.9, l.lit ? 1.2 : .96, .9); v.tear.visible = !l.lit;
      v.body.visible = !blink; v.light.intensity = l.lit ? blink ? 3 : 25 : 0; v.ring.visible = game.hasSafeZone(l);
      v.bar.visible = l.lit && !blink; v.barBack.visible = l.lit;
      v.bar.scale.x = 1.4 * fuel / game.t.fuel_max; v.bar.position.x = v.bar.scale.x / 2;
    });
    if (this.crowd) this.syncCrowd(game, time);
    const moteIds = new Set(game.motes.map(o => o.id));
    for (const [id, g] of this.motes) if (!moteIds.has(id)) { this.dynamic.remove(g); this.motes.delete(id); }
    if (!this.crowd) for (const item of game.motes) {
      if (!this.motes.has(item.id)) { const g = new THREE.Group(); this.dynamic.add(g); this.add(this.geo.orb, m.mote, g, [0, 0, 0], [.12, .12, .12]); this.add(this.geo.orb, m.moteHalo, g, [0, 0, 0], [.3, .3, .3]); this.motes.set(item.id, g); }
      const g = this.motes.get(item.id), phase = Number(item.id.replace(/\D/g, '')) || 1; g.position.set(item.pos[0], item.pos[1] + .6 + Math.sin(time * 2 + phase) * .15, item.pos[2]);
    }
    if (!this.crowd) for (const item of game.shades) {
      if (!this.shades.has(item.id)) {
        const g = new THREE.Group(); this.dynamic.add(g); const body = this.add(this.geo.orb, m.shade, g, [0, 0, 0], [.68, .8, .6]);
        for (const x of [-.23, .23]) this.add(this.geo.orb, m.rim, g, [x, .12, .5], [.09, .065, .06]);
        for (let i = 0; i < 3; i++) { const tail = this.add(this.geo.cone, m.shade, g, [(i - 1) * .33, -.52, 0], [.2, .6, .23]); tail.rotation.z = Math.PI; }
        const halo = this.add(new THREE.TorusGeometry(.8, .025, 4, 20), m.gold, g, [0, 1, 0]); halo.rotation.x = Math.PI / 2;
        this.shades.set(item.id, { g, body, halo });
      }
      const v = this.shades.get(item.id); v.g.position.set(item.pos[0], item.pos[1] + Math.sin(time * 3) * .08, item.pos[2]); v.g.rotation.y = Math.atan2(p.pos[0] - item.pos[0], p.pos[2] - item.pos[2]);
      v.body.material = item.state === 'stunned' ? m.shadeStunned : m.shade; v.halo.visible = item.state === 'stunned'; const scale = item.state === 'spawning' ? .45 : 1; v.g.scale.setScalar(scale);
    }
    const drifterIds = new Set(game.drifters.map(d => d.id));
    for (const [id, v] of this.drifters) if (!drifterIds.has(id)) { this.dynamic.remove(v.g); this.drifters.delete(id); }
    for (const item of game.drifters) {
      if (!this.drifters.has(item.id)) {
        const g = new THREE.Group(); this.dynamic.add(g); this.add(this.geo.orb, m.drifter, g, [0, 0, .3], [.28, .16, .35]);
        const tails = Array.from({ length: 4 }, (_, i) => this.add(this.geo.box, m.drifter, g, [(i % 2 - .5) * .2, 0, -.3 - i * .37], [.18, .06, .8]));
        const loot = this.add(this.geo.orb, m.mote, g, [0, -.3, .2], [.12, .12, .12]); this.drifters.set(item.id, { g, tails, loot });
      }
      const v = this.drifters.get(item.id); v.g.position.set(item.pos[0], item.pos[1] + .2, item.pos[2]); const dir = item.state === 'flee' ? -1 : 1; v.g.rotation.y = Math.atan2((p.pos[0] - item.pos[0]) * dir, (p.pos[2] - item.pos[2]) * dir);
      v.tails.forEach((tail, i) => { tail.rotation.z = Math.sin(time * 7 - i) * .35; }); v.loot.visible = item.stolen > 0;
    }
    for (const c of game.charms) { const v = this.charms.get(c.id); if (v) { v.g.visible = c.available; v.g.position.set(c.pos[0], c.pos[1] + 1 + Math.sin(time * 2) * .12, c.pos[2]); v.g.rotation.y = time * .8; } }
    this.ambient.intensity = .15 + .55 * game.lanterns.filter(l => l.lit).length / game.lanterns.length;
    this.scene.fog.density = .011 - game.lanterns.filter(l => l.lit).length / game.lanterns.length * .005;
    this.windLeaves.forEach((leaf, i) => { leaf.visible = game.wind.active || game.windWarning; if (leaf.visible) { const a = game.wind.dir_deg * Math.PI / 180, travel = (game.simTick / 60 * (game.wind.active ? 8 : 3) + i * 1.7) % 24 - 12; leaf.position.set(p.pos[0] + Math.cos(a) * travel + Math.sin(i) * 8, p.pos[1] + 1 + (i % 5), p.pos[2] + Math.sin(a) * travel + Math.cos(i) * 8); leaf.rotation.set(time + i, i, time * 2); } });
    for (const e of this.effects) { e.left -= delta; e.mesh.scale.setScalar(Math.max(.1, (1 - e.left / .6) * e.radius)); e.mesh.material.opacity = Math.max(0, e.left); }
    this.effects = this.effects.filter(e => { if (e.left > 0) return true; this.scene.remove(e.mesh); e.mesh.geometry.dispose(); e.mesh.material.dispose(); return false; });
    if (this.cameraOverride) { this.camera.position.set(...this.cameraOverride.pos); this.targetCamera.copy(this.camera.position); this.lookTarget.set(...this.cameraOverride.target); }
    else if (menu) { const cx = game.night === 2 ? 32 : 0; this.targetCamera.set(cx - 22 + (this.reducedMotion ? 0 : Math.sin(time * .06) * 3), game.night === 3 ? 35 : 28, -42); this.lookTarget.set(cx + 4, 1, 2); }
    else { this.targetCamera.set(p.pos[0] - Math.sin(yaw) * 16, Math.max(-1, p.pos[1]) + 12, p.pos[2] - Math.cos(yaw) * 16); this.lookTarget.set(p.pos[0] + Math.sin(yaw) * 4, Math.max(-1, p.pos[1]) + .6, p.pos[2] + Math.cos(yaw) * 4); }
    this.camera.position.lerp(this.targetCamera, 1 - Math.exp(-delta * 6)); this.camera.lookAt(this.lookTarget); this.renderer.render(this.scene, this.camera);
  }
  lampHint(lamp) {
    const p = this.projected.set(lamp.pos[0], lamp.pos[1] + 2, lamp.pos[2]).project(this.camera);
    const visible = p.z > -1 && p.z < 1 && Math.abs(p.x) < .85 && Math.abs(p.y) < .8;
    const local = new THREE.Vector3(...lamp.pos).applyMatrix4(this.camera.matrixWorldInverse); const sign = local.z > 0 ? -1 : 1;
    return { visible, angle: Math.atan2(local.x * sign, local.y * sign) * 180 / Math.PI };
  }
  resize() { this.renderer.setSize(innerWidth, innerHeight); this.camera.aspect = innerWidth / innerHeight; this.camera.updateProjectionMatrix(); }
  setAccessiblePalette(enabled) { this.materials.rim.color.set(enabled ? '#00B3FF' : P.shadeRim); }
}
