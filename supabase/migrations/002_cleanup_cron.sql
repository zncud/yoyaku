-- ============================================================
-- データ自動クリーンアップ (pg_cron)
-- 毎日深夜 (JST 00:00 = UTC 15:00) に実行
-- ============================================================

-- pg_cron 拡張機能の有効化（Supabase ダッシュボードで有効にする必要あり）
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- ============================================================
-- クリーンアップ関数
-- ============================================================
CREATE OR REPLACE FUNCTION cleanup_old_data()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_bookings INTEGER;
  deleted_shifts   INTEGER;
BEGIN
  -- 1. 過去1年以上前の予約を削除
  --    booking_menus は ON DELETE CASCADE で自動削除される
  DELETE FROM bookings
  WHERE created_at < NOW() - INTERVAL '1 year';

  GET DIAGNOSTICS deleted_bookings = ROW_COUNT;

  -- 2. 過去のシフト・ブロック枠を削除（終了日時が過ぎたもの）
  DELETE FROM shifts
  WHERE end_at < NOW();

  GET DIAGNOSTICS deleted_shifts = ROW_COUNT;

  -- ログ出力（pg_cron のログで確認可能）
  RAISE NOTICE 'cleanup_old_data: deleted % bookings, % shifts',
    deleted_bookings, deleted_shifts;
END;
$$;

-- ============================================================
-- Cron ジョブのスケジュール登録
-- 毎日 15:00 UTC (= JST 00:00) に実行
-- ============================================================
SELECT cron.schedule(
  'cleanup-old-data',
  '0 15 * * *',
  $$SELECT cleanup_old_data()$$
);

-- ============================================================
-- 補足:
-- - ジョブの確認:   SELECT * FROM cron.job;
-- - 実行履歴の確認: SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;
-- - ジョブの無効化: SELECT cron.unschedule('cleanup-old-data');
-- ============================================================
