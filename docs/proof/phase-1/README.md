# Bằng chứng Phase 1

Tái tạo: `npm run verify` rồi `npm run evidence`. JSONL không sửa tay. summary.json có lệnh, hash SHA-256, thời gian, cấu hình máy, hash core/contract và kết quả. tests.txt là output Node test thật.

| Yêu cầu | Bằng chứng | Kết quả |
|---|---|---|
| Đảo 3D, 5 đèn, Mây nón lá/đèn nhỏ | browser-intro.jpg, browser-gameplay.jpg | Đã quan sát WebGL |
| Tốc độ, camera, chuẩn hóa, giữ input | tests/core.test.js | Test tự động |
| Nhảy, chỉ kích hoạt cạnh nhấn | tests/core.test.js | Test tự động |
| Nhặt/capacity/điểm | Test boundary, UI W: 4 con/40 điểm | Test và UI |
| Nạp một phần, thắp đèn | Test deposit, win.jsonl, full-route.jsonl | Test và CLI |
| Bóng Mực đuổi, sát thương, miễn thương | Test shade speed/damage, loss.jsonl | Test và CLI |
| Tỏa sáng/cost/push/stun/cooldown | pulse.jsonl, tests, UI Q: 4→1 | Test, CLI, UI |
| Vùng sáng an toàn | Test lit/unlit exclusion | Test tự động |
| Thắng đầy đủ 5 đèn | full-route.jsonl | Lộ trình input hợp lệ |
| World mặc định thắng với kẻ địch | default-world.inputs.json → default-world.jsonl | Autoplayer không sửa state |
| Thắng và bonus | win.jsonl, browser-win.jpg | CLI và UI |
| Thua hết lửa/bình minh | loss.jsonl, test dawn, browser-loss.jpg | CLI, test và UI |
| Chơi lại | UI near-win: replay về 4/5, 10 con, 0 điểm | Đã quan sát |
| Tick 0, k+1, snapshot/end | core.test.js, cli.test.js | Test tự động |
| Seed và id tất định | seed-a.jsonl = seed-b.jsonl, hash summary | Giống từng byte |
| Scenario không điểm setup, random false | core.test.js | Test tự động |
| Định dạng sai: stderr/mã 2 | cli.test.js gọi process thật | Test tự động |
| Headless không cần GPU | CLI chỉ Node, không import Three.js | Đã chạy trên Windows |

## QA trình duyệt

20/11/2026, trình duyệt tích hợp Codex trên Windows, viewport khoảng 580×622. Không sửa state qua DevTools, không gọi hàm thắng giả.

1. `/`: world 3D và màn đầu; Bắt đầu rồi W khoảng 1.1 s nhặt 4 con/40 điểm. Sau sửa buffer phím, Q nhanh còn 1 con, hiện cooldown.
2. `/?scenario=near-win`, ghi nhãn rõ: Bắt đầu, 4/5 đèn/10 con/0 điểm; E → 5/5, màn thắng. Điểm tùy thời gian chờ E. Replay reset đúng scenario.
3. `/?scenario=near-loss`: bắt đầu, bị INK chạm, hết lửa, màn thua/replay.
4. Esc mở hướng dẫn/tạm dừng. Console error log rỗng ở lần đọc sau thắng/thua.

Near-win là scenario có 4 đèn sáng sẵn, không phải chơi trọn màn. full-route thắp cả năm từ đầu (random kẻ địch tắt theo scenario); default-world chơi seed 2026 với sinh ngẫu nhiên và kẻ địch mặc định. Cả hai dùng input công khai và core thật.

## Giới hạn

Chưa chạy test ẩn, chưa đo FPS chuẩn, chưa chạy native macOS/Linux trong phiên Windows. CI được cấu hình nhưng phải quan sát run thực mới kết luận. Chưa có reviewer độc lập. Video/Release cuối thuộc Phase 4.
