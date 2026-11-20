# Phase 1 — Yêu cầu, giả định và nhật ký AI

Lê Gia Hưng, 2A202603713. Công cụ hỗ trợ: OpenAI Codex. Nguồn: docs/spec/phase-1-prd.txt do người dùng cung cấp và các file hướng dẫn repo giảng viên. Không dự đoán phase chưa có yêu cầu.

## Tiêu chí nghiệm thu trước triển khai

1. Đêm 1 – Đảo Bến 3D, đảo tròn, 5 đèn L1…L5, Mây có nón lá/đèn nhỏ.
2. Di chuyển, nhảy, camera; nhặt/nạp; Bóng Mực đuổi/gây sát thương; tỏa sáng; vùng an toàn.
3. Thắng/thua, HUD, điểm và replay; đảo sáng dần.
4. Contract đầy đủ; headless 60 Hz, seed, scenario/inputs/JSONL đúng tick.
5. Test logic, gọi CLI thật, tình huống ranh giới và ảnh UI; giữ output thô.

Kiến trúc: JS ESM thuần cho simulation, adapter Node CLI và Three.js cùng dùng simulation. Bản web đáp ứng yêu cầu chạy macOS/Linux trong khi máy làm bài là Windows. Khóa Three.js 0.180.0 trong lockfile. Không bundler/backend/API. Build đóng gói thư viện và license vào dist/vendor.

## Quyết định cho yêu cầu mơ hồ

| Chủ đề | Quyết định |
|---|---|
| Tài nguyên | Carry 12, đèn cần 10, nạp từng phần; cân nhắc giữa thắp đèn và chi phí tỏa sáng |
| Tỏa sáng | Cost 3, bán kính 6 m, choáng 3 s, đẩy 3 m, hồi 1 s; giữ Q không lặp |
| Tỏa sáng lên đối tượng đang choáng | Đẩy/refresh choáng nhưng không cộng per_stun lại |
| Máu | 3 lửa, chạm mất 1, miễn thương chung 2 s, nhiều kẻ địch không trừ máu cùng tick |
| Đánh rơi | floor(carried × 0.25), biến mất, không farm điểm nhặt lại |
| Đèn an toàn | Chỉ đèn đã sáng có vòng 5 m; Bóng Mực bị đẩy ra; người chơi bên trong không bị chạm |
| Thời gian | 300 s, scenario ghi đè được initial time |
| Kết thúc đồng thời | Hết lửa → đủ năm đèn → bình minh; bonus chỉ một lần khi thắng |
| Nhiều đèn gần nhau | Đèn chưa sáng gần nhất, hòa khoảng cách chọn id; một nhấn nạp một đèn |
| Nhảy | Vận tốc 7, gravity 20; chỉ Y, vẫn đo khoảng cách XZ nên không né sát thương |
| Biên đảo | Rào vô hình tròn 42 m, fall_enabled=false, không có event fall |
| Trang trí | Không collision để logic không khác giữa UI/headless |
| Random | Seed PRNG riêng; 110 đom đóm/3 Bóng Mực đầu; bổ sung theo README, cap 130/10. random=false tắt initial/periodic |
| Scenario | Thay danh sách, mảng rỗng là rỗng; lit=true chuẩn hóa deposited=10, không có điểm/sự kiện setup |
| Pause | UI ngưng gọi step, không thêm input hay thay sim_tick Phase 1 |
| Output | Chỉ tọa độ làm tròn; time_left_s theo công thức chính xác |

## Nhật ký AI và lỗi đã phát hiện

- Đầu tiên người dùng yêu cầu giải thích lab trước code. AI đọc hướng dẫn, phát hiện thiếu PRD/Test Contract và chờ người dùng cung cấp; không tự bịa contract.
- Triển khai simulation/CLI/renderer/test trong một chat, không dùng subagent.
- Lần verify đầu 29/30: Node parseArgs từ chối `--seed -123` tách rời. Sửa chuẩn hóa số âm trước parse; giữ test hồi quy.
- QA browser: bấm Q nhanh có thể rơi giữa hai render frame. Thêm bộ đệm cạnh nhấn trong adapter giao diện. Kiểm tra lại: W nhặt 4 con, Q còn 1, hiện cooldown. Core không đổi luật.
- Đối chiếu contract phát hiện không nên làm tròn thời gian theo tọa độ. Sửa time_left_s và thêm test một tick.
- Npm cần approval mạng ngoài sandbox để tải Three.js. Không key/credential trong source.
- Tái tạo evidence bằng CLI thật. Hai seed output cùng hash. Có autoplayer dùng input hợp lệ thắng world mặc định với kẻ địch, bên cạnh scenario thắp đủ năm đèn từ đầu.

## Harness, đánh giá và chi phí

AGENTS.md đặt quy tắc tick/XZ/seed/tuning và cấm bằng chứng giả. scripts/verify.mjs chạy test + build, fail-closed; pre-commit hook gọi verify. CI Ubuntu/macOS. scripts/evidence.mjs gọi process CLI, lưu input/output/hash/test report/cấu hình máy.

**Chưa có reviewer độc lập.** Tự kiểm tra của người viết không được coi là review độc lập; người dùng cần đọc diff/chơi lại theo rubric. Không coi cấu hình CI là run xanh khi chưa quan sát GitHub.

Không có telemetry token/billing chính thức. Ước tính thủ công cả Phase 1 **25.000–40.000 token**, độ tin cậy thấp, không phải số đo; chi phí tiền chưa xác định. Tiết kiệm nhờ logic dùng chung, node:test tích hợp, một dependency, asset procedural và sửa theo lỗi quan sát được.

Retro: đọc contract trước giúp chọn kiến trúc đúng; test CLI tìm được lỗi không có trong test thuần; UI QA tìm được lỗi phím. Nếu làm lại, tách bộ đệm phím thành module từ đầu, kiểm tra precision output sớm hơn. Các phase sau chưa thực hiện. Số đo Windows không được dùng để cam kết hiệu năng macOS/Linux.

Kết quả cuối trước bàn giao: 31/31 test qua, static build thành công. Full route có kiểm soát thắp năm đèn thắng ở tick 1431; autoplayer world mặc định seed 2026 thắng ở tick 2953, score 2770. Thời gian này là gameplay mô phỏng, không phải FPS hay thời gian chạy thực tế. Xem summary.json để biết thời gian process và máy đo.
