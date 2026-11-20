# ADR 003 — Đèn có thể tắt; chỉ xét thắng tại bình minh

Ngày: 20/11/2026. Trạng thái: áp dụng cho Phase 3 / Test Contract 1.2.

## Bối cảnh

Ticket-03 “Đèn cạn dầu” thay luật đèn sáng vĩnh viễn và thắng ngay khi thắp đủ. Phải giữ compatibility cho input, physics, bản đồ, seed và pipeline không bị thay; các luật score/safety/capacity/win bị thay phải có test mới thay vì skip.

## Quyết định

Mỗi đèn có `fuelUnits` nguyên, một đơn vị = 1/60 fuel. Dầu đầy = 6000 units. Mỗi gameplay tick trừ 1 unit thụ động và 5 units cho mỗi Bóng Mực đang hút hợp lệ tại đầu bước 2. Tổng hút cộng dồn trước khi xét cạn. Xuất `fuel = round(units / 60, 1)`; mọi điều kiện, floor bonus và ceil refuel dùng số nguyên gốc, không dùng giá trị đã làm tròn.

Đèn lưu `lit`, `ever_lit`, `relit_count`, `deposited`. Unlit chưa từng sáng cần 10; unlit đã từng sáng cần 5. Thắp luôn đầy 100, tăng successful_lights một lần, còn refuel không tăng. Out giữ ever_lit nhưng xóa deposited và dầu. Scenario setup không tính lần thắp, không điểm/event. Scenario có successful_lights được dùng để khởi tạo capacity theo contract.

Input/pause trước mọi cập nhật. Tại bước 2: trừ dầu và drain, phát fuel_drain theo từng 60 tick hút liên tục của từng shade, rồi phát lantern_out nếu cạn. Fuel_drain cùng tick báo giá trị sau tổng hao hụt; có thể là 0 trước lantern_out. Pause đóng băng cả dầu lẫn cadence này. Quãng hút bị gián đoạn sẽ bắt đầu cadence mới.

Tương tác chọn trong các đèn có thể nhận: unlit hoặc lit có units<6000. Vì hao dầu xảy ra trước tương tác, đèn đầy tại tick0 có thể vừa hao 1 unit và nhận 1 con tại tick1; đây là đúng thứ tự ticket. Used=ceil(deficit/600 units), giới hạn túi. Đèn đầy tại thời điểm chọn không nhận, không event/điểm.

Vùng an toàn chỉ tồn tại khi lit và units>=1800. Đúng 30 còn vùng; 29.983… mất vùng dù snapshot làm tròn thành 30.0. Khi châm vượt ngưỡng, xử lý vùng sáng ngay sau interaction, trước pulse/movement/contact. Giữ cách đẩy ra mép tức thì của Phase2 (1 tick, nằm trong giới hạn tối đa30), có recoil không sát thương. Vùng sáng và cường độ môi trường cập nhật theo trạng thái thực.

Wander ưu tiên đèn weak sáng gần nhất (tie numeric id), không có thì đèn tắt. Chase không đổi sang đèn yếu. Drain đứng yên trong XZ2; bắt đầu hút từ bước2 kế tiếp vì movement xảy ra sau fuel. Drain kiểm tra out/refuel/range rồi player6m tại bước movement; nếu Mây vừa vào6m ở tick này, vẫn có lượng hút đầu tick trước khi chuyển chase. Pulse trước movement nhận đúng bonus15 khi trạng thái ngay trước pulse làdrain. Stun hết trả về wander ở tick đó; detection chase từ tick sau.

Win chỉ được xét khi time_left<=0, sau toàn bộ tick. Hết lửa ưu tiên tuyệt đối; nếu sống, sốlit>=ceil(0.6*N) thì dawn_survived, còn lại dawn. Không còn all_lit hay bonus thời gian. Dawn bonus tính từ dầu còn lại sau mọi thao tác tick cuối; đèn vừa thắp ở tick cuối có fuel100.

## Hệ quả và kiểm chứng

- Contract1.2, đêm240/270/300, snapshot thêm fuel/history/capacity và drain-state validation.
- Test cũ về score, thời lượng, không nhận lit, stun recovery và early win được đổi có lý do trong docs/notes/phase-3.md; không skip.
- 19 processCLI tái tạo raw evidence, unit tests cho exact6000 tick, threshold30, expiry/refuel cuốiĐêm, drain cộng dồn, relight vàcapacity20.
- UI: thanh dầu trongworld, blink1Hz khi<30, đèn tắt xẹp20% và vết rách, mode màu dễ phân biệt có persistence. Settings/renderer không tác động simulation hay RNG.
