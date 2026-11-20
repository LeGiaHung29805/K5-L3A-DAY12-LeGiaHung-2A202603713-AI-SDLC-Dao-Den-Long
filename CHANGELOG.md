# Changelog

## v1.0.0 / Phase 4 — 2026-11-20

- Contract 1.3 thêm bench_cmd/soak_cmd; tuning và JSONL gameplay giữ nguyên Phase 3.
- Benchmark WebGL 1280×720, 200 wander/100 đom đóm, camera chuẩn, raw dt + SHA-256; giới hạn web khai thật.
- Soak 10 Đêm một tiến trình, seed liên tiếp, RSS/reset/GC và exit fail khi tăng quá 20%.
- Bảng điểm top 10 local, xác thực tên, lưu qua restart, màn menu và CLI export.
- Đổi 9 phím, báo trùng/reset/lưu; chữ 18px/×1,25, giảm chuyển động; cảnh báo bóng/gió/giờ/dầu.
- QA sửa hướng orbit +X→-Z, toast che cảnh báo, specificity cỡ đồng hồ/lửa và hướng dẫn theo phím đã đổi.
- 73 test, bằng chứng riêng, tài liệu bốn phase và gói/video phát hành. Không đổi luật gameplay.

## Phase 3 — Breaking changes (2026-11-20)

- Contract1.2: thời lượng240/270/300; chỉ thắngtại bìnhminh với60%đèn, bỏall_lit vàtimebonus.
- Đèn cófuel/history/relit_count; decay1/s,refuel10/con,relight5. Safezonechỉkhi>=30; drain5/s/con,state/eventmới.
- Capacity10..20 theo sốlầnthắp. ToànbộscorethaybằngTicket03; snapshots/scenariofieldsmới.
- Settingsmùmàu lưu lại; đèn tắt xẹp/vếtrách, thanh dầu/blink1Hz.
- Testcũ đổi cólýdo ởADR003/notesPhase3, khôngskip. ProofPhase1/2 khôngđè.


## Phase2 —2026-11-20

- Chuẩn hóa Test Contract1.1, tuning/score, canonical3 maps, pickupheight, pulse3D/timedpush, recoil/droppedTTL, fall/respawn,12-stagepipeline, pause outertick/sim_tick.
- Lướt, Bùa Gió, Gió Lạc, gió Đêm3, dốc/tầng/bục/tháp chuông.
- Campaign3 Đêm/Bình Minh/total score, pause menu, persistentvolume/sensitivity, synthesizednight music/effects, chuẩn HUD/palette.
-48 tests và20 CLI scenarios, full5/6/7-lantern routes,21600-tick benchmark. FPS1280×720 còn chưa xác minh do browser-control stop; ghi rõ trong bằng chứng.

## Phase 1 — 2026-11-20

- Đêm 1 – Đảo Bến: web 3D, Mây nón lá/đèn nhỏ, 5 đèn, đom đóm, Bóng Mực, tỏa sáng, thắng/thua, điểm và replay.
- Core 60 Hz chung browser/Node; Test Contract v1.0, seed, scenario/input, JSONL.
- Test logic/CLI, build tĩnh, script bằng chứng, hook verify và CI Linux/macOS.
- Tài liệu giả định, nhật ký AI, traceability và nguồn asset.
