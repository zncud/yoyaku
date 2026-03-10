-- ============================================================
-- profiles に store_id カラムを追加（顧客を登録店舗に紐付け）
-- ============================================================

ALTER TABLE profiles
  ADD COLUMN store_id UUID REFERENCES stores(id) ON DELETE SET NULL;

CREATE INDEX idx_profiles_store ON profiles (store_id);

-- handle_new_user トリガーを更新し、store_id を自動設定
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, phone, store_id)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'phone',
    (NEW.raw_user_meta_data->>'store_id')::UUID
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
