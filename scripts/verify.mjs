import { spawnSync } from 'node:child_process';
// Fail closed: a failing check prevents build/commit and yields nonzero status.
for (const args of [['--test'], ['scripts/build.mjs']]) {
  const result = spawnSync(process.execPath, args, { stdio: 'inherit' });
  if (result.status !== 0) process.exit(result.status ?? 1);
}
console.log('Verification passed: gameplay + CLI tests, static build.');
