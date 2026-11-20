# Phase 2 — Acceptance criteria and interpretation

Source: Ticket-02 “Ba hòn đảo”, contract 1.1. The user's text copy omitted HTML tables; the complete visible Phase 2 tab was read in their open Chrome lab board. `phase-2-board.snapshot.txt` retains those tables; `phase-2-ticket.txt` is the pasted copy. No unpublished Phase 3/4 content was read.

## Standardization (overrides Phase 1 assumptions)

- Player 6 m/s, jump 7 m/s, gravity -20 m/s². Dash 14 m/s for 12 ticks, cooldown 90 ticks from start; airborne dash holds height; no invulnerability. Full air control except pad launch momentum.
- Carry 10. Pickup XZ <=1 and height difference <=1.5. Start 20 at distinct canonical points; every 240 gameplay ticks add one at empty point, random cap 30.
- Deposit cost 10, XZ range 2; nearest unlit, ties by id. Score on deposit (+10), not pickup. Light +100, pulse shade +5 on every hit, win floor(time)*2 + flames*50.
- Safe radius 6; shade inside at lighting moves out within 30 ticks and cannot damage during exit. This implementation projects to the boundary immediately (one tick, within 30), then holds recoil for 30 ticks.
- Pulse cost 3, radius 5 in 3D from feet+(0,.8,0) to shade center; cooldown 180 ticks. Stun 120 ticks, push 4 m over 15 ticks, walls stop push. Refresh on repeat.
- Shade speed 4 (N3 4.5), detect12 / lose18, contact XZ1 and height1.5. Hit drops floor(carried/2) on radius1.5..2.5, TTL480, cannot pick until next tick; invulnerability90. Hitting shade recoils 2m over60 ticks. Contacts ordered drifter first, shade id ascending, max one flame/tick.
- Fall when Y<-10: ignores invulnerability, loses one flame and all carried once. Wait60 ticks, respawn stationary with90 invulnerability; no pickup/contact during wait. No respawn if no flames.
- Durations 300/330/360. No flames loses before all-lit wins before dawn. All-lit wins on final timer tick if alive.

## Feature acceptance criteria (each item in Part 3)

| Item | Acceptance |
|---|---|
| 1 Gió Lạc | N2/N3 spawn at sim_tick1200,2400,… cap2, D ids; idle2/chase7; chase only carrying>=5 within15; steal min3 withinXZ1.2 once, flee240; ignores safe/invulnerability; pulse chase forces flee, pulse carrying thief drops items and reduces lifetime to120 |
| 2 Bùa Gió | Canonical C1/C2 positions; pickup applies600 ticks at7.2m/s, dash no cooldown but edge-only/never restart active dash; refresh duration; respawn2700 ticks |
| 3 Campaign | Menu → island intro with Ông Đăng → play → results → next night. N3 win shows Bình Minh, total only won nights; losing/replaying never double-counts |
| 4 Pause | Esc/P pauses; tick increases, sim_tick/timers/entities/TTL/spawn freeze. Resume/retry/settings/menu available; headless edge-triggered pause/resume tested |
| 5 Settings | Volume and mouse sensitivity adjustable and persist localStorage across reloads; unavailable storage falls back safely |
| 6 Audio | Distinct synthetic night music and pickup/light/pulse/hit/jump/dash/win/loss/spawn/countdown sounds; user gesture unlock; volume setting applies |
| 7 HUD | Flames top-left; mm:ss top-center with red blink<=30; k/n and score top-right;10-slot carry bottom-center; dash/pulse cooldown bottom-right; exact E prompt; direction to nearest unlit lamp when off-screen |
| 8 Palette | Every named material role uses exact sRGB hex from source table (web/palette.js), ambient intensity .15+.55*lit/total |

## Maps / contract acceptance

Canonical islands/lamps/spawn rings/bridge/pads/ramps/tower are in src/world.js and used by both physics and Three.js. Headless --night1,2,3; new scenario fields validated before output is truncated; snapshot arrays and player/wind fields mandatory; deterministic seed/IDs; paused snapshots/end supported. Run full21600 ticks within30s. Browser performance must be measured at1280×720 and reported with machine, not assumed from headless speed.

## Explicit choices where the ticket is silent

- N2 starts at(0,0,0). N3 starts at(0,0,-10), on tier0 outside the solid central platform/tower; ticket only specifies the N1 spawn. Scenario player.pos is always honored.
- Spawn animation lasts60 ticks; shade wander speed2, deterministic heading updated every120 ticks. These are declared tuning extensions, not missing published standard numbers.
- New night_start occurs at outer tick1, before input effects, leaving snapshot0 setup-only and score/event-free.
- Random motes use ttl_s=null; dropped motes use remaining seconds. Drifter scenario permits state_ticks_left/stolen; charms permit respawn_ticks/respawn_s and optional custom pos for reproducible tests.
- Air dash suspends vertical integration, preserving previous vertical velocity; pad horizontal velocity resumes after dash until landing.
- Mote pickup is height-limited. Deposit remains XZ-only because ticket's deposit rule gives only a radius; no extra height constraint invented.
- Dropped motes do not occupy a random spawn slot or count against the random30 cap. Pulse-dropped stolen items become available next tick, as damage drops do.
- Pause consumes button edges while paused, consistent with input state retention. Resume processes gameplay in the resumed step; entering pause does not.
- Generated IDs with the same prefix use numeric suffix order (S2 beforeS10); custom IDs otherwise use deterministic lexical order. Unavailable scenario charms without an explicit timer use their45s respawn.
