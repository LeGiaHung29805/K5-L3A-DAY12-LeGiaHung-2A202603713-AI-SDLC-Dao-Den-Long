export const DEFAULT_SETTINGS = Object.freeze({ volume: .35, sensitivity: 1 });
export class Settings {
  constructor(storage) {
    this.storage = storage; this.value = { ...DEFAULT_SETTINGS };
    try {
      const saved = JSON.parse(storage?.getItem('dao-den-long.settings') ?? 'null');
      if (typeof saved?.volume === 'number' && Number.isFinite(saved.volume)) this.value.volume = Math.max(0, Math.min(1, saved.volume));
      if (typeof saved?.sensitivity === 'number' && Number.isFinite(saved.sensitivity)) this.value.sensitivity = Math.max(.25, Math.min(2, saved.sensitivity));
    } catch { /* Storage denied/corrupt: keep usable defaults. */ }
  }
  set(patch) {
    for (const key of ['volume', 'sensitivity']) if (key in patch && Number.isFinite(patch[key])) this.value[key] = Math.max(key === 'volume' ? 0 : .25, Math.min(key === 'volume' ? 1 : 2, patch[key]));
    try { this.storage?.setItem('dao-den-long.settings', JSON.stringify(this.value)); } catch { /* Private mode remains playable. */ }
    return this.value;
  }
}
