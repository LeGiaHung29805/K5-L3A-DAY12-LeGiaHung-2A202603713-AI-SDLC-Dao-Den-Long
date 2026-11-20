import test from 'node:test';
import assert from 'node:assert/strict';
import { Campaign } from '../src/campaign.js';
import { Settings } from '../web/settings.js';
import { InputBuffer } from '../web/input.js';
test('campaign sums only won nights, loss/replay never double-counts, dawn followsnight3', () => {
  const c = new Campaign(); assert.equal(c.next(), false); assert.equal(c.record({ night: 1, state: 'lost', score: 99 }), 0);
  c.record({ night: 1, state: 'won', score: 500 }); c.record({ night: 1, state: 'won', score: 500 }); assert.equal(c.total, 500);
  assert.equal(c.next(), true); c.record({ night: 2, state: 'lost', score: 200 }); assert.equal(c.total, 500);
  c.record({ night: 2, state: 'won', score: 600 }); c.next(); c.record({ night: 3, state: 'won', score: 700 }); assert.equal(c.total, 1800); assert.equal(c.next(), false);
});
test('settings persist volume/sensitivity across new sessions and survive denied/corruptstorage', () => {
  const data = new Map(), storage = { getItem: k => data.get(k), setItem: (k, v) => data.set(k, v) };
  const a = new Settings(storage); a.set({ volume: .6, sensitivity: 1.75, accessiblePalette: true }); assert.deepEqual(new Settings(storage).value, { volume: .6, sensitivity: 1.75, accessiblePalette: true });
  storage.setItem('dao-den-long.settings', '{'); assert.doesNotThrow(() => new Settings(storage));
  const denied = new Settings({ getItem() { throw Error(); }, setItem() { throw Error(); } }); assert.doesNotThrow(() => denied.set({ volume: 0 }));
});
test('buffer preserves quickactiontap, forces release edge before re-press, ignoresrepeat', () => {
  const b = new InputBuffer(); b.down('KeyQ'); b.up('KeyQ'); const first = b.frame({}, 0); assert.equal(first.pulse, true);
  b.down('KeyQ'); b.up('KeyQ'); const release = b.frame(first, 0); assert.equal(release.pulse, false); assert.equal(b.frame(release, 0).pulse, true);
  b.clear(); b.down('KeyQ', true); assert.equal(b.frame({}, 0).pulse, false);
});
