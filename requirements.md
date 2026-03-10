1. 要件定義 (Requirements)
1.1 システム概要
本システムは、複数の店舗（サロン）が利用可能なマルチテナント型の予約管理プラットフォームである。 各店舗は専用のURL（スラッグ）を持ち、顧客からの予約受付、スタッフ管理、およびスタッフごとのGoogleカレンダー連携によるスケジュール管理を一元的に行う。 「ワンオペサロン」から「複数スタッフ在籍サロン」まで柔軟に対応可能な設計とする。
1.2 アクター定義
アクター
説明
Super Admin
システム全体の管理者。全店舗の管理権限を持つ。
Store Manager
店舗管理者（オーナー）。自店舗の設定、スタッフ、予約、シフトを管理する。
Customer
予約を行うエンドユーザー。会員登録必須。

1.3 機能要件一覧
A. 顧客向け機能 (Front Office)
1. 店舗ページ閲覧
    ◦ 店舗情報、アクセス、ヒーロー画像の表示。
2. 予約ウィザード
    ◦ スタッフ選択: 指名または「指名なし（フリー）」を選択。※スタッフが1名のみの場合は自動スキップ。
    ◦ メニュー選択: 施術メニューを選択（複数可）。※金額は表示しない。
    ◦ 日時選択: 担当スタッフのシフト、既存予約、Googleカレンダー予定を考慮した「空き枠」のみ表示。
    ◦ 予約実行: ゲストは予約時にアカウント作成（パスワード設定）。既存会員はログイン。
3. マイページ
    ◦ 予約履歴の確認。
    ◦ ユーザ情報の更新（名前、メアド、電話番号、パスワード）
    ◦ キャンセル不可: システム上でのキャンセルは不可。「キャンセルは店舗へお電話ください」と表示する。
B. 店舗管理者向け機能 (Back Office)
1. ダッシュボード
    ◦ 本日の予約件数、直近の予約リスト表示。
2. スタッフ管理
    ◦ スタッフのCRUD、表示順設定。
    ◦ Google連携: スタッフ個人のGoogleアカウントとOAuth連携し、トークンを保存。
3. スケジュール・シフト管理
    ◦ 予約台帳: スタッフ別の予約カレンダー表示。
    ◦ シフト設定: スタッフごとに「出勤」「休憩（ブロック）」「公休」を設定。
4. メニュー管理
    ◦ メニュー名、所要時間の設定。※金額設定はなし。
5. 店舗設定
    ◦ 基本情報（住所、電話番号、スラッグ）、デザイン（カラー、画像）。
    ◦ メールテンプレート編集、通知設定。
C. 非機能要件
• セキュリティ: Supabase RLSによる厳格なデータアクセス制御。Googleリフレッシュトークンの保護。
• 排他制御: 同一スタッフ・時間帯へのダブルブッキング防止。

--------------------------------------------------------------------------------

2. 基本設計 (Basic Design)
2.1 技術スタック
カテゴリ
技術選定
備考
Frontend
Next.js (App Router)
Reactフレームワーク
Backend
Next.js API Routes / Supabase
Serverless Functions
Database
Supabase (PostgreSQL)
DB & Auth
Storage
Supabase Storage
画像ホスティング
Styling
Tailwind CSS
UIスタイリング
External API
Google Calendar API
双方向同期
Mail
Resend / SendGrid
トランザクションメール

2.2 画面遷移図 (Routing)
• Public (予約サイト)
    ◦ /[slug] : 店舗トップ
    ◦ /[slug]/book : 予約ウィザード (Step: Staff -> Menu -> Date -> Auth -> Confirm)
    ◦ /[slug]/complete : 予約完了
    ◦ /mypage : マイページ (予約履歴)
• Admin (店舗管理)
    ◦ /admin : ダッシュボード
    ◦ /admin/calendar : 予約台帳・シフト
    ◦ /admin/staffs : スタッフ管理・Google連携
    ◦ /admin/menus : メニュー設定
    ◦ /admin/settings : 店舗設定・メール設定

--------------------------------------------------------------------------------

3. 詳細設計 (Detailed Design)
3.1 データベース設計 (ER図)
@startuml
!theme plain
hide circle
skinparam linetype ortho

package "Supabase Auth" {
  entity "auth.users" as auth_users {
    id : uuid <<PK>>
    email : varchar
    --
  }
}

