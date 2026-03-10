-- ============================================================
-- ダブルブッキング防止の排他制約 (Exclusion Constraint)
-- アプリ層の重複チェックをすり抜けた同時リクエストをDB側で確実にブロックする
-- ============================================================

-- btree_gist 拡張: UUID と tstzrange を同時に使う EXCLUDE 制約に必要
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- 同一スタッフ・同時間帯の 'reserved' 予約が重複しないことをDB制約として保証する
-- tstzrange(start_at, end_at, '[)') は半開区間（終了時刻は含まない）
ALTER TABLE bookings
  ADD CONSTRAINT bookings_no_overlap
  EXCLUDE USING GIST (
    staff_id WITH =,
    tstzrange(start_at, end_at, '[)') WITH &&
  ) WHERE (status = 'reserved');

-- ============================================================
-- 補足:
-- - エラーコード 23P01 (exclusion_violation) が返された場合はダブルブッキング
-- - status が 'cancelled' や 'completed' の予約は制約対象外
-- ============================================================
