import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

const BUCKET = "store-images";
const MAX_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const ALLOWED_EXTENSIONS = ["jpg", "jpeg", "png", "webp", "gif"];
const ALLOWED_IMAGE_TYPES = ["hero", "logo"];

/**
 * POST /api/admin/upload
 * Supabase Storage への画像アップロード
 *
 * FormData: file (File), store_id (string), type ("hero" | "logo")
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient();

  // 認証チェック
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const storeId = formData.get("store_id") as string | null;
  const imageType = formData.get("type") as string | null;

  if (!file || !storeId || !imageType) {
    return NextResponse.json(
      { error: "file, store_id, type は必須です" },
      { status: 400 },
    );
  }

  // 所有権チェック
  const { data: store } = await supabase
    .from("stores")
    .select("id, owner_id")
    .eq("id", storeId)
    .single();

  if (!store || store.owner_id !== user.id) {
    return NextResponse.json({ error: "権限がありません" }, { status: 403 });
  }

  // バリデーション
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: "JPEG, PNG, WebP, GIF のみアップロード可能です" },
      { status: 400 },
    );
  }

  if (file.size > MAX_SIZE) {
    return NextResponse.json(
      { error: "ファイルサイズは 5MB 以内にしてください" },
      { status: 400 },
    );
  }

  // imageType のホワイトリスト検証
  if (!ALLOWED_IMAGE_TYPES.includes(imageType)) {
    return NextResponse.json(
      { error: "type は hero または logo のみ指定可能です" },
      { status: 400 },
    );
  }

  // 拡張子のホワイトリスト検証（パストラバーサル防止）
  const rawExt = (file.name.split(".").pop() || "").toLowerCase().replace(/[^a-z]/g, "");
  const ext = ALLOWED_EXTENSIONS.includes(rawExt) ? rawExt : "jpg";
  const path = `${storeId}/${imageType}-${Date.now()}.${ext}`;

  // service_role クライアントでアップロード（Storage RLS をバイパス）
  // ※ 所有権チェックは上記で済んでいるため安全
  const adminSupabase = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const { error: uploadErr } = await adminSupabase.storage
    .from(BUCKET)
    .upload(path, file, {
      cacheControl: "3600",
      upsert: false,
    });

  if (uploadErr) {
    return NextResponse.json(
      { error: `アップロードに失敗しました: ${uploadErr.message}` },
      { status: 500 },
    );
  }

  // 公開URLを取得
  const { data: urlData } = adminSupabase.storage.from(BUCKET).getPublicUrl(path);

  return NextResponse.json({ url: urlData.publicUrl });
}
