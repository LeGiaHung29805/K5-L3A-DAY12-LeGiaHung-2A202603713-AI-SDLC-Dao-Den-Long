import { readFileSync, writeSync, openSync, closeSync } from 'node:fs';
import { parseArgs } from 'node:util';
import { simulate, InputError } from './core.js';

let output;
try {
  let values;
  try {
    // Node parseArgs treats a separate negative number as an option by default.
    // The contract permits --seed <int>, including negative integers.
    const args = [];
    const raw = process.argv.slice(2);
    for (let i = 0; i < raw.length; i++) {
      if (/^--(seed|night|ticks|snapshot-every)$/.test(raw[i]) && /^-\d/.test(raw[i + 1] ?? '')) args.push(`${raw[i]}=${raw[++i]}`);
      else args.push(raw[i]);
    }
    ({ values } = parseArgs({ args, options: Object.fromEntries(['seed', 'night', 'scenario', 'inputs', 'ticks', 'out', 'snapshot-every'].map(k => [k, { type: 'string' }])) }));
  } catch (e) { throw new InputError(e.message); }
  const integer = (key, min, fallback) => {
    const v = values[key] ?? fallback;
    if (v === undefined || !/^-?\d+$/.test(v) || !Number.isSafeInteger(Number(v)) || Number(v) < min) throw new InputError(`--${key} requires an integer >= ${min}`);
    return Number(v);
  };
  const seed = integer('seed', Number.MIN_SAFE_INTEGER);
  const night = integer('night', 1);
  if (night > 3) throw new InputError('--night must be 1, 2 or 3');
  const ticks = integer('ticks', 0);
  const snapshotEvery = integer('snapshot-every', 1, '10');
  if (!values.out) throw new InputError('--out is required');
  const json = path => { try { return JSON.parse(readFileSync(path, 'utf8').replace(/^\uFEFF/, '')); } catch (e) { throw new InputError(`${path}: ${e.message}`); } };
  const contract = JSON.parse(readFileSync(new URL('../game.contract.json', import.meta.url), 'utf8'));
  const scenario = values.scenario ? json(values.scenario) : {};
  const inputs = values.inputs ? json(values.inputs) : { frames: [] };
  // Validate fully before truncating the destination.
  const { validateScenario, validateInputs } = await import('./core.js');
  validateScenario(scenario, contract.tuning, night); validateInputs(inputs);
  output = openSync(values.out, 'w');
  simulate({ tuning: contract.tuning, seed, night, scenario, inputs, ticks, snapshotEvery,
    write: row => writeSync(output, JSON.stringify(row) + '\n') });
} catch (e) {
  process.stderr.write(`${e instanceof InputError ? 'Input error' : 'Error'}: ${e.message}\n`);
  process.exitCode = e instanceof InputError ? 2 : 1;
} finally { if (output !== undefined) closeSync(output); }
