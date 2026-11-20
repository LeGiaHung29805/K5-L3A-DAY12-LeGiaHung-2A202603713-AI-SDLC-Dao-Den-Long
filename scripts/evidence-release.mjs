import { spawnSync } from 'node:child_process';
const result = spawnSync(process.execPath, ['scripts/evidence.mjs'], { stdio: 'inherit', env: { ...process.env, EVIDENCE_DIR: 'docs/proof/phase-4/regression', FIXTURE_DIR: 'tests/fixtures/phase4-regression' } });
process.exitCode = result.status ?? 1;
