-- ============================================================
-- 営業時間テーブル（曜日ごとの営業時間）
-- ============================================================
CREATE TABLE store_hours (
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  open_time TIME NOT NULL,
  close_time TIME NOT NULL,
  is_open BOOLEAN DEFAULT true,
  PRIMARY KEY (store_id, day_of_week)
);

-- ============================================================
-- RLS 有効化
-- ============================================================
ALTER TABLE store_hours ENABLE ROW LEVEL SECURITY;

-- store_hours ポリシー
CREATE POLICY "Store hours are viewable by everyone"
  ON store_hours FOR SELECT
  USING (true);

CREATE POLICY "Owners can manage store hours"
  ON store_hours FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM stores
      WHERE stores.id = store_hours.store_id
        AND stores.owner_id = auth.uid()
    )
  );

-- ============================================================
-- site_settings に予約公開月数カラムを追加
-- ============================================================
ALTER TABLE site_settings
  ADD COLUMN booking_months_ahead INTEGER DEFAULT 3;
