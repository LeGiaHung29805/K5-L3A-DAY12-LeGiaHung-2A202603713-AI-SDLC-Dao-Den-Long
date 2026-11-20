import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { createGameServer } from './server-lib.mjs';
import { orderedEntries } from '../src/leaderboard.js';
const exportIndex = process.argv.indexOf('--export-leaderboard');
const leaderboardFile = resolve(process.env.DAO_DATA_DIR ?? '.local', 'leaderboard.json');
if (exportIndex >= 0) {
  const out = process.argv[exportIndex + 1];
  if (!out) { console.error('--export-leaderboard requires a file'); process.exitCode = 2; }
  else { let entries = []; try { entries = orderedEntries(JSON.parse(await readFile(leaderboardFile, 'utf8')).entries); } catch {} await writeFile(out, JSON.stringify({ entries }, null, 2) + '\n'); console.log(`Exported ${entries.length} entries to ${out}`); }
} else {
  const port = Number(process.env.PORT ?? 5173);
  const server = createGameServer({ root: fileURLToPath(new URL('../dist/', import.meta.url)), leaderboardFile,
    receiveVideo: process.env.DAO_DEMO_OUT ? async (data, send) => { await writeFile(process.env.DAO_DEMO_OUT, data); send(200, { ok: true }); console.log('Saved actual gameplay recording.'); } : undefined });
  server.listen(port, '127.0.0.1', () => console.log(`Đảo Đèn Lồng: http://localhost:${port}`));
}
