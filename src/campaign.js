export class Campaign {
  constructor(night = 1) { this.night = night; this.scores = {}; this.lastResult = null; }
  get total() { return Object.values(this.scores).reduce((sum, score) => sum + score, 0); }
  record(game) {
    if (game.night !== this.night || !['won', 'lost'].includes(game.state)) throw new Error('Campaign result does not match current night');
    this.lastResult = game.state;
    if (game.state === 'won') this.scores[this.night] = game.score;
    return this.total;
  }
  next() {
    if (this.lastResult !== 'won' || this.night === 3) return false;
    this.night++; this.lastResult = null; return true;
  }
}
