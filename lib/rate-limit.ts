/**
 * シンプルなインメモリ IP ベースレート制限
 *
 * 注意: サーバーレス環境ではインスタンス間で状態を共有しないため
 * 完全な保護ではないが、単一インスタンスでのスパム防止には有効。
 * 本番環境では Redis や Upstash Rate Limit の使用を推奨。
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

// 古いエントリを定期的にクリーンアップ（メモリリーク防止）
const CLEANUP_INTERVAL = 60_000; // 1分
let lastCleanup = Date.now();

function cleanup() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;
  lastCleanup = now;
  for (const [key, entry] of store) {
    if (entry.resetAt < now) {
      store.delete(key);
    }
  }
}

/**
 * レート制限チェック
 * @param key   識別キー（IPアドレス等）
 * @param limit ウィンドウ内の最大リクエスト数
 * @param windowMs ウィンドウの長さ（ミリ秒）
 * @returns { success: true } or { success: false, retryAfterMs }
 */
export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): { success: true } | { success: false; retryAfterMs: number } {
  cleanup();

  const now = Date.now();
  const entry = store.get(key);

  if (!entry || entry.resetAt < now) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { success: true };
  }

  if (entry.count >= limit) {
    return { success: false, retryAfterMs: entry.resetAt - now };
  }

  entry.count++;
  return { success: true };
}
