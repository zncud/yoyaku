-- ============================================================
-- google_refresh_token の列レベルアクセス制御
-- anon / authenticated ロールからの直接参照を禁止する
-- ============================================================

-- anon ロール（未認証ユーザー）から google_refresh_token への SELECT 権限を剥奪
REVOKE SELECT (google_refresh_token) ON staffs FROM anon;

-- authenticated ロール（一般ログインユーザー）からも剥奪
-- 管理者は service_role クライアント経由でアクセスするため問題なし
REVOKE SELECT (google_refresh_token) ON staffs FROM authenticated;

-- ============================================================
-- 補足:
-- - 上記により SELECT * FROM staffs では google_refresh_token が返らなくなる
-- - SELECT google_refresh_token FROM staffs を実行すると permission denied になる
-- - service_role クライアント（管理者 API Routes）は引き続きアクセス可能
-- ============================================================