package "Public Schema" {
  entity "stores" as stores {
    *id : uuid <<PK>>
    --
    *name : varchar(255)
    *slug : varchar(50) <<Unique>>
    phone : varchar(20)
    address : text
    description : text
    hero_image_url : text
    logo_image_url : text
    *owner_id : uuid <<FK>>
    created_at : timestamptz
  }

  entity "staffs" as staffs {
    *id : uuid <<PK>>
    --
    *store_id : uuid <<FK>>
    *name : varchar(100)
    description : text
    image_url : text
    role : varchar(20)
    is_active : boolean
    google_calendar_id : varchar(255)
    google_refresh_token : text
    display_order : integer
  }

  entity "menus" as menus {
    *id : uuid <<PK>>
    --
    *store_id : uuid <<FK>>
    *name : varchar(100)
    description : text
    *duration_minutes : integer
    is_active : boolean
    display_order : integer
  }

  entity "bookings" as bookings {
    *id : uuid <<PK>>
    --
    *store_id : uuid <<FK>>
    *staff_id : uuid <<FK>>
    *user_id : uuid <<FK>>
    *start_at : timestamptz
    *end_at : timestamptz
    *total_duration : integer
    *status : varchar(20)
    google_event_id : text
    created_at : timestamptz
  }

  entity "booking_menus" as booking_menus {
    *id : uuid <<PK>>
    --
    *booking_id : uuid <<FK>>
    *menu_id : uuid <<FK>>
  }

  entity "shifts" as shifts {
    *id : uuid <<PK>>
    --
    *staff_id : uuid <<FK>>
    *start_at : timestamptz
    *end_at : timestamptz
    *type : varchar(20)
  }

  entity "site_settings" as site_settings {
    *store_id : uuid <<PK, FK>>
    --
    theme_color : jsonb
    booking_interval_minutes : integer
    mail_config : jsonb
    notification_config : jsonb
  }
}

