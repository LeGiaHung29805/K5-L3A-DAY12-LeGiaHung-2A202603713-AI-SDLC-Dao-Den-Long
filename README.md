# Đảo Đèn Lồng · Ba hòn đảo

**Lê Gia Hưng · MSSV 2A202603713 · Day 12 AI SDLC · Phase 2 · Test Contract 1.1**

Cùng Mây gom đom đóm, thắp đèn trên **Đảo Bến → Đảo Cau → Đảo Chuông**, tránh Bóng Mực và Gió Lạc, rồi đón Bình Minh. Game web 3D dùng Three.js; browser và headless dùng chung simulation thuần JavaScript60Hz.

**Trạng thái kiểm chứng:**48 test +20 lượt CLI có bằng chứng thô. Có lộ trình thắp đủ5/6/7 đèn và đo21600 tick. **Mốc ≥30FPS ở1280×720 chưa được xác minh**: browser QA bị dừng khi công cụ không xác định chắc URL cửa sổ Windows. Không coi mẫu FPS từ tab nền/sai kích thước là đạt. Chi tiết ở [bằng chứng Phase2](docs/proof/phase-2/README.md).

## Cài và chạy — 3 lệnh

Cần Node.js22+ và trình duyệt hỗ trợ WebGL2. Dùng cùng ba lệnh trên Windows/macOS/Linux:

```sh
npm ci
npm run build
npm start
```

Mở **http://localhost:5173**. Sau build không cần Internet/CDN/API key. `dist/` là bản web tĩnh tự chứa thư viện và license. Dev: `npm run dev`; sửa source thì build lại rồi refresh. Đổi cổng macOS/Linux: `PORT=8080 npm start`; PowerShell: `$env:PORT=8080` rồi `npm start`.

## Chơi như thế nào

| Phím / thao tác | Hành động |
|---|---|
| WASD, ↑/↓ | Đi theo camera |
| Space | Nhảy khi chạm đất |
| Shift | Lướt14m/s trong0,2s, hồi1,5s từ lúc bắt đầu |
| E | Nạp ánh sáng vào đèn chưa sáng gần nhất trong2m |
| Q | Tỏa Sáng: tốn3 đom đóm, hồi3s |
| Kéo chuột, ←/→ | Xoay camera |
| Esc / P / ? | Tạm dừng; Tiếp tục / Chơi lại Đêm / Cài đặt / Về menu |
| ⚙ | Âm lượng, độ nhạy chuột; tự lưu giữa các lần mở |

Tự nhặt trong1m, chênh cao≤1,5m; mang tối đa10 con. Một đèn cần10, nạp từng phần được. Bóng Mực bị chặn bởi vùng sáng6m nhưng Gió Lạc vẫn bay vào. Tỏa Sáng đo3D từ chân Mây+0,8m, bán kính5m; choáng2s, đẩy4m trong0,25s. Không bất tử khi Lướt.

Thắp hết đèn thì thắng; hết3 ngọn lửa hoặc hết giờ thì thua. Bị Bóng Mực chạm mất1 lửa, rơi nửa số đang mang: nhặt lại được trong8s, bất tử1,5s. Rơi xuốngY<-10 mất1 lửa và toàn bộ đom đóm, chờ1s hồi sinh; rơi bỏ qua bất tử. Đèn sáng đủ đúng tick bình minh vẫn thắng nếu còn lửa.

Menu → giới thiệu tên đảo và lời Ông Đăng → chơi → kết quả → Đêm kế tiếp. Thua chơi lại đúng Đêm đó. Thắng Đêm3 hiện **Bình Minh** và tổng điểm các Đêm đã thắng; replay không cộng trùng.

## Ba bản đồ chuẩn

| Đêm | Bản đồ / thời gian |
|---|---|
| 1 · Đảo Bến | Đảo tròn40m,5 đèn,300s |
| 2 · Đảo Cau | Hai đảo28m, tâm cách70m; cầu tre không lan can,2 bục nhảy;6 đèn,330s |
| 3 · Đảo Chuông | Đảo45m, tầngY0/3/6,2 dốc30°/150°, bục gió, tháp chuông;7 đèn,360s; gió mạnh mỗi30s |

Đêm2/3 có **Gió Lạc** cướp tối đa3 con khi Mây mang≥5; pulse trúng lúc nó bỏ chạy có đồ sẽ làm nó thả lại. **Bùa Gió** đỏ viền vàng cho10s chạy7,2m/s, Lướt không hồi nhưng vẫn cần nhấn lại; bùa hồi45s. Đêm3 có lá bay và âm báo trước gió2s.

## Điểm chuẩn Phase2

- +10 mỗi đom đóm **nạp**; nhặt không cộng điểm.
- +100 mỗi đèn vừa thắp.
- +5 mỗi Bóng Mực trúng pulse mỗi lần, kể cả đang choáng.
- Thắng: `floor(time_left_s)*2 + flames*50`, một lần mỗi Đêm.
- Tổng hành trình chỉ gồm điểm các Đêm thắng.

## Kiểm chứng và headless

