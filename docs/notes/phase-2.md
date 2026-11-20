# Phase2 — Nhật ký, thay đổi và đánh giá

Lê Gia Hưng ·2A202603713. Nguồn: Ticket-02, contract1.1. Người dùng yêu cầu tiếp Phase2 trên repo hiện tại, gồm commit/tag/push như Phase1.

## Làm rõ yêu cầu

Bản text người dùng dán mất hai bảng HTML. Ban đầu AI yêu cầu bổ sung; người dùng gửi lại. Sau đó tìm thấy tab Chrome lab board đang mở tại#p2, đọc đúng tab Phase2 và lưu DOM snapshot chứa bảng. Nhờ vậy số chuẩn và RGB được dùng từ nguồn thật; không lấy số0 từ mẫu PRD-0, không tự đoán số chuẩn. Không mở Phase3/4 đang khóa.

Acceptance trước triển khai: docs/spec/phase-2.md. Tuning trong game.contract.json; tất cả điểm/bản đồ/physics dùng cùng core. Giữ tag/proof Phase1, không viết lại lịch sử.

## Test hồi quy nào thay và tại sao

| Phase1 | Phase2 / lý do từ ticket |
|---|---|
| Carry12; pickup1.3, không chênh cao | Carry10; XZ1+height1.5, test cập nhật ranh giới |
| Điểm khi nhặt | Chỉ điểm khi nạp; test pickup=0, deposit amount×10 |
| Đèn200, stun25, flamebonus100 |100/5/50; CLI gần-thắng từ738 thành588 |
| Pulse XZ6, đẩy ngay3, stun3s, CD1s | 3D5 từ foot+.8; đẩy4 trong15tick, stun120, CD180 |
| Stun lại không điểm | +5 mỗi bóng mỗi lần trúng, kể cả đang choáng |
| Drop25% biến mất, invuln120 | Dropfloor(carried/2) có TTL480/nhặt lại; invuln90 |
| Rào đảo42, không rơi | Đảo40 và Y<-10 mất lửa/đồ, hồi sinh60tick; thay test boundary bằng fall |
| Shade1.6, initial3, thêm ở600 | Speed4/N3 4.5, detect12/lose18, initial0;2ở300, rồi300+intervalk |
| Chỉ5 đèn vànight1 | Canonical5/6/7; CLI1/2/3, testnight4 invalid thay vìnight2 invalid |
| Events đầu tick có thể làpickup | Có night_start tại tick1; test bỏ qua event mới khi đang kiểm tra thứ tự gameplay cũ, test riêng lifecycle |

Các kiểm tra giữ: tick0 không điểm/effect, fixed60Hz, normalized diagonal/yaw, frame partial/edge, nhảy, capacity, deposit từng phần/nearest/tie/lit-once, không đủ pulse không kích hoạt, thắng/thua/bonus-once, byte determinism, schema lỗi/mã2, snapshot/end.

## Kiến trúc và harness

Tách src/core.js thành interface xuất simulation/rules/world; thêm campaign độc lập. Renderer dùng world.js, không tự dựng collider khác. Tách audio/settings/input buffer ra module để kiểm thử thuần. Palette đúng từng role. UpdateAGENTS,verify,pre-commit,CI. verify syntax-check frontend rồi test/build; evidence ghi Phase2 riêng, không đè Phase1. Không dùng subagent hay công cụ gửi tin nhắn ra ngoài.

## Lỗi phát hiện và cách xử lý

- Chưa đủ số liệu: đọc bảng gốc trên tab có sẵn thay vì tự đoán; lưu nguồn.
- Script evidence rơi kiểm tra snapshot60 trong khi hồi sinh xảy ra61: giữ đúng mô hình snapshot theo chu kỳ, tăng ca kiểm chứng tới70 để quan sát sau hồi sinh; không sửa output.
- Review code phát hiện callback mở cài đặt có thể bỏ qua event của một bước gameplay. Đổi sang queue pause và chỉ mở settings khi nhận eventpaused, không âm thầm advance logic.
- Bổ sung test S2/S10 để chốt thứ tự số của ID khi nhiều bóng cùng chạm.
- Review thêm trường hợp giữ phím khi hồi sinh: bảo đảm tick vừa hồi sinh đặt đúng điểm xuất phát, vận tốc0; chỉ nhận di chuyển từ tick kế tiếp. Test rơi/hồi sinh kiểm tra cả trường hợp này.
- FPS sample từ tab Chrome nền bị throttle khoảng1frame/s và kích thước nội dung đọc được1600×900, không phải1280×720. Không dùng mẫu này kết luận hiệu năng. Thêm điều kiện visibility/focus/dimensions/thời gian vào bộ đo để không báo đạt mẫu sai.
- Khi thử đưa cửa sổ game ra trước, Computer Use tự dừng vì không xác định chắc URL cửa sổ Windows để áp dụng chính sách. Dừng browser automation, không dùng cơ chế khác để vượt chặn. Chỉ tiếp tục các lệnh code/test/CI không điều khiển trình duyệt.

## Kết quả và giới hạn

48/48 test,20 processCLI thật, full routes thắng5/6/7 đèn trên bản đồ chuẩn. Route2 dùng bục nhảy; route3 đi dốc, qua tầng1 rồi bục lên tầng2; motes đặt10 tại mỗi đèn và tắtrandomfoes là scenario có kiểm soát, **không phải** thắng world ngẫu nhiên mặc định. Benchmark21600tick có invulnerability và tắtwind để không chết sớm, vẫn giữ spawn NPC; đầy đủ21600 bước, giới hạn30s được assert. Hash/CPU/timing thực ởsummary.json.

Đã quan sát browser menu, giới thiệu Ông Đăng và world/HUD Đảo Cau. Chưa hoàn tất browserQA luồng cả3 Đêm, nghe âm thanh thực, thao tác/persistence settings quaUI và đo30FPS1280×720. Những phần logic có test nhưng không thay thế QA trực tiếp. **DoD chưa được xác nhận đầy đủ do mốcFPS và QA giao diện còn lại.** Không có reviewer độc lập; đây là tự kiểm tra của người viết. CIheadless không thay thế QA/FPS.

## Token / retro

Không có telemetry chính thức; ước tính thủ công cả lượt Phase2 khoảng30.000–50.000token, độ tin cậy thấp. Không có số tiền billing để ghi. Tái sử dụng Node/Three.js, không thêm dependency; logic thuần và fixtures dùng lại chobrowser/CLI; đọc bảng gốc một lần, lưu để truy vết.

Bài học: copy văn bản có thể mất bảng; kiểm tra dữ liệu gốc sớm. Đo hiệu năng phải xác nhận tabforeground/kích thước trước; tốc độheadless không phản ánhGPU. Nếu làm lại sẽ xác minh kênh đoFPS trước khi thay nhiềuUI và dùng bảng acceptance nhỏ để phân biệt implemented/tested/visuallyverified.
