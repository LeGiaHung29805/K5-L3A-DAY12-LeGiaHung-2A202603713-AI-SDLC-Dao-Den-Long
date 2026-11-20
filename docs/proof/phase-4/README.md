# Phase 4 — bằng chứng chạy thật

- npm run verify: 73/73, không skip. npm run evidence: 19 lần CLI chạy thật. Tất cả 19 JSONL trùng từng byte với Phase 3. Xem regression/summary.json, tests.txt và JSONL.
- node scripts/bench.mjs --seed 42 --duration 30 --out bench.json --no-open: exit 0. Intel UHD Graphics, Windows 10, browser tích hợp, viewport/canvas 1280×720. Seed 42, 30 giây sau warmup 3 giây. 2341 frames, 78,03 FPS (đạt ≥60), 1% low 14,77 (chưa đạt ≥30), P95 21 ms, load 22,86 s (chưa đạt ≤10 s, có chờ mở tab thủ công). Bản web báo RSS null và vsync_off false. Raw dt/hash nằm ở gốc repo. benchmark.jpg là kết quả cuối.
- bench-concurrent.json đo trong lúc game chạy tab khác. preliminary-clockwise-bench.json là phép đo trước khi sửa hướng camera. Hai mẫu đó phục vụ truy vết, không dùng làm kết quả cuối.
- npm run soak -- --seed 7 --nights 10 --out soak.json: exit 0, 10 kết quả, 0 crash, RSS 28,38→29,59 MiB (+4,25%). Khai rõ cờ JITless trong contract/ADR. Lần chạy dùng JIT ban đầu vượt 20%.
- QA browser: E châm dầu (+10 điểm, dùng 2 đom đóm), W/Space/Q; báo trùng KeyS, lưu KeyI qua reload, khôi phục mặc định. Cỡ chữ tính từ DOM ở HUD 1280×720 tối thiểu 18px (font-audit.json), chữ thân trong Settings lớn 22,5px và lưu cùng giảm chuyển động. Kiểm tra cảnh báo spawn/mũi tên ngoài màn hình, 10 giây cuối, dầu yếu, gió Đêm 3. near-loss có form lưu và bản ghi vẫn hiện sau reload; CLI xuất bản ghi thật (leaderboard-export.json). Đêm 3 campaign đạt 5/7, vẫn chơi ở 00:04, tới 00:00 hiện Bình Minh và form nhập tên (830 điểm).
- Demo ghi gameplay thật trong fixture refuel, cảnh benchmark quay riêng ở lượt sơ bộ có ghi nhãn và slide số liệu cuối. Video không dùng để tính FPS chính thức.
- Chưa xác minh ngưỡng hiệu năng trên máy giảng viên hoặc hidden tests.

## Kiểm tra lại sau khi sửa lệnh mở browser trên Windows

Lệnh cũ qua `cmd start` cắt query string tại dấu `&`. Gọi URL handler trực tiếp giữ đủ mã phiên, seed và thời lượng. Hai lượt dưới đây dùng WebGL thật trên Intel UHD, seed 42, warmup 3 giây và đo 30 giây. Hash SHA-256 của mỗi mảng frame time khớp báo cáo.

| Cách chạy | Viewport | FPS trung bình | 1% low | Load | Kết quả |
|---|---:|---:|---:|---:|---|
| Tự mở Chrome sau khi sửa | 1920×922 | 127,43 | 71,31 | 0,84 s | Đạt ba ngưỡng trên canvas 1280×720. Viewport lớn hơn kích thước ticket nên dùng làm bằng chứng sửa launcher. |
| Mở browser tích hợp ở foreground, `--no-open` | 1280×720 | 92,67 | 30,06 | 21,26 s | Hai ngưỡng FPS đạt ở đúng viewport. Load tính cả thời gian đợi công cụ mở tab và vượt 10 s. |

- Tự mở Chrome: [kết quả](bench-retest-auto.json) · [raw frame times](bench-retest-auto.frames.json).
- Đúng viewport: [kết quả](bench-retest-1280.json) · [raw frame times](bench-retest-1280.frames.json).

## Đo lại với URL ngắn và cập nhật trạng thái ít hơn

Khi chạy `--no-open`, mở đường dẫn gốc của máy chủ benchmark để vào phiên đo. Đường dẫn này chuyển sang URL có mã phiên. Đồng hồ vẫn tính từ lúc tiến trình benchmark bắt đầu. Ở hai lượt cuối, phần tiến độ cập nhật tối đa bốn lần mỗi giây. Cảnh vẫn render mọi khung hình và giữ 200 Bóng Mực, 100 đom đóm, ánh sáng và chuyển động camera theo ticket.

| Lượt | Viewport | FPS trung bình | 1% low | Load | Dữ liệu |
|---|---:|---:|---:|---:|---|
| Mở URL đã in ngay khi sẵn sàng | 1280×720 | 92,77 | 46,71 | 11,52 s | [Kết quả](bench-retest-1280-fast-open.json) · [raw](bench-retest-1280-fast-open.frames.json) |
| Mở URL ngắn | 1280×720 | 57,97 | 34,90 | 10,46 s | [Kết quả](bench-retest-1280-short-url.json) · [raw](bench-retest-1280-short-url.frames.json) |
| Mở URL ngắn, cửa sổ sẵn sàng | 1280×720 | 50,33 | 32,34 | 7,97 s | [Kết quả](bench-retest-1280-under10.json) · [raw](bench-retest-1280-under10.frames.json) |
| URL ngắn và giảm cập nhật bảng tiến độ | 658×622 | 73,17 | 35,54 | 4,03 s | [Kết quả](bench-retest-compact-viewport.json) · [raw](bench-retest-compact-viewport.frames.json) |
| URL ngắn và giảm cập nhật bảng tiến độ | 1280×720 | 58,20 | 33,08 | 42,88 s | [Kết quả](bench-retest-1280-overlay.json) · [raw](bench-retest-1280-overlay.frames.json) |

Mỗi ngưỡng đã đạt ít nhất một lần ở 1280×720. Chưa có một lượt ở đúng kích thước đạt cả ba ngưỡng. Lượt 658×622 chỉ dùng để chẩn đoán vì kích thước viewport thực khác ticket. Mỗi mảng raw có đúng số frame đã báo, tổng thời gian 30 giây và SHA-256 khớp báo cáo.
