export class InputBuffer {
  constructor() { this.held = new Set(); this.pending = new Set(); }
  down(code, repeated = false) { if (!repeated) { this.held.add(code); if (['Space', 'KeyE', 'KeyQ', 'ShiftLeft', 'ShiftRight', 'KeyP', 'Escape'].includes(code)) this.pending.add(code); } }
  up(code) { this.held.delete(code); }
  clear() { this.held.clear(); this.pending.clear(); }
  frame(previous, yaw) {
    const h = this.held;
    const result = { move: [Number(h.has('KeyA')) - Number(h.has('KeyD')), Number(h.has('KeyW') || h.has('ArrowUp')) - Number(h.has('KeyS') || h.has('ArrowDown'))], cam_yaw_deg: yaw * 180 / Math.PI };
    for (const [action, codes] of Object.entries({ jump: ['Space'], interact: ['KeyE'], pulse: ['KeyQ'], dash: ['ShiftLeft', 'ShiftRight'], pause: ['KeyP', 'Escape'] })) {
      const queued = codes.find(code => this.pending.has(code));
      if (queued) { result[action] = !previous[action]; if (result[action]) for (const code of codes) this.pending.delete(code); }
      else result[action] = codes.some(code => h.has(code));
    }
    return result;
  }
}
