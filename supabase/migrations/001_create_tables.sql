-- ============================================================
-- サロン予約システム DDL (Supabase / PostgreSQL)
-- requirements.md v3.1 に基づくテーブル定義
-- ============================================================

-- UUID拡張機能の有効化
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 1. profiles テーブル (auth.users の拡張)
-- ============================================================
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 2. stores テーブル (店舗情報)
-- ============================================================
CREATE TABLE stores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(50) NOT NULL UNIQUE,
  phone VARCHAR(20),
  address TEXT,
  description TEXT,
  hero_image_url TEXT,
  logo_image_url TEXT,
  owner_id UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 3. site_settings テーブル (店舗設定 / stores と 1:1)
-- ============================================================
CREATE TABLE site_settings (
  store_id UUID PRIMARY KEY REFERENCES stores(id) ON DELETE CASCADE,
  theme_color JSONB DEFAULT '{"primary": "#000000"}',
  booking_interval_minutes INTEGER DEFAULT 30,
  mail_config JSONB DEFAULT '{}',
  notification_config JSONB DEFAULT '{"digest_time": "21:00", "enabled": true}'
);

-- ============================================================
-- 4. staffs テーブル (スタッフ情報)
-- ============================================================
CREATE TABLE staffs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  image_url TEXT,
  role VARCHAR(20) DEFAULT 'staff',       -- 'manager', 'staff'
  is_active BOOLEAN DEFAULT true,
  google_calendar_id VARCHAR(255),
  google_refresh_token TEXT,               -- RLSで管理者以外参照不可
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 5. menus テーブル (施術メニュー / 金額なし)
-- ============================================================
CREATE TABLE menus (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  duration_minutes INTEGER NOT NULL,
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0
);

-- ============================================================
-- 6. shifts テーブル (スタッフ別シフト・ブロック枠)
-- ============================================================
CREATE TABLE shifts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  staff_id UUID NOT NULL REFERENCES staffs(id) ON DELETE CASCADE,
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ NOT NULL,
  type VARCHAR(20) NOT NULL DEFAULT 'work' -- 'work' (出勤), 'break' (休憩), 'holiday' (公休)
);

-- ============================================================
-- 7. bookings テーブル (予約データ)
-- ============================================================
CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  staff_id UUID NOT NULL REFERENCES staffs(id),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ NOT NULL,
  total_duration INTEGER NOT NULL,
  status VARCHAR(20) DEFAULT 'reserved',   -- 'reserved', 'cancelled', 'completed'
  google_event_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 8. booking_menus テーブル (予約-メニュー中間テーブル)
-- ============================================================
CREATE TABLE booking_menus (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  menu_id UUID NOT NULL REFERENCES menus(id)
);

-- ============================================================
-- インデックス (パフォーマンス最適化)
-- ============================================================
CREATE INDEX idx_stores_slug ON stores (slug);
CREATE INDEX idx_staffs_store ON staffs (store_id);
CREATE INDEX idx_menus_store ON menus (store_id);
CREATE INDEX idx_shifts_staff_date ON shifts (staff_id, start_at);
CREATE INDEX idx_bookings_store_date ON bookings (store_id, start_at);
CREATE INDEX idx_bookings_staff_date ON bookings (staff_id, start_at);
CREATE INDEX idx_bookings_user ON bookings (user_id);
CREATE INDEX idx_booking_menus_booking ON booking_menus (booking_id);

-- ============================================================
-- updated_at 自動更新トリガー
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_stores_updated_at
  BEFORE UPDATE ON stores
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trigger_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- RLS (Row Level Security) 有効化
-- ============================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE staffs ENABLE ROW LEVEL SECURITY;
ALTER TABLE menus ENABLE ROW LEVEL SECURITY;
ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_menus ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- RLS ポリシー
-- ============================================================

-- --- profiles ---
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- --- stores ---
CREATE POLICY "Stores are viewable by everyone"
  ON stores FOR SELECT
  USING (true);

CREATE POLICY "Owners can update their store"
  ON stores FOR UPDATE
  USING (owner_id = auth.uid());

CREATE POLICY "Authenticated users can create stores"
  ON stores FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

-- --- site_settings ---
CREATE POLICY "Site settings are viewable by everyone"
  ON site_settings FOR SELECT
  USING (true);

CREATE POLICY "Owners can manage site settings"
  ON site_settings FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM stores
      WHERE stores.id = site_settings.store_id
        AND stores.owner_id = auth.uid()
    )
  );

-- --- staffs ---
CREATE POLICY "Public staff info is viewable by everyone"
  ON staffs FOR SELECT
  USING (true);

CREATE POLICY "Owners can insert staffs"
  ON staffs FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM stores
      WHERE stores.id = staffs.store_id
        AND stores.owner_id = auth.uid()
    )
  );

CREATE POLICY "Owners can update their staffs"
  ON staffs FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM stores
      WHERE stores.id = staffs.store_id
        AND stores.owner_id = auth.uid()
    )
  );

CREATE POLICY "Owners can delete their staffs"
  ON staffs FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM stores
      WHERE stores.id = staffs.store_id
        AND stores.owner_id = auth.uid()
    )
  );

-- --- menus ---
CREATE POLICY "Menus are viewable by everyone"
  ON menus FOR SELECT
  USING (true);

CREATE POLICY "Owners can manage menus"
  ON menus FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM stores
      WHERE stores.id = menus.store_id
        AND stores.owner_id = auth.uid()
    )
  );

-- --- shifts ---
CREATE POLICY "Shifts are viewable by everyone"
  ON shifts FOR SELECT
  USING (true);

CREATE POLICY "Owners can manage shifts"
  ON shifts FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM stores
      JOIN staffs ON staffs.store_id = stores.id
      WHERE staffs.id = shifts.staff_id
        AND stores.owner_id = auth.uid()
    )
  );

-- --- bookings ---
CREATE POLICY "Users can view own bookings"
  ON bookings FOR SELECT
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM stores
      WHERE stores.id = bookings.store_id
        AND stores.owner_id = auth.uid()
    )
  );

CREATE POLICY "Authenticated users can create bookings"
  ON bookings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Owners can update bookings"
  ON bookings FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM stores
      WHERE stores.id = bookings.store_id
        AND stores.owner_id = auth.uid()
    )
  );

-- --- booking_menus ---
CREATE POLICY "Booking menus follow booking access"
  ON booking_menus FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM bookings
      WHERE bookings.id = booking_menus.booking_id
        AND (
          bookings.user_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM stores
            WHERE stores.id = bookings.store_id
              AND stores.owner_id = auth.uid()
          )
        )
    )
  );

CREATE POLICY "Authenticated users can insert booking menus"
  ON booking_menus FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM bookings
      WHERE bookings.id = booking_menus.booking_id
        AND bookings.user_id = auth.uid()
    )
  );

-- ============================================================
-- profiles 自動作成トリガー (auth.users 作成時)
-- ============================================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, phone)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'phone'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
