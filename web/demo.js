// Optional release evidence recorder. No simulation changes; activated only by ?record=1.
export class DemoRecorder {
  constructor(enabled) {
    if (!enabled || typeof MediaRecorder === 'undefined') return;
    this.canvas = document.createElement('canvas'); this.canvas.width = 1280; this.canvas.height = 720;
    this.ctx = this.canvas.getContext('2d'); this.chunks = [];
    this.recorder = new MediaRecorder(this.canvas.captureStream(30), { mimeType: 'video/webm', videoBitsPerSecond: 2500000 });
    this.recorder.ondataavailable = e => { if (e.data.size) this.chunks.push(e.data); };
    this.recorder.onstop = async () => { const r = await fetch('/__video', { method: 'POST', body: new Blob(this.chunks, { type: 'video/webm' }) }); console.log(`Gameplay video saved: ${r.ok}`); };
  }
  frame(view, game, mode, now) {
    if (!this.recorder || this.done || !['playing', 'result', 'dawn'].includes(mode)) return;
    this.start ??= now; const c = this.ctx;
    c.drawImage(view.renderer.domElement, 0, 0, 1280, 720);
    c.fillStyle = '#071426ee'; c.fillRect(0, 0, 1280, 115); c.fillStyle = '#F5F1E6'; c.font = '24px sans-serif';
    c.fillText('DAO DEN LONG — actual WebGL gameplay / release evidence', 20, 32);
    c.fillText(`Night ${game.night} | ${mode} | ${Math.ceil(game.timeLeft)}s | flames ${game.player.flames} | carried ${game.player.carried}/${game.capacity} | score ${game.score}`, 20, 68);
    c.fillText(`Lit lamps ${game.lanterns.filter(l => l.lit).length}/${game.lanterns.length} | E refuel / Q pulse / WASD move`, 20, 100);
    if (this.recorder.state === 'inactive') this.recorder.start(1000);
    if (now - this.start >= 25000) { this.done = true; this.recorder.stop(); }
  }
}
