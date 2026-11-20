// Canonical Phase 2 maps, shared by physics, spawn schedules and the renderer.
const ring = (radius, count, offset = 0, center = [0, 0, 0], y = 0) => Array.from({ length: count }, (_, i) => {
  const a = (offset + i * 360 / count) * Math.PI / 180;
  return [center[0] + radius * Math.cos(a), y, center[2] + radius * Math.sin(a)];
});
const lamps = points => points.map((pos, i) => ({ id: `L${i + 1}`, pos }));
export const WORLDS = {
  1: {
    night: 1, name: 'Đảo Bến', spawn: [0, 0, 0],
    story: 'Ông Đăng: “Đốm sáng nhỏ cũng đủ dẫn lối về nhà. Hãy thắp lại năm ngọn đèn trên Đảo Bến, Mây nhé.”',
    islands: [{ center: [0, 0, 0], radius: 40 }],
    lanterns: lamps([[0, 0, 25], [23.8, 0, 7.7], [14.7, 0, -20.2], [-14.7, 0, -20.2], [-23.8, 0, 7.7]]),
    moteSpawns: [...ring(12, 8), ...ring(33, 16)], shadeSpawns: ring(37, 12, 15),
    shadeInterval: 480, shadeCap: 6, pads: [], charms: [], bounds: [-45, 45, -45, 45]
  },
  2: {
    night: 2, name: 'Đảo Cau', spawn: [0, 0, 0],
    story: 'Ông Đăng: “Hai bờ sương đang chờ nhau. Cầu tre dẫn lối, bục gió đưa con bay; nhớ giữ đom đóm khỏi Gió Lạc.”',
    islands: [{ center: [0, 0, 0], radius: 28 }, { center: [70, 0, 0], radius: 28 }],
    bridge: { xMin: 26, xMax: 44, zMin: -2, zMax: 2 },
    lanterns: lamps([[0, 0, 20], [17, 0, -10], [-17, 0, -10], [70, 0, 20], [87, 0, -10], [53, 0, -10]]),
    moteSpawns: [0, 70].flatMap(x => [...ring(10, 4, 0, [x, 0, 0]), ...ring(22, 8, 0, [x, 0, 0])]),
    shadeSpawns: [0, 70].flatMap(x => ring(26, 8, 22.5, [x, 0, 0])), shadeInterval: 420, shadeCap: 8,
    pads: [{ pos: [20, 0, 18], radius: 1, vy: 14, speed: 24, target: [70, 0, 0] }, { pos: [50, 0, -18], radius: 1, vy: 14, speed: 24, target: [0, 0, 0] }],
    charms: [{ id: 'C1', pos: [35, 0, 0] }], bounds: [-32, 102, -32, 32]
  },
  3: {
    night: 3, name: 'Đảo Chuông',
    // Ticket specifies no N3 start. Spawn on tier 0 outside the solid tower.
    spawn: [0, 0, -10],
    story: 'Ông Đăng: “Tiếng chuông sẽ đánh thức bình minh. Men theo dốc lên tầng cao, nghe lá báo gió và giữ ngọn lửa cuối cùng.”',
    islands: [{ center: [0, 0, 0], radius: 45 }],
    lanterns: lamps([[0, 6, 6], [18, 3, 10], [-18, 3, 10], [35, 0, -10], [-35, 0, -10], [20, 0, -35], [-20, 0, -35]]),
    moteSpawns: [...ring(34, 18), ...Array.from({ length: 8 }, (_, i) => { const a = (20 + i * 20) * Math.PI / 180; return [18 * Math.cos(a), 3, 18 * Math.sin(a)]; }), ...ring(5, 4, 45, [0, 0, 0], 6)],
    shadeSpawns: ring(43, 16), shadeInterval: 360, shadeCap: 10,
    pads: [{ pos: [0, 3, 13], radius: 1, vy: 12, speed: 8, target: [0, 3, 0] }],
    charms: [{ id: 'C1', pos: [30, 0, 25] }, { id: 'C2', pos: [-30, 0, 25] }],
    ramps: [30, 150].map(angle => ({ angle, width: 3, inner: 24, outer: 30, height: 3 })),
    tower: { pos: [0, 6, 0], radius: 2, height: 8 }, bounds: [-49, 49, -49, 49]
  }
};

export function worldFor(night) {
  if (!WORLDS[night]) throw new RangeError('night must be 1, 2 or 3');
  return structuredClone(WORLDS[night]);
}
export function onLand(world, x, z) {
  if (world.islands.some(i => Math.hypot(x - i.center[0], z - i.center[2]) <= i.radius + 1e-9)) return true;
  const b = world.bridge;
  return !!b && x >= b.xMin && x <= b.xMax && z >= b.zMin && z <= b.zMax;
}
export function rampAt(world, x, z) {
  for (const r of world.ramps ?? []) {
    const a = r.angle * Math.PI / 180, u = x * Math.cos(a) + z * Math.sin(a), v = -x * Math.sin(a) + z * Math.cos(a);
    if (u >= r.inner - 1e-9 && u <= r.outer + 1e-9 && Math.abs(v) <= r.width / 2 + 1e-9) return { ...r, y: (r.outer - u) / (r.outer - r.inner) * r.height };
  }
  return null;
}
export function terrainHeight(world, x, z) {
  if (!onLand(world, x, z)) return null;
  if (world.night !== 3) return 0;
  const radius = Math.hypot(x, z), ramp = rampAt(world, x, z);
  if (ramp) return ramp.y;
  if (radius <= 8 + 1e-9) return 6;
  if (radius >= 12 - 1e-9 && radius <= 24 + 1e-9 && z > 0) return 3;
  return 0;
}
export function towerBlocks(world, pos) {
  const t = world.tower;
  return !!t && Math.hypot(pos[0] - t.pos[0], pos[2] - t.pos[2]) < t.radius && pos[1] < t.pos[1] + t.height;
}
