-- ============================================================
-- 予約承認フロー
-- - status に 'pending'（承認待ち）を追加
-- - 顧客からの予約はデフォルトで 'pending' になる
-- - 管理者が承認すると 'reserved' に変わる
-- ============================================================

-- status の CHECK 制約を更新して 'pending' を追加
ALTER TABLE bookings
  DROP CONSTRAINT IF EXISTS bookings_status_check;

ALTER TABLE bookings
  ADD CONSTRAINT bookings_status_check
  CHECK (status IN ('pending', 'reserved', 'cancelled', 'completed'));

-- 管理者承認ビュー用: 未承認予約数を素早く取得できるインデックス
CREATE INDEX IF NOT EXISTS idx_bookings_pending
  ON bookings (store_id, status)
  WHERE status = 'pending';

-- ============================================================
-- 補足:
-- - 顧客予約: status = 'pending'（承認待ち）
-- - 管理者承認後: status = 'reserved'（確定）
-- - 管理者が直接作成した予約: status = 'reserved'（即確定）
-- ============================================================
