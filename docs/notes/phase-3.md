# Phase 3 — Evaluation và nhật ký thay đổi

Mục tiêu: áp dụng Ticket-03, không tạo Phase4. Quyết định: ADR003. HarnessAGENTS/verify/CI tiếp tục được dùng; proofPhase1/2 giữ nguyên theo tag cũ.

## Breaking changes / test thay thế

| Kiểm tra cũ | Thay theoTicket03 |
|---|---|
| Thắp đủ kết thúc ngay, all_lit | Khôngearlywin; chỉ dawn, ceil60%, reason dawn_survived. TestCLI dùng scenario1/60s để kiểm tra endtick1 |
| Đèn lit bị bỏ qua khi tương tác | Lit thiếu dầu nhậnrefuel; đầy tại thời điểm chọn thì bỏ qua. Testnearestlit đổi sangL1 do nó vừa hao trướcstep5 |
| Deposit10points; flame/timebonus | Deposit5; first100/relight40; rawfuel bonus+lit50+flame50, time0. Cập nhật expectedscore thực tế, không skip |
| N1time300, N2 330,N3 360 |240/270/300; testtime precision/pause cập nhật |
| Stun hết có thểchase cùngtick | Tickhếtstun vềwander, detectionchase từ tick sau |
| Staticcarry10 | Capacity10..20 theo successful_lights, setup lightskhôngcount. Testcapacity ban đầu vẫn10 |
| Skill/evidence writerPhase2 | WriterPhase3 riêng,19runs; không tái tạo/đè outputPhase2 bằng luật mới |

Toàn bộ kiểm tra không bị thay tiếp tục chạy (no skips): seed, fixed60, camera, aircontrol, jump/dash, fall/respawn, drifter/charm, canonical maps, wind, pause/TTL, CLIbadformat, snapshot/end, settingsvolume/sensitivity vàinputbuffer.

## Lỗi tìm được trong quá trình làm

- Test partialdeposit phát hiện constructor resetdeposited của đèn chưa sáng khi thêm fuel0; sửa chỉ reset khi đèn lit cạn thật sự. Giữtestpartial để ngăn tái diễn.
- Dawnexpected score phải floor từngđèn saudecay, không floor fuel snapshot đãround. Cácđèn đãsáng100 tại tick cuối còn99.983… nên bonus149, đèn vừa thắp được150. Test cập nhật theo công thứcđộc lập.
- Bảng màu được tách khỏicore; testsettings cũ mở rộng booleanpersistent, không làm thay outputheadless.

## QA và bằng chứng

66/66 tests và19CLI run. Kịch bản có kiểm soát, không phải clip chơi trọn worldmặcđịnh. Fullnight18000 tick vớiinvuln/windfalse để sốngđủ300s; vẫn có NPC/mote spawn. Sourcehash/outputhash/máy/thời gian ởproofsummary.

BrowserIAB ngày20/11: tablocalhostcũ chứa tranglỗi; mở tablocal mới cùngIAB tải được, không vượt securityinterstitial hay đổi cơ chế. Quan sátrefuel:2con→100dầu,+10điểm. Checkboxmàu được bật, reload, mởsettings vẫnchecked. Tình huống Đêm3 4giây,4đènsetup+1đèn tự nạp:5/7 khi còn00:04 vẫnplaying, đến00:00 mớiBìnhMinh830điểm. Ảnhđược lưu trực tiếp;consoleerrors[] ởlầnđọc cuối.

FPS1280×720 còn là mụcchưa xácminh từPhase2, không dùng ảnhviewportnhỏ hayheadlesstime để khẳng địnhđạt. Chưa córeviewerđộc lập. Chưa chạy testẩn. Không khẳng định mọichi tiếtđồhọa đã được chấmtựđộng.

## Token / retro

Không cótelemetrybilling/token chínhthức; ước tính thủcông20.000–35.000token choPhase3, độ tin cậy thấp, không phải sốđo. Không thêmdependency. Tận dụng lõithuần, thêmtest ranhgiới trước khichốtUI, rawJSONL bằngNodeCLI. Nếu làm lại sẽ đặt modelđèn vào module riêng để constructor vàstagefuel không vô tìnhảnhhưởng partialdeposits.
