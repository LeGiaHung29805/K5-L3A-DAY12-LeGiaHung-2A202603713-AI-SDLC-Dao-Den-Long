const EFFECTS = {
  pickup: [784, 1046], lantern: [523, 659, 784, 1046], pulse: [220, 330, 440], hit: [170, 110],
  jump: [440, 660], dash: [180, 540], won: [523, 659, 784, 1046, 1318], lost: [392, 330, 262, 196],
  spawn: [130, 155], countdown: [880], wind: [280, 350, 420], charm: [660, 880, 1320]
};
export class GameAudio {
  constructor(volume) { this.volume = volume; this.context = null; this.musicTimer = null; this.note = 0; }
  get volume() { return this._volume; }
  set volume(value) { this._volume = value; if (this.master) this.master.gain.setTargetAtTime(value, this.context.currentTime, .03); }
  unlock() {
    try {
      if (!this.context) { this.context = new AudioContext(); this.master = this.context.createGain(); this.master.gain.value = this.volume; this.master.connect(this.context.destination); }
      this.context.resume().catch(() => {});
    } catch { /* Audio is optional on unsupported devices. */ }
  }
  tone(frequency, time, duration, level, type = 'sine') {
    if (!this.context || this.volume <= 0) return;
    const oscillator = this.context.createOscillator(), gain = this.context.createGain();
    oscillator.type = type; oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(.0001, time); gain.gain.exponentialRampToValueAtTime(Math.max(.0001, level), time + .018);
    gain.gain.exponentialRampToValueAtTime(.0001, time + duration);
    oscillator.connect(gain); gain.connect(this.master); oscillator.start(time); oscillator.stop(time + duration);
  }
  effect(name) {
    if (!this.context) return;
    (EFFECTS[name] ?? EFFECTS.pickup).forEach((f, i) => this.tone(f, this.context.currentTime + i * .075, .19, .15, name === 'dash' ? 'triangle' : 'sine'));
  }
  startNight(night) {
    this.stopMusic(); this.unlock(); this.note = 0;
    const patterns = [[261.63, 392, 329.63, 440, 392, 329.63, 293.66, 392], [293.66, 440, 349.23, 523.25, 440, 349.23, 329.63, 440], [220, 329.63, 261.63, 392, 349.23, 293.66, 261.63, 329.63]];
    const play = () => { if (!this.context || this.volume <= 0) return; const f = patterns[night - 1][this.note++ % 8]; this.tone(f, this.context.currentTime, 1.8, .075); this.tone(f / 2, this.context.currentTime, 2.2, .045, 'triangle'); };
    play(); this.musicTimer = setInterval(play, 1100);
  }
  stopMusic() { if (this.musicTimer) clearInterval(this.musicTimer); this.musicTimer = null; }
}
