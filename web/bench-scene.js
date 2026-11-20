import { Game, seededRandom } from '../src/core.js';
export function createBenchmarkScene(tuning, seed) {
  const random = seededRandom(seed), point = height => { const a = random() * Math.PI * 2, r = Math.sqrt(random()) * 37; return [Math.cos(a) * r, height, Math.sin(a) * r]; };
  const motes = Array.from({ length: 100 }, () => point(0)), shades = Array.from({ length: 200 }, (_, i) => ({ id: `S${i + 1}`, pos: point(.8), state: 'wander' }));
  const game = new Game({ tuning, seed, night: 1, scenario: { random_motes: false, random_shades: false, random_drifters: false, wind_enabled: false, motes, shades, charms: [], lanterns: ['L1', 'L2', 'L3'].map(id => ({ id, lit: true, fuel: 100 })) } });
  const headings = game.shades.map(() => random() * Math.PI * 2);
  return { game, step() {
    game.tick++; game.simTick++;
    game.shades.forEach((shade, i) => { if (game.simTick % 120 === 0) headings[i] = random() * Math.PI * 2;
      game.moveShade(shade, Math.cos(headings[i]) * tuning.shade_wander_speed / 60, Math.sin(headings[i]) * tuning.shade_wander_speed / 60); shade.state = 'wander'; });
  } };
}

// Looking down +Y with north (-Z) up: +X -> -Z is counterclockwise.
export const benchmarkCamera = time => ({ pos: [30 * Math.cos(time * Math.PI * 2 / 15), 15, -30 * Math.sin(time * Math.PI * 2 / 15) || 0], target: [0, 0, 0] });
