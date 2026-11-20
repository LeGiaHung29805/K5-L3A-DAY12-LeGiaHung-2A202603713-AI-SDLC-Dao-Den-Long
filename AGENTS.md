# Đảo Đèn Lồng — Phase 3 / Contract 1.2

- Work only in this checkout. The sibling lab repository is reference material.
- Requirements: docs/spec/phase-3.md, docs/adr/003-lantern-fuel-and-dawn.md, game.contract.json. Phase 1 is preserved at tag phase-1.
- Runtime: Node >=22. Commands: npm ci; npm run build; npm start.
- Before declaring work complete, run npm run verify and npm run evidence.
- src/core.js exports pure simulation/rules/world/campaign, shared by browser and Node.
- Fixed60Hz: outer tick keeps increasing while paused, sim_tick/timers freeze. Snapshot0 precedes input. Pause processed before counters.
- Follow the published 12-stage order. Drifter steals before shade hit; max1 flame/tick; numeric ID order. New spawns interact next tick.
- Distances: pickup/contact XZ plus height bound; pulse 3D from foot+.8; deposit/safe XZ. Do not reuse one distance rule for everything.
- Canonical map data live in src/world.js, palette in web/palette.js; renderer must not invent gameplay geometry.
- game.contract.json is the only tuning source. Never create renderer-only gameplay rules.
- Keep fixtures and raw evidence reproducible. Never edit generated JSONL or claim unrun checks.
- Update docs/notes/phase-3.md and the regression-change table for changed rules. Never overwrite Phase1/2 proof.
- Preserve previous phase tests unless a published ticket explicitly changes their requirements.
- Verification harness: scripts/verify.mjs is fail-closed; .githooks/pre-commit invokes it.
- npm run evidence emits Phase3 fixtures +19 CLI runs, fuel/drain/relight/dawn/capacity, hashes and18000-tick timing. Rebuild after fixture generation for UI QA.
- BrowserFPS: active foreground tab, actual1280x720, >=20s after2s warmup. Background/throttled or wrong-size samples are invalid. Do not claim FPS based on headless timing.
- A browser-control policy stop is a verification limit; do not bypass it with another automation mechanism. Record incomplete checks honestly.
- Do not commit secrets or node_modules/dist. Keep source, harness and evidence in Git.

- Fuel is integer 1/60 units. Stage2 burns passive+drain before out, interaction, safety, pulse and dawn checks. Raw30 is safe; rounded fuel must not drive decisions.
- No early victory/all_lit/timebonus. Dawn ceil60%+alive; death always wins priority. Capacity min20,10+2*success (including relights; excluding scenario/refuel).
