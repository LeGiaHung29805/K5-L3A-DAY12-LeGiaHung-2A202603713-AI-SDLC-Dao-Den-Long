import { DEFAULT_BINDINGS } from './bindings.js';
export class InputBuffer {
  constructor(bindings = DEFAULT_BINDINGS) { this.bindings = { ...bindings }; this.held = new Set(); this.pending = new Set(); }
  setBindings(bindings) { this.bindings = { ...bindings }; this.clear(); }
  codes(action) { const codes = [this.bindings[action]], alias = action === 'pause' ? 'Escape' : action === 'dash' && this.bindings.dash === 'ShiftLeft' ? 'ShiftRight' : null; if (alias && !Object.values(this.bindings).includes(alias)) codes.push(alias); return codes; }
  down(code, repeated = false) { if (!repeated) { this.held.add(code); if (['jump', 'interact', 'pulse', 'dash', 'pause'].some(a => this.codes(a).includes(code))) this.pending.add(code); } }
  up(code) { this.held.delete(code); }
  clear() { this.held.clear(); this.pending.clear(); }
  frame(previous, yaw) {
    const h = this.held;
    const b = this.bindings;
    const aliasHeld = (action, alias) => h.has(b[action]) || !Object.values(b).includes(alias) && h.has(alias);
    const result = { move: [Number(h.has(b.left)) - Number(h.has(b.right)), Number(aliasHeld('forward', 'ArrowUp')) - Number(aliasHeld('back', 'ArrowDown'))], cam_yaw_deg: yaw * 180 / Math.PI };
    for (const action of ['jump', 'interact', 'pulse', 'dash', 'pause']) { const codes = this.codes(action);
      const queued = codes.find(code => this.pending.has(code));
      if (queued) { result[action] = !previous[action]; if (result[action]) for (const code of codes) this.pending.delete(code); }
      else result[action] = codes.some(code => h.has(code));
    }
    return result;
  }
}