```sh
npm run verify
npm run evidence
node src/headless.mjs --seed 2026 --night 2 --ticks 1200 --out night2.jsonl
```

`verify`: syntax-check renderer/controller/audio,48 test logic/CLI/campaign/settings/input và static build. Hook pre-commit chạy fail-closed. `evidence`:20 process CLI thật, scenario/input/output, hashes, full routes và benchmark; không sửa tay JSONL. CI Ubuntu/macOS chạy install/verify/evidence/build và tải artifact bằng chứng.

Ví dụ pause/resume với input công khai:

```sh
node src/headless.mjs --seed 2026 --night 2 --scenario tests/fixtures/phase2/pause.json --inputs tests/fixtures/phase2/pause.inputs.json --ticks 180 --snapshot-every 10 --out pause.jsonl
```

- Contract ở `game.contract.json`; tuning là nguồn số liệu duy nhất. `--night` nhận1/2/3. CLI không mở cửa sổ, không dùng GPU, không import Three.js.
- Snapshot0 sau scenario trước input, không điểm/sự kiện setup. Inputk tạo event tại outer tickk+1. Input thiếu trường giữ nguyên; jump/interact/pulse/dash/pause kích hoạt false→true.
- Khi paused: tick tăng, sim_tick/timer/cooldown/TTL/spawn đứng yên. Resume chạy gameplay trong bước vừa tiếp tục.
- Tuân thứ tự12 bước của ticket. Gió Lạc cướp trước shade hit. Sinh mới chỉ tương tác tick sau. Hết lửa → đủ đèn → dawn.
- Snapshot có night/wind, player.vel/grounded/invuln/cooldowns/charm; đủ motes(kind,ttl_s)/drifters/charms. Chỉ tọa độ làm tròn3 chữ số.
- Scenario v1.0 vẫn hỗ trợ; bổ sung counters/state_ticks_left/drifters/charms/flags củav1.1. Lỗi JSON/schema/CLI: stderr, mã2; lỗi I/O output:mã1; thành công:mã0.

## Kiểm tra giao diện và FPS

Các URL có nhãn kiểm chứng, dùng scenario qua core thật:

| URL sau localhost:5173 | Nội dung |
|---|---|
| `/?scenario=campaign` | Chuyển3 Đêm: mỗi Đêm4/5,5/6,6/7 đèn sáng sẵn,10 con; E thắp đèn cuối để kiểm tra kết quả/next/Bình Minh |
| `/?night=2&scenario=charm` | Bùa Gió ở cầu tre |
| `/?night=2&scenario=drifter` | Gió Lạc cướp; pulse để lấy lại |
| `/?night=2&scenario=pad` | Bục nhảy từ A sangB |
| `/?night=3&scenario=tiers` | Dốc lên tầng1 |
| `/?night=3&scenario=wind` | Gió và cảnh báo theo thời gian |
| `/?scenario=fall` | Hồi sinh sau rơi |
| `/?night=2&benchmark=1` | World thường Đêm2, thêm bảng đoFPS thực |

Để đo: đặt **kích thước nội dung thực1280×720**, đưa tab game ra trước, chơi ít nhất20s sau2s khởi động. Bảng đo ghi FPS trung bình, thời gian, số frame, kích thước và chỉ báo đạt khi mẫu hợp lệ. Tab nền không được tính. `benchmark=1` không đổi chất lượng render hay luật game. Hiện **chưa có mẫu đạt hợp lệ**; không dùng tốc độ headless thay choFPS.

## Sáng tạo của tôi

Giữ phong cách cổ tích low-poly, Mây đội nón lá có đèn nhỏ, đường đá và bến gỗ của Phase1. Thêm bản đồ cả hai bờ, vòng sáng an toàn, vệt Lướt, sóng pulse, dải lụa Gió Lạc, Bùa Gió và lá báo gió. Nhạc/hiệu ứng tự tổng hợp bằng Web Audio, không nhạc thương mại. Tất cả phần thêm thuần trình bày; không thay đầu ra headless hay bản đồ/số liệu chuẩn.

## Nguồn và cấu trúc

```text
src/core.js                 Public simulation interface
src/simulation.js           Pipeline60Hz, counters, collisions, spawns
src/rules.js                Validation, seed, distance rules
src/world.js                Canonical3 maps; browser/Node dùng chung
src/campaign.js             Progress và điểm các Đêm thắng
src/headless.mjs            CLI1.1
web/                        Scene, UI, palette, audio, settings, input
tests/fixtures/phase2/       Headless scenarios mới
docs/spec/phase-2.md         Acceptance từng mục và giả định
docs/notes/phase-2.md        Thay đổi, nhật ký AI, retro, giới hạn
docs/proof/phase-2/          Bằng chứng tái tạo được
```

Tag `phase-1` và [bằng chứng Phase1](docs/proof/phase-1/README.md) giữ nguyên lịch sử. Một số test cũ đổi kỳ vọng vì ticket thay luật; xem [bảng hồi quy](docs/notes/phase-2.md). Chưa đọc hay tự đoán Phase3/4. Video và Releasev1.0.0 thuộc bàn giao Phase4. [CREDITS](CREDITS.md), [MIT](LICENSE).
