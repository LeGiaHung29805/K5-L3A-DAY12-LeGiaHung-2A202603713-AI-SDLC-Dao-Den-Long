# Retro — Đảo Đèn Lồng qua bốn phase

Lê Gia Hưng · 20/11/2026. Bản ngắn khoảng hai trang khi in.

## Kết quả từng phase

Phase 1 biến PRD tổng quát thành game 3D một Đêm và core headless deterministic. Tách renderer khỏi mô phỏng giúp kiểm thử không cần GPU. Phần khó là những yêu cầu có vẻ đơn giản như input giữ trạng thái, edge false→true, snapshot tick 0 và tọa độ chân nhân vật. Chốt giả định và tuning sớm có giá trị hơn thêm chi tiết hình ảnh.

Phase 2 chuẩn hóa ba bản đồ, di chuyển, Lướt, gió, thực thể mới và hành trình tuần tự. Một Đêm có nhiều đảo vẫn là một màn: chỉ thắng Đêm 1 mới sang Đêm 2. Canonical world data hạn chế renderer vẽ địa hình khác core. Chưa xác minh được FPS 1280×720 do công cụ điều khiển browser bị chặn; tài liệu ghi rõ thay vì lấy timing headless làm bằng chứng.

Phase 3 là thay luật thật: đèn có dầu và tắt được, thắng ở bình minh thay vì all_lit. Dầu nguyên 1/60 tránh sai biên 30 và 0; history/ever_lit tách lịch sử khỏi trạng thái sáng hiện tại. ADR và bảng test thay thế giúp bỏ công thức điểm/thắng cũ một cách có chủ ý. Core mới có 66 test và 19 lần CLI thật, kiểm tra cả tick cuối và ưu tiên hết lửa.

Phase 4 giữ core, bổ sung benchmark, soak, bảng điểm, đổi phím và accessibility. 73 test bao gồm chạy soak thật. Kiểm tra UI phát hiện lỗi mà test Node không thấy: toast che cảnh báo, specificity CSS thu nhỏ đồng hồ. Đã chỉnh vị trí/cỡ chữ và kiểm lại DOM/screenshot. Hiệu năng browser phụ thuộc tab hoạt động, GPU và công cụ; báo cáo phân biệt số đo, mục tiêu và điều chưa đạt.

## AI hữu ích ở đâu, sai ở đâu

AI hữu ích khi chuyển bảng luật thành fixture nhỏ, rà tick order, sinh harness CLI và kiểm tra hồi quy sau thay đổi. Shared core, seeded random, scenario/input và JSONL là các “hợp đồng” buộc giải thích của AI phải khớp kết quả chạy. Hook fail-closed và CI Linux/macOS ngăn commit bị coi là đúng chỉ vì agent nói đã thử.

AI có thể suy diễn quá sớm từ tài liệu thiếu số liệu. Đã phải yêu cầu phần Ticket 02 còn thiếu thay vì tự điền tốc độ/màu. Một lỗi khác là nghĩ quỹ đạo cos/sin dương luôn CCW: với góc nhìn từ +Y và -Z phía trên, cần sin âm. Kiểm tra hướng rồi cập nhật test và chạy lại phép đo; không giữ số đo cũ làm bằng chứng cho code mới.

Tính RSS cũng dễ bị hiểu nhầm: code cache JIT tăng không có nghĩa world bị leak, nhưng vẫn làm trượt phép so 20%. Runner JITless/heap budget được khai trong contract, giữ đúng mốc đo; không bơm baseline hoặc ghi đè kết quả thành PASS. Lần fail ban đầu được ghi trong ADR. Không có bằng chứng hidden test của giảng viên; chỉ tuyên bố test đã chạy trong repo.

## Chi phí và phần tiết kiệm

Không có số liệu billing/token đầy đủ từ nền tảng, nên không thể báo chi phí hay token thực tế chính xác. Ước lượng lập kế hoạch cho cả bốn phase ở mức 100.000–300.000 token tương tác/code/log, độ tin cậy thấp; không coi đây là usage đã đo. Chi phí USD = token input/output thực tế nhân đơn giá model tại lúc dùng; vì thiếu cả usage xác nhận lẫn hóa đơn, chi phí chưa xác định. Không có API trả phí trong game, không thêm dependency Phase 4.

Tiết kiệm rõ nhất là tái dùng core, fixture và script evidence; không dựng engine khác khi luật đổi. Không đo thời gian so với một baseline làm tay nên không đưa số giờ hay phần trăm tiết kiệm giả. Đọc có mục tiêu, log rút gọn, checkpoint và lưu bằng chứng giúp giảm đọc lại. Chạy UI muộn gây thêm lượt sửa CSS/benchmark; nên mở sớm viewport chuẩn.

| Phase | Ước tính token |
|---|---:|
| 1 | 25.000–40.000 |
| 2 | 30.000–50.000 |
| 3 | 20.000–35.000 |
| 4 | 25.000–175.000 |

Phase 1–3 dùng các khoảng trong notes từng phase. Với Phase 4, kịch bản sử dụng thấp lấy 100.000 trừ 75.000 token cho ba phase đầu. Kịch bản sử dụng cao lấy 300.000 trừ 125.000. Đây là hai kịch bản lập kế hoạch có độ tin cậy thấp. Cần telemetry phiên để ước tính sát hơn.

## Cải thiện lần sau

1. Lập ma trận yêu cầu → test → artifact ngay đầu mỗi phase; phân biệt logic, UI và hiệu năng.
2. Chốt hệ trục/camera bằng hình vẽ và một kiểm tra quarter-turn; không viết test chỉ lặp công thức.
3. Đo GPU trong một cửa sổ hoạt động, đóng renderer khác; lưu môi trường và raw frame data.
4. Dành một lượt clean-clone/CI trước đóng tag. Không hứa release hoàn tất trước khi kiểm tra URL/assets/tag commit.
5. Giữ sản phẩm nhỏ, đọc được và đo được; chỉ thêm sáng tạo sau khi contract đúng. Cảnh báo/giảm nhấp nháy và điều khiển đổi được có lợi cho người chơi hơn thêm cơ chế chưa kiểm chứng.
