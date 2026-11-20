# Phase 4 — bằng chứng chạy thật

- npm run verify: 73/73, không skip. npm run evidence: 19 lần CLI chạy thật. Tất cả 19 JSONL trùng từng byte với Phase 3. Xem regression/summary.json, tests.txt và JSONL.
- node scripts/bench.mjs --seed 42 --duration 30 --out bench.json --no-open: exit 0. Intel UHD Graphics, Windows 10, browser tích hợp, viewport/canvas 1280×720. Seed 42, 30 giây sau warmup 3 giây. 2341 frames, 78,03 FPS (đạt ≥60), 1% low 14,77 (chưa đạt ≥30), P95 21 ms, load 22,86 s (chưa đạt ≤10 s, có chờ mở tab thủ công). Bản web báo RSS null và vsync_off false. Raw dt/hash nằm ở gốc repo. benchmark.jpg là kết quả cuối.
- bench-concurrent.json đo trong lúc game chạy tab khác. preliminary-clockwise-bench.json là phép đo trước khi sửa hướng camera. Hai mẫu đó phục vụ truy vết, không dùng làm kết quả cuối.
- npm run soak -- --seed 7 --nights 10 --out soak.json: exit 0, 10 kết quả, 0 crash, RSS 28,38→29,59 MiB (+4,25%). Khai rõ cờ JITless trong contract/ADR. Lần chạy dùng JIT ban đầu vượt 20%.
- QA browser: E châm dầu (+10 điểm, dùng 2 đom đóm), W/Space/Q; báo trùng KeyS, lưu KeyI qua reload, khôi phục mặc định. Cỡ chữ tính từ DOM ở HUD 1280×720 tối thiểu 18px (font-audit.json), chữ thân trong Settings lớn 22,5px và lưu cùng giảm chuyển động. Kiểm tra cảnh báo spawn/mũi tên ngoài màn hình, 10 giây cuối, dầu yếu, gió Đêm 3. near-loss có form lưu và bản ghi vẫn hiện sau reload; CLI xuất bản ghi thật (leaderboard-export.json). Đêm 3 campaign đạt 5/7, vẫn chơi ở 00:04, tới 00:00 hiện Bình Minh và form nhập tên (830 điểm).
- Demo ghi gameplay thật trong fixture refuel, cảnh benchmark quay riêng ở lượt sơ bộ có ghi nhãn và slide số liệu cuối. Video không dùng để tính FPS chính thức.
- Chưa xác minh ngưỡng hiệu năng trên máy giảng viên hoặc hidden tests.
