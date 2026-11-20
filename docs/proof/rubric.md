# Truy vết yêu cầu và bằng chứng chấm bài

Dùng tag tương ứng khi kiểm tra lại Phase 1–4. Ở mỗi tag, chạy `npm ci`, `npm run verify` và `npm run evidence` trong bản clone dùng để chấm. Đối chiếu kết quả test và hash JSONL trong summary của phase. Khi kiểm tra UI sau khi tạo fixture, chạy `npm run build` rồi `npm start`.

| Tag | Yêu cầu chính | Kiểm tra và kết quả đã ghi |
|---|---|---|
| `phase-1` | Di chuyển, nhảy, nhặt, nạp, Bóng Mực, Tỏa Sáng và vùng an toàn | Test core, ảnh browser và replay headless. [Bảng Phase 1](phase-1/README.md) |
| `phase-1` | Thắng, thua, chơi lại, HUD và điểm | Ảnh UI thắng/thua, `full-route` và `default-world`; ca sau giữ sinh địch mặc định. [Bảng Phase 1](phase-1/README.md) |
| `phase-1` | Contract CLI, snapshot 0, seed, lỗi đầu vào | Test CLI process thật, cặp JSONL giống từng byte, đầu vào sai trả mã 2. [Bảng Phase 1](phase-1/README.md) |
| `phase-2` | Ba bản đồ, cầu/bục/dốc, lướt, rơi, Gió Lạc, Bùa Gió, lịch sinh và pause | Test core và các ca `route-1/2/3`, `pad`, `tiers`, `tower`, `dash`, `fall`, `drifter`, `charm`, `spawns`, `wind`, `pause`. [Bảng Phase 2](phase-2/README.md) |
| `phase-2` | Campaign, tính điểm, HUD, âm thanh và settings | CLI thắng từng Đêm, test campaign/settings; QA browser quan sát menu, intro và HUD Đảo Cau. Luồng UI đầy đủ, nghe âm thanh và persistence UI còn thiếu bằng chứng ở tag này. [Trạng thái QA](phase-2/browser-status.json) |
| `phase-2` | Tất định, chạy đủ 21.600 tick và ≥30 FPS ở 1280×720 | Có cặp JSONL tất định và ca đủ tick. Mốc FPS chưa xác minh. [Bảng Phase 2](phase-2/README.md) |
| `phase-3` | Dầu, châm/thắp lại, hút dầu, vùng an toàn, pause và sức chứa | Test các biên 0/30 và tick cuối. Có JSONL cho từng nhóm luật và ảnh châm dầu. [Bảng Phase 3](phase-3/README.md) |
| `phase-3` | Bình minh, ưu tiên hết lửa, điểm, hồi quy và seed | Sáu ca thắng/thua theo ngưỡng và ca đèn tắt tick cuối, ảnh màn Bình Minh và cặp seed giống từng byte. [Bảng Phase 3](phase-3/README.md) |
| `phase-4` | Hồi quy contract và luật đang có hiệu lực | 73 test và 19 ca CLI đối chiếu từng byte với Phase 3. [Tóm tắt hồi quy](phase-4/regression/summary.json) |
| `phase-4` | Bảng điểm, lưu và xuất JSON | Test sắp hạng, validate tên, lưu và xuất; QA form sau thua và sau thắng Đêm 3. [Bảng Phase 4](phase-4/README.md) |
| `phase-4` | Đổi phím, cảnh báo, giảm chuyển động, cỡ chữ | Test đổi phím và QA ảnh, cỡ chữ tính từ DOM ở 1280×720. [Bảng Phase 4](phase-4/README.md) |
| `phase-4` và lượt chạy bổ sung | Benchmark và soak | Ở 1280×720, lượt đạt cả hai ngưỡng FPS đo 92,77 FPS trung bình, 46,71 FPS ở 1% low và load 11,52 giây. Lượt load 7,97 giây ở cùng viewport có FPS trung bình 50,33. Chưa xác nhận cả ba ngưỡng trong một lượt. Soak đủ 10 Đêm, không crash, RSS tăng 4,25%. [Bảng Phase 4](phase-4/README.md) |
| `v1.0.0` | Gói chơi được, demo dưới 5 phút, hướng dẫn, credit, license và retro | Release có ZIP, MP4 và checksum. MP4 dài 71,63 giây; URL tải trả HTTP 200 không cần đăng nhập. [Release](https://github.com/LeGiaHung29805/K5-L3A-DAY12-LeGiaHung-2A202603713-AI-SDLC-Dao-Den-Long/releases/tag/v1.0.0) · [Retro](../retro-phase-4.md) |

Bộ test ẩn do giảng viên chạy. Chưa có biên bản đánh giá của người hoặc agent khác người viết. Các mục giới hạn trong proof từng phase ghi rõ điều kiện và phạm vi của lần chạy gốc.

## Kiểm tra công khai ngày 20/11/2026

- API GitHub xác nhận repo ở chế độ public. `git ls-remote` qua HTTPS với credential helper tắt liệt kê đủ bốn tag phase và tag `v1.0.0`.
- Tag release `v1.0.0` và tag `phase-4` cùng trỏ tới commit `9b58376`.
- Workflow Release verification đạt ở commit `9b58376` của `phase-4` và ở commit `d29672a` trên main trước đợt bổ sung tài liệu này. [CI Phase 4](https://github.com/LeGiaHung29805/K5-L3A-DAY12-LeGiaHung-2A202603713-AI-SDLC-Dao-Den-Long/actions/runs/44742355196) · [CI main](https://github.com/LeGiaHung29805/K5-L3A-DAY12-LeGiaHung-2A202603713-AI-SDLC-Dao-Den-Long/actions/runs/44744627546)
- MP4 local giải mã hết bằng FFmpeg mà không báo lỗi. Video có gameplay ở đầu, cảnh benchmark có nhãn lần đo sơ bộ khoảng 00:24–00:48 và trang kết quả test, evidence cùng dòng JSONL cuối của ca Đêm 3 vào khoảng 00:56. Tham chiếu số đo chính thức trong [báo cáo benchmark](phase-4/README.md).
- Clone sạch từ GitHub qua HTTPS với credential helper tắt. `npm ci --offline` dùng npm cache, `npm run build` thành công và `npm start` phục vụ trang chính, contract 1.3 và JavaScript game với HTTP 200. SHA-256 của ZIP và MP4 local khớp manifest release.

## Kết quả tái chạy theo tag

Xuất từng tag bằng `git archive` vào thư mục tạm riêng trong checkout. Cài lại từ lockfile bằng `npm ci --offline` với npm cache hiện có, rồi chạy `npm run verify` và `npm run evidence` trong từng bản xuất. Các lệnh trả mã 0.

| Bản kiểm tra | Test đạt | Evidence |
|---|---:|---|
| `phase-1` · `4fb104a` | 31/31 | Thắng, thua, Tỏa Sáng, replay tất định và lộ trình thắp đủ năm đèn |
| `phase-2` · `8a43972` | 48/48 | 20 ca CLI, ba lộ trình thắp đủ đèn, 21.600 tick và replay tất định |
| `phase-3` · `aa9b11b` | 66/66 | 19 ca CLI |
| Checkout Phase 4 có bản sửa launcher | 73/73 | 19 ca CLI |

QA UI và FPS ở Phase 2 vẫn theo trạng thái ghi tại tag gốc.

## Đối chiếu lại cho mục B

Sau `npm run verify` và `npm run evidence`, đối chiếu từng tệp JSONL tái sinh với SHA-256 trong manifest, bản ở `phase-4:docs/proof/phase-4/regression/` và bản ở `phase-3:docs/proof/phase-3/`. Cả 19/19 tệp khớp ở cả ba phép đối chiếu. `npm run build` hoàn thành sau khi sinh fixture. [Manifest kèm lệnh và SHA-256](phase-4/regression/summary.json)

## Chơi được và sáng tạo cho mục F

- **Thắp lại đèn.** Mở `/?scenario=relight`, chọn vào Đêm 1, chờ báo đèn cạn dầu rồi nhấn **E**. Trong lượt browser đã kiểm tra, HUD đổi từ 0/5 đèn, 5/10 đom đóm và 0 điểm sang 1/5 đèn, 0/12 đom đóm và 65 điểm. Hai ảnh trích từ WebM do trình ghi WebGL của game tạo, tại 0,12 giây và 3 giây. Ở ca CLI tương ứng, `lantern_out` xảy ra trước `deposit` 5 đom đóm và `lantern_lit` có `relight: true`. [Trước](phase-4/relight-before.jpg) · [Sau](phase-4/relight-after.jpg) · [JSONL gốc](phase-4/regression/relight.jsonl)
- **Minimap theo từng Đêm.** Ảnh gameplay Đảo Bến cho thấy bản đồ, vị trí Mây, các đèn và mũi tên chỉ đèn ngoài khung hình. Ảnh Bình Minh Đảo Chuông có tên đảo và cách bố trí các đèn khác, cùng kết quả 5/7 đèn sáng. [Đảo Bến](phase-4/gameplay.jpg) · [Đảo Chuông](phase-4/night3-name.jpg)

Lượt browser thắp lại chạy trên bản Phase 4. Với `phase-2`, kiểm tra bổ sung nạp nguyên module `web/audio.js` từ tag vào Node, dùng `AudioContext` giả lập và ghi nhận các lệnh gọi `tone`. Cả 10 hiệu ứng theo ticket phát sinh chuỗi tần số riêng, ba Đêm có nốt mở đầu khác nhau và âm lượng 0 dừng lên lịch nốt nhạc nền. Đây là kiểm tra logic tạo âm, còn kiểm tra nghe âm thanh thật, luồng UI đủ ba Đêm, lưu cài đặt qua reload và FPS 1280×720 tại tag Phase 2 vẫn theo proof gốc. [Mã âm thanh Phase 2](https://github.com/LeGiaHung29805/K5-L3A-DAY12-LeGiaHung-2A202603713-AI-SDLC-Dao-Den-Long/blob/phase-2/web/audio.js) · [Trạng thái QA Phase 2](phase-2/browser-status.json)
