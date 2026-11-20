# ADR 004 — Đo hiệu năng và dữ liệu cục bộ cho bản web

Ngày: 2026-11-20. Trạng thái: chấp nhận.

Giữ core Phase 3 và tuning nguyên vẹn. Contract 1.3 chỉ bổ sung công cụ phát hành. Benchmark dùng Game dựng world nhưng cập nhật riêng wander, không gọi gameplay step nên không cháy dầu, nhặt đồ, gây sát thương hoặc kết thúc. Renderer cùng vật liệu/ánh sáng/mô hình; nhóm lặp dùng instancing giảm draw call, không giảm số thực thể. Quỹ đạo CCW trong hệ tay phải: nhìn từ +Y với -Z phía trên, +X chuyển về -Z. Kiểm tra phát hiện dấu sin ban đầu sai, đã sửa và đo lại; số sơ bộ không dùng làm kết quả cuối.

Đo requestAnimationFrame thật; lấy giao interval với cửa sổ [3s,3s+duration]. Lưu raw frame array/hash, Node tính lại trước khi xuất. P95 nearest-rank. Web không đo RSS tiến trình hay ép tắt vsync: null/false, không lấy JS heap giả RSS. load_ms gồm chờ mở browser từ CLI, không trừ overhead điều khiển.

Soak reset 10 world trong một tiến trình, GC sau world đầu và reset cuối. Lần có JIT RSS 29,38→35,96 MiB, vượt 20%. Runner JITless với heap giới hạn công khai giảm JIT code cache làm nhiễu so sánh world. Không thêm bộ nhớ đệm vào baseline, không sửa kết quả; vượt ngưỡng vẫn exit 1.

Bảng điểm lưu localStorage cho static build và đồng bộ server local vào file cho CLI export. Server chỉ nghe loopback, POST cùng origin, validate từng entry trước khi xếp hạng. Bản ghi Phase4_QA điểm 0 là dữ liệu kiểm thử thật, không phải thành tích thắng. ZIP không kèm dữ liệu runtime .local.

Không thay/skip test Phase 1–3; chỉ mở rộng expectation settings vì thêm trường. Thêm test metrics/scene/camera, leaderboard/export, binding và soak thật. QA phát hiện toast che cảnh báo và specificity CSS cỡ đồng hồ: sửa rồi chụp lại.
