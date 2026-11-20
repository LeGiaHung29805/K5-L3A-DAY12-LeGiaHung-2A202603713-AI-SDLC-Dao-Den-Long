# Phase 3 — Ticket-03 “Đèn cạn dầu” / Contract 1.2

Nguồn yêu cầu: toàn bộ Ticket-03 do người dùng dán trong chat ngày20/11/2026. Không đọc/yêu cầu phase chưa phát hành.

| Mục | Acceptance criteria / bằng chứng |
|---|---|
| Dầu | Max100; decay1/s; new/relight100; refuel ceil deficit/10, +10 mỗi con, cap100; full excluded; out giữ ever_lit/xóa deposited; tests/fuel.test.js |
| Thắp lại | Cost5 thay vì10, đếmrelit_count; giữ partial progress; event lantern_lit.relight; relight.jsonl |
| Vùng sáng | Đúng30 an toàn, dưới30 mất vùng; refuel phục hồi trướccontact, đẩy shade ra trong≤30tick; safe-restored.jsonl |
| Drain | Chỉ wander chọnweak; chase giữ người; XZ2 vào drain;5/s/con cộng decay; thoát khiplayer6/pulse/out/refuel/range; hếtstun vềwander; drain.jsonl, drain-pulse.jsonl vàunit |
| Bình minh |240/270/300s; khôngearlywin; sống và≥3/5,4/6,5/7 ở cuối; reason dawn_survived/dawn/no_flames; death priority; dawn-N-won/lost.jsonl |
| Sức chứa |10+2*success,max20; đếm cảrelight, không đếmscenario/refuel; resetmỗiĐêm; capacity.jsonl +campaign tests |
| Điểm | Deposit/refuel5, first100, relight40, pulse5 hoặc drain15 tổng; dawn mỗilit50+floor(rawfuel), mỗiflame50, khôngtimebonus; unit + CLI |
| Mù màu | Persistent checkbox; eyes/rim00B3FF, warningwhite+⚠; offbodyheight80%+tear; weakblink1Hz; browser-accessibility.jpg vàbrowser-refuel.jpg |
| Contract |1.2keys; snapshotsfuel one decimal numeric (100 and100.0 equivalent JSON numbers),ever_lit,relit_count,player.capacity; scenario fieldsvalidated; fuel_drain per60active ticks |
| Regression | Physics, maps, dash, drifters, charms, wind, pause, input, CLI/schema/determinism giữ; testcũ thay rõ theoADR vànotes, khôngskip |

Các chỗ ticket không quy định thêm giữ từPhase2, bao gồm điểmspawnĐêm3. Thiết kế và quy tắc xác địnhthứtự nằm tại docs/adr/003-lantern-fuel-and-dawn.md.
