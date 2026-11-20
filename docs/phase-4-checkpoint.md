# Phase 4 checkpoint

Contract 1.3 có benchmark, soak, bảng điểm và xuất JSON, đổi phím và trợ năng. Lượt kiểm tra hồ sơ đạt 73/73 test. Cả 19 JSONL tái sinh đều trùng từng byte với tệp ở tag Phase 3 và Phase 4. Soak đã lưu đủ 10 Đêm, không crash và RSS tăng 4,25% với runner JITless khai trong contract. [Bằng chứng và cách tái chạy](proof/rubric.md)

Repo L3A công khai có đủ bốn tag phase. Tag `v1.0.0` và `phase-4` cùng trỏ tới `9b58376`. Release có ZIP chơi được, MP4 dài 71,63 giây và checksum. Bản clone sạch đã cài, build và phục vụ trang game thành công. [Release v1.0.0](https://github.com/LeGiaHung29805/K5-L3A-DAY12-LeGiaHung-2A202603713-AI-SDLC-Dao-Den-Long/releases/tag/v1.0.0)

Tại 1280×720, lượt đạt 92,77 FPS trung bình và 46,71 FPS ở 1% low có load 11,52 giây. Lượt tải 7,97 giây có FPS trung bình 50,33. Chưa có một lượt đạt cả ba ngưỡng ở đúng viewport. Các lượt đo và dữ liệu thô được lưu cùng báo cáo. QA UI và FPS ở tag Phase 2 vẫn theo trạng thái của lần kiểm tra gốc. [Báo cáo Phase 4](proof/phase-4/README.md) · [Trạng thái Phase 2](proof/phase-2/browser-status.json)
