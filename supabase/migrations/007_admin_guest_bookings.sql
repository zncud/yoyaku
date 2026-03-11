-- ============================================================
-- 管理者によるゲスト予約対応
-- - bookings.user_id を NULL 許容に変更
-- - ゲスト情報カラムを追加（guest_name, guest_email, guest_phone）
-- ============================================================

-- 1. user_id を NULL 許容に変更
ALTER TABLE bookings
  ALTER COLUMN user_id DROP NOT NULL;

-- 2. ゲスト情報カラムを追加
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS guest_name  TEXT,
  ADD COLUMN IF NOT EXISTS guest_email TEXT,
  ADD COLUMN IF NOT EXISTS guest_phone TEXT;

-- 3. 既存の exclusion constraint は user_id に無関係なので変更不要

-- ============================================================
-- 補足:
-- - user_id が NULL の予約は管理者が作成したゲスト予約
-- - RLS の "Users can view own bookings" は NULL != auth.uid() なので
--   ゲスト予約は顧客側から閲覧不可（管理者のみ閲覧可）
-- ============================================================
