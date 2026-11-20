export const validPlayerName = name => typeof name === 'string' && /^[A-Za-z0-9_]{3,12}$/.test(name);
export function orderedEntries(entries) {
  return entries.filter(e => validPlayerName(e?.name) && Number.isFinite(e.score) && e.score >= 0 && Number.isInteger(e.nights_won) && e.nights_won >= 0 && e.nights_won <= 3 && typeof e.achieved_at === 'string' && Number.isFinite(Date.parse(e.achieved_at)) && Number.isSafeInteger(e.seed))
    .map(e => ({ name: e.name, score: e.score, nights_won: e.nights_won, achieved_at: e.achieved_at, seed: e.seed }))
    .sort((a, b) => b.score - a.score || Date.parse(a.achieved_at) - Date.parse(b.achieved_at)).slice(0, 10);
}
export class Leaderboard {
  constructor(storage) { this.storage = storage; this.entries = []; try { this.entries = orderedEntries(JSON.parse(storage?.getItem('dao-den-long.leaderboard') ?? '[]')); } catch {} }
  add(entry) { if (!validPlayerName(entry.name)) throw Error('Tên cần 3–12 ký tự A–Z, a–z, 0–9 hoặc _.'); if (orderedEntries([entry]).length !== 1) throw Error('Invalid leaderboard entry'); this.entries = orderedEntries([...this.entries, entry]); try { this.storage?.setItem('dao-den-long.leaderboard', JSON.stringify(this.entries)); } catch {} return this.export(); }
  export() { return { entries: [...this.entries] }; }
}
