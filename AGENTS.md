# Đảo Đèn Lồng — Phase 1

- Work only in this checkout. The sibling lab repository is reference material.
- Source of requirements: docs/spec/phase-1-prd.txt and game.contract.json.
- Runtime: Node >=22. Commands: npm ci; npm run build; npm start.
- Before declaring work complete, run npm run verify and npm run evidence.
- Pure gameplay is src/core.js, shared by the browser and headless runner.
- Fixed step: 60 Hz; input tick k produces events at k+1; snapshot 0 precedes input.
- All randomness in gameplay must use the seeded generator. XZ distances include boundary.
- game.contract.json is the only tuning source. Never create renderer-only gameplay rules.
- Keep fixtures and raw evidence reproducible. Never edit generated JSONL or claim unrun checks.
- Update docs/notes/phase-1.md when interpreting ambiguous requirements.
- Preserve previous phase tests unless a published ticket explicitly changes their requirements.
- Verification harness: scripts/verify.mjs is fail-closed; .githooks/pre-commit invokes it.
- Do not commit secrets or node_modules/dist. Keep source, harness and evidence in Git.