stores ||..o{ staffs
stores ||..o{ menus
stores ||..o{ bookings
stores ||--|| site_settings
staffs ||..o{ bookings
staffs ||..o{ shifts
menus ||..o{ booking_menus
bookings ||..o{ booking_menus
auth_users ||..o{ bookings
@enduml

3.2 DDL (Table Definitions)
以下はSupabaseのSQL Editorで実行するDDLスクリプトです。
-- UUID拡張機能の有効化
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. 店舗テーブル
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

-- 2. サイト設定
CREATE TABLE site_settings (
  store_id UUID PRIMARY KEY REFERENCES stores(id) ON DELETE CASCADE,
  theme_color JSONB DEFAULT '{"primary": "#000000"}',
  booking_interval_minutes INTEGER DEFAULT 30,
  mail_config JSONB DEFAULT '{}',
  notification_config JSONB DEFAULT '{"digest_time": "21:00", "enabled": true}'
);

-- 3. スタッフ
CREATE TABLE staffs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  image_url TEXT,
  role VARCHAR(20) DEFAULT 'staff',
  is_active BOOLEAN DEFAULT true,
  google_calendar_id VARCHAR(255),
  google_refresh_token TEXT, -- RLSで管理者以外参照不可に設定すること
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. メニュー (価格カラム削除済み)
CREATE TABLE menus (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  duration_minutes INTEGER NOT NULL,
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0
);

-- 5. シフト (スタッフ単位)
CREATE TABLE shifts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  staff_id UUID NOT NULL REFERENCES staffs(id) ON DELETE CASCADE,
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ NOT NULL,
  type VARCHAR(20) NOT NULL DEFAULT 'work' -- 'work', 'break', 'holiday'
);

-- 6. 予約
CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  staff_id UUID NOT NULL REFERENCES staffs(id),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ NOT NULL,
  total_duration INTEGER NOT NULL,
  status VARCHAR(20) DEFAULT 'reserved', -- 'reserved', 'cancelled', 'completed'
  google_event_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. 予約詳細 (メニュー紐付け)
CREATE TABLE booking_menus (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  menu_id UUID NOT NULL REFERENCES menus(id)
);

-- インデックス作成
CREATE INDEX idx_bookings_store_date ON bookings (store_id, start_at);
CREATE INDEX idx_shifts_staff_date ON shifts (staff_id, start_at);

-- RLS (Row Level Security) の有効化
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE staffs ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
-- ※各テーブルへのPolicy設定は実装時に詳細化する

3.3 予約空き枠算出ロジック (API Logic)
予約システムの核となる空き枠計算ロジックです。
API Endpoint: GET /api/availability
処理フロー:
1. 入力: staff_id, date, duration_minutes を受け取る。
2. データ取得 (並列):
    ◦ DB Shift: 対象日の shifts (type='work') を取得。
    ◦ DB Block: 対象日の shifts (type='break' OR 'holiday') を取得。
    ◦ DB Bookings: 対象日の bookings を取得。
    ◦ Google: 対象スタッフのGoogleカレンダーから FreeBusy 情報を取得。
3. スロット計算:
    ◦ 店舗の booking_interval 刻みで時間を生成（例: 10:00, 10:30...）。
    ◦ 各スロットについて start_time から start_time + duration の期間を判定。
4. 判定条件:
    ◦ work シフトの範囲内であるか？
    ◦ break シフトと重なっていないか？
    ◦ 既存の bookings と重なっていないか？
    ◦ Googleカレンダーの busy と重なっていないか？
    ◦ 全てクリアなら「予約可能」として配列に追加。
5. レスポンス: 予約可能な開始時間の配列（例: ["10:00", "14:30"]）を返す。
3.4 予約確定トランザクション (Sequence Diagram)
@startuml
participant Client
participant "Next.js API" as API
participant "Supabase DB" as DB
participant "Google Calendar" as Google
participant "Mailer (Resend)" as Mail

Client -> API: POST /api/bookings
activate API

API -> DB: BEGIN Transaction
API -> DB: INSERT bookings
API -> DB: INSERT booking_menus
API -> DB: COMMIT Transaction

alt Google連携あり
  API -> Google: Events.insert
  Google --> API: event_id
  API -> DB: UPDATE bookings SET google_event_id
end

par Async Notification
  API -> Mail: 顧客へ予約完了メール送信
  API -> Mail: 管理者へ通知メール送信
end

API --> Client: 200 OK (予約完了)
deactivate API
@enduml

3.5 バッチ処理 (Cron Job)
• 日次ダイジェスト通知
    ◦ 目的: 管理者がシステムにログインしなくても予約状況を把握できるようにする。
    ◦ 実行: 毎日 21:00 (JST)
    ◦ 処理: 当日発生した新規予約を店舗ごとに集計し、管理者のメールアドレスへ送信。
• 自動データ削除
    ◦ 仕様: 物理削除は行わず、古いデータのアーカイブ等は必要に応じて検討（初期リリースでは実装しない）。

--------------------------------------------------------------------------------

4. プロジェクト構成 (Directory Structure)
Next.js App Routerを用いた推奨構成です。
app/
├── [slug]/                  # 店舗公開ページ
│   ├── page.tsx             # トップ（メニュー選択）
│   ├── book/                # 予約ウィザード
│   │   ├── page.tsx         # ステップ制御 (Client Component)
│   │   └── layout.tsx
│   └── complete/            # 完了画面
├── admin/                   # 管理画面 (要認証)
│   ├── dashboard/
│   ├── calendar/            # 予約台帳
│   ├── staffs/              # スタッフ管理
│   ├── menus/
│   └── settings/
├── api/
│   ├── availability/        # 空き枠計算API
│   ├── bookings/            # 予約作成API
│   └── cron/                # バッチ処理用
└── layout.tsx






—------------------------------------------------------------------------------

サロン予約システム 詳細設計書 (v3.1 Revised)
変更履歴:
• Google双方向同期: WebhookによるGoogleカレンダー側の変更検知を追加。
• 認証フロー: メール確認（Confirm）をスキップし、即時予約完了とするフローに変更。
• タイムゾーン: 入力をJST、DB保存・検索をUTCとする変換ロジックを明記。
• 除外項目: 店舗全体の定休日設定、メニュー間のバッファ設定は実装しない。

--------------------------------------------------------------------------------

2. API ロジック詳細設計 (Logic Design)
2.1 予約可能枠算出 (GET /api/availability)
重要: タイムゾーン処理 フロントエンドからは「日本時間 (JST)」でリクエストが来るが、DBおよびGoogle APIは「協定世界時 (UTC)」で扱うため、API入り口で厳密な変換を行う。
アルゴリズム手順
1. 入力パラメータ (JST)
• staff_id: UUID
• date: YYYY-MM-DD (例: "2023-10-25" ※日本時間)
• duration: Integer (分)
2. 期間設定 (JST -> UTC変換)
• ライブラリ date-fns-tz または dayjs を使用。
• JST範囲: 2023-10-25 00:00:00 〜 2023-10-25 23:59:59
• UTC検索範囲: 2023-10-24 15:00:00 〜 2023-10-25 14:59:59
• DB検索時はこのUTC検索範囲を使用する。
3. データ取得 (並列処理)
• A. DBシフト: shifts テーブルから対象スタッフのUTC範囲内のレコードを取得。
• B. DB予約: bookings テーブルから対象スタッフのUTC範囲内のレコードを取得。
• C. Google予定: staffs テーブルの google_refresh_token を使用してGoogle Calendar API (FreeBusy) をコール。
    ◦ Request: timeMin (UTC), timeMax (UTC)
    ◦ Response: busy 配列 (UTC)
4. スロット計算 & 判定
1. 店舗設定の booking_interval (例: 30分) に従い、JST基準 で営業時間のスロットを生成する（例: 10:00, 10:30...）。
2. 各スロットを UTCに変換 して判定を行う。
    ◦ TargetStartUTC = 2023-10-25 10:00 (JST) -> 2023-10-25 01:00 (UTC)
    ◦ TargetEndUTC = TargetStartUTC + duration
3. 判定条件 (全てクリアでOK):
    ◦ Shift Check: shifts (type='work') の範囲内か？
    ◦ Break Check: shifts (type='break' OR 'holiday') と重複しないか？
    ◦ Booking Check: 既存の bookings と重複しないか？
    ◦ Google Check: Googleからの busy リストと重複しないか？
5. レスポンス
• 予約可能な開始時間を 文字列 (例: "10:00", "10:30") の配列として返す。

--------------------------------------------------------------------------------

2.2 Google連携 & 双方向同期 (Two-way Sync)
Googleカレンダー側で行われた変更（削除・時間変更）をシステムに反映させるため、Webhook (Push Notifications) を導入する。
A. システム → Google (予約時)
• 予約確定時に Google Calendar API (events.insert) をコール。
• 作成された google_event_id を bookings テーブルに保存。
B. Google → システム (Webhook)
• エンドポイント: POST /api/webhooks/google
• トリガー: Googleカレンダー上で予定が「変更」または「削除」された時。
• 処理フロー:
    1. Googleから通知 (X-Goog-Resource-ID) を受信。
    2. 該当するスタッフのカレンダーを特定。
    3. 変更されたイベントID (google_event_id) に紐づく bookings を検索。
    4. ステータス同期:
        ▪ Google側で削除されている場合 → システム側の予約を cancelled に更新し、顧客へメール通知。
        ▪ Google側で時間変更されている場合 → システム側の start_at, end_at を更新（※衝突チェックが必要）。
    ◦ ※実装簡易化のため、初期フェーズでは「Google側での削除＝キャンセル」のみ対応し、時間変更は「一度キャンセルして再予約」を促す運用も検討可能。

--------------------------------------------------------------------------------

2.3 ゲスト予約 & 認証フロー (Auth Flow)
「メール確認リンク」を踏ませるステップを排除し、予約完了と同時にログイン済み状態とする。
処理フロー
1. 入力フォーム (Client):
    ◦ 氏名、メールアドレス、電話番号、パスワードを入力させる。
2. APIリクエスト (Server):
    ◦ supabase.auth.admin.createUser を使用（サーバーサイド処理）。
    ◦ オプション: email_confirm: true (自動確認済みとして作成)。
    ◦ user_metadata に氏名・電話番号を保存。
3. 予約作成:
    ◦ 作成した user_id を使用して bookings テーブルに INSERT。
4. 通知メール送信 (編集可能):
    ◦ site_settings の mail_config から「予約完了メールテンプレート」を取得。
    ◦ 本文には予約内容に加え、「会員登録が完了しました」旨を記載する。
    ◦ ※セキュリティ上、メール本文にパスワードは記載せず、「設定したパスワードで次回からログインできます」と案内する。

--------------------------------------------------------------------------------

3. データベース設計追記 (Schema Update)
site_settings テーブルの mail_config カラムの構成を具体化し、編集可能なメール種別を定義する。
-- site_settings テーブル定義の補足
-- mail_config JSONB の構造例:
{
  "booking_completed": {
    "subject": "【{{store_name}}】ご予約ありがとうございます",
    "body": "{{name}}様\n\nご予約を受け付けました。\n日時: {{date}}\n..."
  },
  "booking_cancelled": {
    "subject": "【{{store_name}}】ご予約キャンセルのご連絡",
    "body": "..."
  },
  "remind_day_before": {
    "subject": "【{{store_name}}】明日のご予約確認",
    "body": "..."
  },
  -- 新規追加: アカウント自動作成時の案内
  "account_created_note": "同時に会員登録が完了しました。ご自身で設定されたパスワードで次回ログイン可能です。"
}


--------------------------------------------------------------------------------

4. ルーティング設計 (Routing Update)
Webhook用のルートを追加。
• app/
    ◦ api/
        ▪ webhooks/
            • google/
                ◦ route.ts : Google Calendar Push Notification 受信
        ▪ availability/ : 空き枠計算 (JST/UTC変換)
        ▪ bookings/ : 予約作成 (Auth自動作成含む)



# サロン予約システム 総合要件定義書・基本設計書 (v3.0)

## 1. システム概要
本システムは、複数の店舗（サロン）が利用可能なマルチテナント型の予約管理プラットフォームである。
各店舗は専用のURL（スラッグ）を持ち、顧客からの予約受付、顧客管理、スタッフ管理、およびスタッフごとのGoogleカレンダー連携によるスケジュール管理を一元的に行うことができる。
**「ワンオペサロン」から「複数スタッフ在籍サロン」まで柔軟に対応する。**

---

## 2. 技術スタック・インフラ構成

| カテゴリ | 技術選定 | 備考 |
| :--- | :--- | :--- |
| **Frontend** | Next.js (App Router) | Reactベースのフレームワーク |
| **Backend** | Next.js API Routes / Supabase | サーバーレス構成 |
| **Language** | TypeScript | 型安全性確保 |
| **Database** | Supabase (PostgreSQL) | リレーショナルデータベース |
| **Auth** | Supabase Auth | メール/パスワード認証、OAuth |
| **Storage** | Supabase Storage | 店舗・スタッフ画像、メニュー画像のホスティング |
| **Styling** | Tailwind CSS | ユーティリティファーストCSS |
| **Infra** | Vercel (推奨) | ホスティング環境 |
| **External API** | Google Calendar API | **スタッフ単位**での双方向スケジュール同期 |
| **Mail** | Resend / SendGrid | トランザクションメール配信 |

---

## 3. アクター定義（ユーザーロール）

1.  **スーパー管理者 (Super Admin)**
    * プラットフォーム全体の管理者。全店舗のデータ閲覧・操作権限を持つ。
2.  **店舗管理者 (Store Manager)**
    * 各サロンのオーナーまたは店長。自店舗の設定、スタッフ管理、予約管理を行う。
3.  **顧客 (User/Guest)**
    * 予約を行うエンドユーザー。会員登録必須（予約フロー内で行う）。

---

## 4. 機能要件一覧

### 4.1 顧客向け機能 (Front Office)

#### A. 店舗ページ閲覧・予約フロー
* **店舗トップページ:** ヒーロー画像、店舗名、アクセスの表示。（※スタッフ一覧はトップページには表示しない）
* **スタッフ選択:**
    * 予約する担当スタッフを選択する。
    * **指名なし（フリー）**を選択可能（全スタッフの空き状況を合算）。
    * ※スタッフが1名のみの場合はこのステップを自動スキップする。
* **メニュー選択:**
    * 施術メニュー一覧の表示。金額表示なし。
    * **複数選択可能**（例：カット＋カラー）。合計所要時間を自動計算する。
* **日時選択:**
    * 選択したスタッフ（またはフリー）のシフト、既存予約、Googleカレンダーの予定を考慮した「空き枠」のみを表示。
* **予約実行:**
    * ゲスト予約：氏名、メール、電話番号入力（同時にアカウント作成）。
    * 既存会員：ログインして予約。

#### B. マイページ
* **ログイン/ログアウト:** 認証機能。
* **予約履歴確認:** 過去履歴および未来の予約（担当スタッフ名含む）の確認。
* **予約キャンセル不可:**
    * システム上でのキャンセル操作は不可とする。
    * 「キャンセルの場合は店舗へお電話ください」という文言と電話番号を表示する。
* **会員情報編集:** プロフィール更新。

### 4.2 店舗管理者向け機能 (Back Office / Manager)

#### A. ダッシュボード
* **予約状況概観:** 本日の予約件数、担当者別の予約リスト表示。

#### B. スタッフ管理
* **スタッフCRUD:** スタッフの登録、編集、削除（論理削除）。
* **表示順設定:** 予約サイトでのスタッフ表示順。
* **Google連携設定:** **スタッフごとに**Googleアカウントを連携し、OAuth認証を行う。

#### C. スケジュール・シフト管理
* **予約台帳:** カレンダー形式で予約を表示（スタッフ別フィルタリング機能）。
* **シフト設定:** スタッフごとに「出勤日」「公休」「休憩時間（ブロック枠）」を設定。
* **手動予約登録:** 電話予約等を管理者が代理登録。
* **手動キャンセル:** 電話連絡を受けた予約に対し、管理者がシステム上でキャンセル処理を実行する。

#### D. メニュー管理
* **メニューCRUD:** 施術メニューの作成・編集。**施術時間**の設定。（※金額設定は不要）

#### E. 店舗設定
* **基本情報:** 店舗名、スラッグ、住所、電話番号。
* **デザイン:** テーマカラー、メイン画像、ロゴ画像のアップロード（Supabase Storage）。
* **予約ルール:** 予約受付期間（開始日、公開期間）の設定。（※キャンセルポリシー設定は不要）

#### F. メール・通知設定
* **テンプレート編集:** 以下のメール本文を編集可能にする。
    * 会員登録完了メール
    * 予約完了メール（顧客宛）
    * リマインドメール（顧客宛）
* **リマインド設定:**
    * リマインドメールを送付するタイミングを設定（例：来店日の「1日前」の「18:00」）。
* **管理者通知設定:**
    * **新規予約通知:** 新規予約が入った際、管理者のメールアドレスに通知を送る。
    * **通知条件設定:** 通知を行う期間や、送信時間を指定する設定機能。

#### G. 外部連携 (Google Calendar)
* **スタッフ単位の同期:**
    * システムで予約が入ると、担当スタッフのGoogleカレンダーに予定を作成。
    * スタッフのGoogleカレンダーにある予定（「私用」など）を、システム側で「予約不可」としてブロック。

---

## 5. データベース設計 (スキーマ定義)

### ER図 (PlantUML)

```plantuml
@startuml

!theme plain
hide circle
skinparam linetype ortho

entity "stores" as stores {
  *id : uuid <<PK>>
  --
  name : text
  slug : text <<unique>>
  phone : text
  address : text
  description : text
  hero_image_url : text
  logo_image_url : text
  owner_id : uuid <<FK>>
  created_at : timestamp
}

entity "staffs" as staffs {
  *id : uuid <<PK>>
  --
  *store_id : uuid <<FK>>
  name : text
  description : text
  image_url : text
  role : text
  is_active : boolean
  google_calendar_id : text
  google_refresh_token : text
  display_order : integer
}

entity "menus" as menus {
  *id : uuid <<PK>>
  --
  *store_id : uuid <<FK>>
  name : text
  description : text
  duration_minutes : integer
  is_active : boolean
}

entity "bookings" as bookings {
  *id : uuid <<PK>>
  --
  *store_id : uuid <<FK>>
  *staff_id : uuid <<FK>>
  *user_id : uuid <<FK>>
  start_at : timestamp
  end_at : timestamp
  total_duration : integer
  status : text (reserved/cancelled/completed)
  google_event_id : text
  created_at : timestamp
}

entity "booking_menus" as booking_menus {
  *id : uuid <<PK>>
  --
  *booking_id : uuid <<FK>>
  *menu_id : uuid <<FK>>
}

entity "shifts" as shifts {
  *id : uuid <<PK>>
  --
  *staff_id : uuid <<FK>>
  start_at : timestamp
  end_at : timestamp
  type : text (work/break/holiday)
  is_recurring : boolean
}

entity "profiles" as profiles {
  *id : uuid <<PK>> (auth.users)
  --
  email : text
  full_name : text
  phone : text
}

entity "site_settings" as site_settings {
  *store_id : uuid <<PK, FK>>
  --
  theme_color : jsonb
  booking_interval_minutes : integer
  mail_config : jsonb
  notification_config : jsonb
}

stores ||..o{ staffs : "雇用"
stores ||..o{ menus : "提供"
stores ||..o{ bookings : "管理"
stores ||--|| site_settings : "設定"

staffs ||..o{ bookings : "担当"
staffs ||..o{ shifts : "シフト"

menus ||..o{ booking_menus : "構成"
bookings ||..o{ booking_menus : "内訳"

profiles ||..o{ bookings : "予約"

@enduml


### 主要テーブル解説

| テーブル名 | 説明 | 変更点 |
| :--- | :--- | :--- |
| `stores` | 店舗基本情報 | 画像URLカラム追加 |
| `staffs` | スタッフ情報 | Google連携トークン、シフト管理の親 |
| `menus` | メニュー情報 | **金額カラム(`price`)を削除** |
| `bookings` | 予約データ | `total_price`削除。`staff_id`必須化。 |
| `booking_menus` | 予約とメニューの中間 | `price_snapshot`削除。メニュー構成のみ保持。 |
| `shifts` | シフト・ブロック枠 | 店舗単位から`staff_id`単位に変更 |
| `site_settings` | サイト・メール設定 | `mail_config`（本文テンプレート等）、`notification_config`（管理者通知条件）を追加。キャンセルポリシー削除。 |

---

## 6. ルーティング・画面遷移設計

### フロントエンド (予約サイト)
* `/[slug]` : 店舗トップ（店舗情報・メニュー一覧）※スタッフ一覧は非表示
* `/[slug]/book` : 予約ウィザード
    1.  **Staff Select:** スタッフ選択（1名なら自動スキップ）
    2.  **Menu Select:** メニュー複数選択（金額表示なし）
    3.  **Date Select:** 空き枠カレンダー表示
    4.  **Auth/Input:** ログイン or 会員登録
    5.  **Confirm:** 確認画面
* `/[slug]/complete` : 予約完了画面
* `/mypage` : マイページ（予約履歴のみ。キャンセルは電話誘導）

### 管理画面 (店舗管理者)
* `/admin` : ダッシュボード
* `/admin/calendar` : 予約カレンダー（スタッフ別フィルタあり）
* `/admin/bookings` : 予約リスト（詳細画面から手動キャンセル実行）
* `/admin/staffs` : スタッフ管理・Google連携設定
* `/admin/shifts` : スタッフ別シフト管理
* `/admin/menus` : メニュー管理（時間のみ設定）
* `/admin/settings` : 店舗設定・画像管理・メール/通知設定

---

## 7. 非機能要件 (Security & Performance)

### RLS (Row Level Security)
* **staffs:** 公開情報は誰でも閲覧可。トークン等の機密情報は管理者(owner)のみ参照可。
* **bookings:** 管理者と予約本人のみ参照可。

### 排他制御
* 同一スタッフ・同一時間帯への同時アクセス予約時の重複防止（PostgreSQL Transaction）。

### メール配信
* Next.js API Routes または Supabase Edge Functions から Resend/SendGrid API をコールして送信。
* リマインドメール等は Supabase の pg_cron や Edge Functions の Scheduled trigger を利用して定期実行する。




# サロン予約システム 詳細設計書 (Implementation Design)

## 1. データベース物理設計 (Supabase / PostgreSQL)
SupabaseのSQLエディタで実行可能なDDL（Data Definition Language）です。

### 1.1 ER図 (Physical Schema)

```plantuml
@startuml
!theme plain
hide circle
skinparam linetype ortho

package "Supabase Auth" {
    entity "auth.users" as auth_users {
        id : uuid <<PK>>
        email : varchar
        --
    }
}

package "Public Schema" {
    entity "stores" as stores {
        *id : uuid <<PK>> (gen_random_uuid)
        --
        *name : varchar(255)
        *slug : varchar(50) <<UNIQUE>>
        phone : varchar(20)
        address : text
        description : text
        hero_image_url : text
        logo_image_url : text
        *owner_id : uuid <<FK>>
        created_at : timestamptz
        updated_at : timestamptz
    }

    entity "staffs" as staffs {
        *id : uuid <<PK>>
        --
        *store_id : uuid <<FK>>
        *name : varchar(100)
        description : text
        image_url : text
        role : varchar(20)
        is_active : boolean
        google_calendar_id : varchar(255)
        google_refresh_token : text
        display_order : integer
        created_at : timestamptz
    }

    entity "menus" as menus {
        *id : uuid <<PK>>
        --
        *store_id : uuid <<FK>>
        *name : varchar(100)
        description : text
        *duration_minutes : integer
        is_active : boolean
        display_order : integer
    }

    entity "bookings" as bookings {
        *id : uuid <<PK>>
        --
        *store_id : uuid <<FK>>
        *staff_id : uuid <<FK>>
        *user_id : uuid <<FK>>
        *start_at : timestamptz
        *end_at : timestamptz
        *total_duration : integer
        *status : varchar(20)
        google_event_id : text
        created_at : timestamptz
    }

    entity "booking_menus" as booking_menus {
        *id : uuid <<PK>>
        --
        *booking_id : uuid <<FK>>
        *menu_id : uuid <<FK>>
    }

    entity "shifts" as shifts {
        *id : uuid <<PK>>
        --
        *staff_id : uuid <<FK>>
        *start_at : timestamptz
        *end_at : timestamptz
        *type : varchar(20)
    }

    entity "site_settings" as site_settings {
        *store_id : uuid <<PK, FK>>
        --
        theme_color : jsonb
        booking_interval_minutes : integer (default: 30)
        mail_config : jsonb
        notification_config : jsonb
    }
}

stores ||--o{ staffs
stores ||--o{ menus
stores ||--o{ bookings
stores ||--|| site_settings
staffs ||--o{ bookings
staffs ||--o{ shifts
menus ||--o{ booking_menus
bookings ||--o{ booking_menus
auth_users ||--o{ bookings

@enduml
###1.2 DDL (SQL Script)
-- 基本設定
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. 店舗テーブル
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

-- 2. サイト設定 (1:1 with stores)
CREATE TABLE site_settings (
  store_id UUID PRIMARY KEY REFERENCES stores(id) ON DELETE CASCADE,
  theme_color JSONB DEFAULT '{"primary": "#000000"}',
  booking_interval_minutes INTEGER DEFAULT 30,
  mail_config JSONB DEFAULT '{}', -- テンプレート情報
  notification_config JSONB DEFAULT '{"digest_time": "21:00", "enabled": true}'
);

-- 3. スタッフ
CREATE TABLE staffs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  image_url TEXT,
  role VARCHAR(20) DEFAULT 'staff', -- 'manager', 'staff'
  is_active BOOLEAN DEFAULT true,
  google_calendar_id VARCHAR(255),
  google_refresh_token TEXT, -- RLSで隠蔽必須
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. メニュー
CREATE TABLE menus (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  duration_minutes INTEGER NOT NULL,
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0
);

-- 5. シフト・ブロック枠
CREATE TABLE shifts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  staff_id UUID NOT NULL REFERENCES staffs(id) ON DELETE CASCADE,
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ NOT NULL,
  type VARCHAR(20) NOT NULL DEFAULT 'work' -- 'work' (出勤), 'break' (休憩), 'holiday' (公休)
);

-- 6. 予約
CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  staff_id UUID NOT NULL REFERENCES staffs(id),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ NOT NULL,
  total_duration INTEGER NOT NULL,
  status VARCHAR(20) DEFAULT 'reserved', -- 'reserved', 'cancelled', 'completed'
  google_event_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. 予約-メニュー中間テーブル
CREATE TABLE booking_menus (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  menu_id UUID NOT NULL REFERENCES menus(id)
);

-- インデックス作成 (パフォーマンス最適化)
CREATE INDEX idx_bookings_store_date ON bookings (store_id, start_at);
CREATE INDEX idx_shifts_staff_date ON shifts (staff_id, start_at);

###1.3 RLS (Row Level Security) 設定方針
-- RLS有効化
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE staffs ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
-- (他テーブルも同様に)

-- ポリシー例: Staffs
-- 誰でも参照可能
CREATE POLICY "Public staffs are viewable by everyone" ON staffs FOR SELECT USING (true);
-- 管理者のみ更新可能
CREATE POLICY "Owners can update their staffs" ON staffs FOR UPDATE USING (
  EXISTS (SELECT 1 FROM stores WHERE stores.id = staffs.store_id AND stores.owner_id = auth.uid())
);
-- 重要: google_refresh_token は別途 View を作るか、Supabase Client で select('*, google_refresh_token') を管理者以外除外する


##2. API ロジック詳細設計
###2.1 予約可能枠算出 (GET /api/availability)
このAPIがシステムの核となります。Googleカレンダーとの動的連携を含みます。
####アルゴリズム手順####
入力パラメータ:
staff_id: UUID
date: YYYY-MM-DD
duration: Integer (合計施術時間、例: 90分)
データ取得 (並列処理):
A. DBシフト取得: shifts テーブルから対象スタッフ・対象日の「出勤(work)」範囲を取得。
B. DBブロック取得: shifts テーブルから対象スタッフ・対象日の「休憩(break)」範囲を取得。
C. DB既存予約取得: bookings テーブルから対象スタッフ・対象日の予約(reserved)を取得。
D. Google予定取得: staffs テーブルからTokenを取得し、Google Calendar API (freebusy) を叩いて予定あり(busy)の時間帯を取得。
時間枠計算:
店舗の booking_interval_minutes (例: 30分) 刻みで、営業時間の開始〜終了までループ。
各スロット (例: 10:00) について、start_time = 10:00, end_time = 10:00 + duration(90分) = 11:30 とする。
判定ロジック:
IF (時間枠がシフト(work)の範囲内である)
AND (時間枠がシフト(break)と重ならない)
AND (時間枠が既存予約(bookings)と重ならない)
AND (時間枠がGoogle予定(busy)と重ならない)
THEN => 予約可能リストに追加
レスポンス:
配列 ["10:00", "10:30", "14:00"] を返却。
###2.2 予約確定トランザクション (POST /api/bookings)
データの不整合を防ぐため、以下の順序で実行します。
@startuml
participant Client
participant API
participant DB
participant Google
participant Mailer

Client -> API: 予約リクエスト
activate API

API -> DB: Transaction Start
API -> DB: INSERT bookings
API -> DB: INSERT booking_menus
API -> DB: Transaction Commit

opt Google連携あり
    API -> Google: イベント作成 (Insert Event)
    Google --> API: event_id
    API -> DB: UPDATE bookings SET google_event_id
end

API -> Mailer: 予約完了メール送信 (User宛)

API --> Client: 200 OK
deactivate API
@enduml

## 3. バッチ処理・定期実行ジョブ

### 3.1 管理者向けダイジェスト通知
* **実行環境:** Vercel Cron (推奨) または Supabase pg_cron
* **スケジュール:** 毎日 21:00 (JST)
* **エンドポイント:** `/api/cron/digest`

**処理ロジック**

1.  **対象店舗抽出:** `site_settings` から `notification_config->>'enabled' = true` の店舗を取得。
2.  **期間設定:**
    * `start`: 前回の実行時間 (または 前日 21:00)
    * `end`: 現在時刻
3.  **予約検索:**
    * 各店舗について、`bookings` テーブルを検索。
    * 条件: `store_id` = 対象店舗 AND `created_at` BETWEEN start AND end
4.  **メール送信:**
    * 予約件数が 1件以上の場合、`notification_config->>'target_email'` 宛にメール送信。
    * **件名:** `【{store_name}】本日の新規予約報告 ({count}件)`
    * **本文:** 予約者名、日時、担当スタッフ名、メニューのリスト。

---

## 4. フロントエンド詳細設計

### 4.1 予約ウィザードの状態管理
予約フローは複数画面にまたがるため、URLパラメータではなく、React Context または Zustand で状態を保持します。

**State Interface:**

```typescript
interface BookingState {
  storeId: string;
  staff: Staff | null;     // Step 1で決定
  menus: Menu[];           // Step 2で決定 (複数)
  selectedDate: Date;      // Step 3で決定
  selectedSlot: string;    // Step 3で決定 (例 "14:00")
  totalDuration: number;   // menusから計算
  guestInfo?: {            // Step 4 (Guestの場合)
    name: string;
    email: string;
    phone: string;
  };
}
## 4.2 ディレクトリ構成 (App Router)
app/
  [slug]/
    page.tsx           # 店舗トップ (店舗情報・メニュー閲覧)
    book/
      layout.tsx       # 予約ウィザード用レイアウト (Stepバーなど)
      page.tsx         # ステップ管理コンポーネント (Client Component)
      _components/
        StepStaff.tsx
        StepMenu.tsx
        StepCalendar.tsx # SWR等で /api/availability をfetch
        StepAuth.tsx
        StepConfirm.tsx
    complete/
      page.tsx         # サンクスページ
  admin/               # 管理画面 (layout.tsxでAuth Guard)
    dashboard/
    calendar/
    staffs/
    settings/
api/
  availability/
    route.ts           # GET: 空き枠取得
  bookings/
    route.ts           # POST: 予約作成
  cron/
    digest/
      route.ts         # ダイジェストメール送信


## 5. Google連携 実装メモ
####必要なScopes####
https://www.googleapis.com/auth/calendar (読み書き)
https://www.googleapis.com/auth/calendar.events
####トークン管理####
Access Token: 有効期限が短い(1時間)。DBには保存せず、メモリ上または直近のキャッシュのみ。
Refresh Token: 必須。 staffs テーブルに暗号化(Supabase Vault推奨、簡易実装なら平文だがRLS厳守)して保存。
更新ロジック: APIリクエスト前にAccess Tokenの期限を確認し、切れていればRefresh Tokenを使って再取得するミドルウェアを作成する。