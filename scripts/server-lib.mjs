import { createServer } from 'node:http';
import { readFile, stat, mkdir, writeFile } from 'node:fs/promises';
import { resolve, extname, sep, dirname } from 'node:path';
import { orderedEntries } from '../src/leaderboard.js';
const mime = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.jpg': 'image/jpeg', '.mp4': 'video/mp4' };
export function createGameServer({ root, leaderboardFile, receiveBenchmark, receiveVideo }) {
  return createServer(async (req, res) => {
    const send = (code, value) => { res.writeHead(code, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(value)); };
    try {
      const url = new URL(req.url, 'http://localhost'), pathname = decodeURIComponent(url.pathname);
      if (req.method === 'POST' && req.headers.origin && new URL(req.headers.origin).host !== req.headers.host) return send(403, { error: 'Cross-origin write denied' });
      const body = async (limit = 1_000_000) => { const chunks = []; let size = 0; for await (const part of req) { size += part.length; if (size > limit) throw Error('Request too large'); chunks.push(part); } return Buffer.concat(chunks); };
      if (pathname === '/__bench' && receiveBenchmark && req.method === 'POST') return await receiveBenchmark(JSON.parse(await body(10_000_000)), send);
      if (pathname === '/__video' && receiveVideo && req.method === 'POST') return await receiveVideo(await body(100_000_000), send);
      if (pathname === '/__leaderboard' && leaderboardFile) {
        let entries = []; try { entries = orderedEntries(JSON.parse(await readFile(leaderboardFile, 'utf8')).entries); } catch {}
        if (req.method === 'POST') {
          const entry = JSON.parse(await body());
          if (orderedEntries([entry]).length !== 1) return send(400, { error: 'Invalid entry' });
          const next = orderedEntries([...entries, entry]);
          entries = next; await mkdir(dirname(leaderboardFile), { recursive: true }); await writeFile(leaderboardFile, JSON.stringify({ entries }, null, 2) + '\n');
        } else if (req.method !== 'GET') return send(405, { error: 'Method not allowed' });
        return send(200, { entries });
      }
      const path = resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
      if (!path.startsWith(root.endsWith(sep) ? root : root + sep) || !(await stat(path)).isFile()) return send(404, { error: 'Not found' });
      res.writeHead(200, { 'Content-Type': mime[extname(path)] ?? 'application/octet-stream', 'Cache-Control': 'no-store' }); res.end(await readFile(path));
    } catch (e) { send(400, { error: e.message }); }
  });
}
