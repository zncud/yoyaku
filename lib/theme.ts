import type React from "react";

/** HEX カラーの明度を調整する */
export function adjustBrightness(hex: string, percent: number): string {
  const num = parseInt(hex.replace("#", ""), 16);
  const r = Math.min(255, Math.max(0, (num >> 16) + Math.round(2.55 * percent)));
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0xff) + Math.round(2.55 * percent)));
  const b = Math.min(255, Math.max(0, (num & 0xff) + Math.round(2.55 * percent)));
  return "#" + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1);
}

/**
 * テーマカラーが設定されている場合、Tailwind v4 の CSS 変数をオーバーライドするスタイルを返す。
 * 親要素の inline style に適用することで、bg-gold / text-gold 等が自動的にカスタムカラーを継承する。
 */
export function buildThemeStyle(
  primaryHex: string | undefined,
): React.CSSProperties | undefined {
  if (!primaryHex) return undefined;
  return {
    "--color-gold": primaryHex,
    "--color-gold-light": adjustBrightness(primaryHex, 12),
    "--color-gold-dark": adjustBrightness(primaryHex, -12),
  } as React.CSSProperties;
}
