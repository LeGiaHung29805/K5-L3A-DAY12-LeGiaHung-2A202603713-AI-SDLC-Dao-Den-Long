import { readFileSync, writeFileSync } from 'node:fs';
import { parseArgs } from 'node:util';
import { performance } from 'node:perf_hooks';
import { Game, seededRandom } from '../src/core.js';
try {
  const { values } = parseArgs({ options: { seed: { type: 'string' }, nights: { type: 'string' }, out: { type: 'string' } } });
  const seed = Number(values.seed ?? 7), count = Number(values.nights ?? 10);
  if (!Number.isSafeInteger(seed) || !Number.isSafeInteger(count) || count < 1 || count > 100 || !values.out) throw Error('Usage: --seed 7 --nights 10 --out soak.json');
  const { tuning } = JSON.parse(readFileSync(new URL('../game.contract.json', import.meta.url), 'utf8'));
  const start = performance.now(), results = []; let crashes = 0;
  let game = new Game({ tuning, seed, night: 1 }); global.gc?.(); const mem_start_mb = process.memoryUsage().rss / 1048576;
  for (let i = 0; i < count; i++) {
    try {
      const rng = seededRandom(seed + i); let move = [0, 0]; const night = i % 3 + 1;
      while (game.state === 'playing' && game.tick < tuning[`night${night}_duration_s`] * 60) {
        if (game.tick % 30 === 0) { const angle = rng() * Math.PI * 2; move = [Math.cos(angle), Math.sin(angle)]; }
        game.step({ move, jump: rng() < .05, dash: rng() < .03, pulse: rng() < .02, interact: rng() < .1 });
      }
      results.push({ night, seed: seed + i, state: game.state, reason: game.events.find(e => e.name === 'game_over')?.data.reason ?? 'time_limit', ticks: game.tick, score: game.score });
    } catch (error) { crashes++; results.push({ night: i % 3 + 1, seed: seed + i, error: error.message }); }
    // Reset also after the final result; retain just one fresh world at measurement.
    game = new Game({ tuning, seed: seed + i + 1, night: (i + 1) % 3 + 1 }); global.gc?.();
  }
  global.gc?.();
  const result = { nights: count, crashes, results, mem_start_mb, mem_end_mb: process.memoryUsage().rss / 1048576, duration_s: (performance.now() - start) / 1000 };
  writeFileSync(values.out, JSON.stringify(result, null, 2) + '\n');
  const passed = results.length === count && crashes === 0 && result.mem_end_mb <= 1.2 * mem_start_mb;
  console.log(`Soak ${passed ? 'PASS' : 'FAIL'}: ${results.length} results, ${crashes} crashes; RSS ${mem_start_mb.toFixed(2)} → ${result.mem_end_mb.toFixed(2)} MiB`);
  process.exitCode = passed ? 0 : 1;
} catch (e) { console.error(e.message); process.exitCode = 2; }
