# Phase2 evidence — Contract1.1

Tái tạo: `npm run verify`, `npm run evidence`. FileJSONL là output trực tiếp củaCLI. summary.json chứa hash source/contract/output, các lệnh, platform,CPU,Node,timing, kết quả cuối. tests.txt là outputNode test.

| Yêu cầu | Ca bằng chứng |
|---|---|
| Dash12tick/airlock/cooldown | dash.jsonl + fixtures/phase2/dash.inputs.json + unit tests |
| Pause outertick/sim_tick/counters/TTL | pause.jsonl; snapshot120 cósim_tick0, snapshot130 cósim_tick10 |
| Bùa600tick, boost/noCD, respawn2700 | charm.jsonl + test charm/refresh/respawn |
| Gió Lạc steal/flee/drop | drifter.jsonl; các eventdrifter_steal/drifter_drop, unit thứ tựsteal-before-hit |
| Rơi/hồi sinh/bỏ qua bất tử | fall.jsonl;1 hit duy nhất, snapshot70 hồi sinh |
| Cầu/bục Đảo Cau | pad.jsonl và route-2.jsonl |
| Dốc/vách/tầng Đảo Chuông | tiers.jsonl, tower.jsonl, route-3.jsonl |
| Gió báo trước/active5s | wind.jsonl; wind.active true ở1800, falseở2100; unit warning1680 |
| Đom đóm rơi hếtTTL/nhặt lại | dropped.jsonl, test TTL480, height/capacity |
| Schedules/IDs/caps | spawns.jsonl + tests |
| Thắng từngĐêm/scorebonus | night-1-win/2-win/3-win.jsonl |
| Đủ5/6/7 đèn từ chưa sáng | route-1/2/3.scenario.json + .inputs.json → .jsonl |
| Campaign total/replay/loss | tests/campaign-ui.test.js |
| Settings storage/persistence/corrupt/private | tests/campaign-ui.test.js; UI trực tiếp còn cần QA |
| Buffered short taps | tests/campaign-ui.test.js |
| Full21600tick ≤30s | headless-21600.jsonl + summary elapsed, scriptassert |
| Seed byte determinism | seed-a.jsonl = seed-b.jsonl; SHA-256summary |
| Regression Phase1 với luật chuẩn | tests/core.test.js + cli.test.js; bảng thay đổi docs/notes/phase-2.md |
| Màu chuẩn | web/palette.js theo bảng gốc; renderer dùngroles. Chưa kiểm traảnh từngrole |
| HUD/world Đảo Cau | Quan sát trực tiếp browser trong phiên, chưa lưu ảnh ra file trước khi công cụ bị dừng |
| ≥30FPS1280×720 | **CHƯA XÁC MINH**, xem browser-status.json |

Full route không đặt đèn sáng sẵn, giữ nguyên tọa độđèn. Motes được đặt10 tại mỗiđèn, foes/random tắt để kiểm tra traversal/deposit; input route là di chuyển/tương tác thông thường, khôngteleport/sửa state. Near-win fixtures dùng đèn sáng sẵn riêng để kiểm tra biên vàUI, được ghi nhãn rõ, không coi là chơi trọn màn.

Benchmarkfullnight có scenarioinvuln21601 vàwindfalse để đếm đủ21600tick, vẫn randommotes/shades/drifters; không dùng nó để chứng minh chiến thắng hayFPS.

BrowserQA: Chrome thực, đã thấy menu→introĐảo Cau→HUD/world. FPS trước đó bị tabnền throttle và không đúng kích thước nên không hợp lệ. Khi đưa game ra trước, Computer Use dừng vì không xác định chắcURLWindows. Chưa tiếp tục bằng công cụ khác. UI3Đêm/settings/audio/FPS cần kiểm tra tiếp; headless CI chỉ chứng minh phần có test.
