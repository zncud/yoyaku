// ============================================================
// メール送信エンジン (Resend API)
// ============================================================

const RESEND_API = "https://api.resend.com/emails";

// ─── 型定義 ───

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
}

export interface BookingEmailParams {
  storeName: string;
  storePhone: string | null;
  customerName: string;
  staffName: string;
  date: string;       // "2026-02-16" 等
  time: string;       // "10:00" 等
  duration: number;    // 分
  menuNames: string[]; // ["カット", "カラー"]
  isNewUser?: boolean;
}

export interface ReminderEmailParams {
  storeName: string;
  storePhone: string | null;
  customerName: string;
  staffName: string;
  date: string;
  time: string;
  duration: number;
  menuNames: string[];
}

export interface CancellationEmailParams {
  storeName: string;
  storePhone: string | null;
  customerName: string;
  staffName: string;
  date: string;
  time: string;
  menuNames: string[];
}

export interface AdminNotifyParams {
  storeName: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  staffName: string;
  date: string;
  time: string;
  duration: number;
  menuNames: string[];
}

// ─── メールテンプレートカスタマイズ型 ───

export interface MailTemplateOverride {
  subject?: string;
  heading?: string;
  body?: string;
  footer?: string;
}

export interface MailTemplateConfig {
  booking_confirmation?: MailTemplateOverride;
  reminder?: MailTemplateOverride;
  cancellation?: MailTemplateOverride;
  admin_notify?: MailTemplateOverride;
}

// ─── デフォルトテンプレート定数 ───

export const DEFAULT_TEMPLATES: Required<Record<keyof MailTemplateConfig, Required<MailTemplateOverride>>> = {
  booking_confirmation: {
    subject: "【{{storeName}}】ご予約ありがとうございます",
    heading: "ご予約ありがとうございます",
    body: "{{customerName}}様、以下の内容でご予約を承りました。",
    footer: "キャンセル・変更をご希望の場合は、お電話にてご連絡ください。",
  },
  reminder: {
    subject: "【{{storeName}}】明日のご予約確認",
    heading: "明日のご予約のご確認",
    body: "{{customerName}}様、明日のご予約をお知らせいたします。",
    footer: "ご来店をお待ちしております。変更がある場合はお電話ください。",
  },
  cancellation: {
    subject: "【{{storeName}}】ご予約キャンセルのご連絡",
    heading: "ご予約キャンセルのお知らせ",
    body: "{{customerName}}様、以下のご予約がキャンセルされました。",
    footer: "再度のご予約をご希望の場合は、お電話またはサイトよりお申し込みください。",
  },
  admin_notify: {
    subject: "【{{storeName}}】新規予約 {{customerName}}様 {{date}} {{time}}",
    heading: "新規予約が入りました",
    body: "",
    footer: "",
  },
};

// ─── テンプレート変数の置換 ───

function replaceVars(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => escapeHtml(vars[key] ?? ""));
}

/** 件名用: 改行・制御文字を除去してヘッダーインジェクションを防止 */
function sanitizeSubject(subject: string): string {
  return subject.replace(/[\r\n\t]/g, "");
}

// ─── 基盤: Resend API 経由でメールを送信 ───

async function sendEmail({ to, subject, html }: SendEmailParams): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("RESEND_API_KEY が未設定のためメール送信をスキップしました");
    return;
  }

  const from = process.env.RESEND_FROM ?? "noreply@resend.dev";

  const res = await fetch(RESEND_API, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from, to: [to], subject, html }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Resend API error: ${res.status} ${body}`);
  }
}

// ─── HTMLテンプレートベースレイアウト ───

function baseLayout(storeName: string, content: string): string {
  return `<!DOCTYPE html>
<html lang="ja">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 0;">
<tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
  <!-- ヘッダー -->
  <tr><td style="background:#18181b;padding:24px 32px;">
    <h1 style="margin:0;color:#ffffff;font-size:20px;font-weight:600;letter-spacing:0.5px;">${escapeHtml(storeName)}</h1>
  </td></tr>
  <!-- 本文 -->
  <tr><td style="padding:32px;">
    ${content}
  </td></tr>
  <!-- フッター -->
  <tr><td style="background:#fafafa;padding:20px 32px;border-top:1px solid #e4e4e7;">
    <p style="margin:0;color:#71717a;font-size:12px;line-height:1.6;">
      このメールは ${escapeHtml(storeName)} の予約システムから自動送信されています。<br>
      心当たりのない場合は、お手数ですが店舗までお問い合わせください。
    </p>
  </td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function detailTable(rows: [string, string][]): string {
  const trs = rows
    .map(
      ([label, value]) =>
        `<tr>
          <td style="padding:10px 12px;color:#71717a;font-size:14px;white-space:nowrap;border-bottom:1px solid #f4f4f5;">${escapeHtml(label)}</td>
          <td style="padding:10px 12px;color:#18181b;font-size:14px;border-bottom:1px solid #f4f4f5;">${escapeHtml(value)}</td>
        </tr>`
    )
    .join("");
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fafafa;border-radius:8px;margin:20px 0;">${trs}</table>`;
}

// ─── 個別テンプレート ───

function bookingConfirmationHtml(p: BookingEmailParams, tpl: Required<MailTemplateOverride>): string {
  const vars: Record<string, string> = {
    storeName: p.storeName,
    customerName: p.customerName,
    staffName: p.staffName,
    date: p.date,
    time: p.time,
    duration: String(p.duration),
    menuNames: p.menuNames.join("、"),
    storePhone: p.storePhone ?? "",
  };

  const accountNote = p.isNewUser
    ? `<div style="background:#eff6ff;border-left:4px solid #3b82f6;padding:14px 16px;border-radius:4px;margin:20px 0;">
        <p style="margin:0;color:#1e40af;font-size:14px;line-height:1.6;">
          会員登録が完了しました。設定されたパスワードで次回からログインできます。
        </p>
      </div>`
    : "";

  const heading = replaceVars(tpl.heading, vars);
  const body = replaceVars(tpl.body, vars);
  const footer = replaceVars(tpl.footer, vars);

  return baseLayout(
    p.storeName,
    `<h2 style="margin:0 0 8px;color:#18181b;font-size:18px;">${heading}</h2>
     <p style="margin:0 0 20px;color:#52525b;font-size:14px;line-height:1.6;">
       ${body}
     </p>
     ${detailTable([
       ["日付", p.date],
       ["時間", `${p.time} (${p.duration}分)`],
       ["担当", p.staffName],
       ["メニュー", p.menuNames.join("、")],
     ])}
     ${accountNote}
     <p style="margin:20px 0 0;color:#71717a;font-size:13px;line-height:1.6;">
       ${footer}${p.storePhone ? `<br>TEL: ${escapeHtml(p.storePhone)}` : ""}
     </p>`
  );
}

function reminderHtml(p: ReminderEmailParams, tpl: Required<MailTemplateOverride>): string {
  const vars: Record<string, string> = {
    storeName: p.storeName,
    customerName: p.customerName,
    staffName: p.staffName,
    date: p.date,
    time: p.time,
    duration: String(p.duration),
    menuNames: p.menuNames.join("、"),
    storePhone: p.storePhone ?? "",
  };

  const heading = replaceVars(tpl.heading, vars);
  const body = replaceVars(tpl.body, vars);
  const footer = replaceVars(tpl.footer, vars);

  return baseLayout(
    p.storeName,
    `<h2 style="margin:0 0 8px;color:#18181b;font-size:18px;">${heading}</h2>
     <p style="margin:0 0 20px;color:#52525b;font-size:14px;line-height:1.6;">
       ${body}
     </p>
     ${detailTable([
       ["日付", p.date],
       ["時間", `${p.time} (${p.duration}分)`],
       ["担当", p.staffName],
       ["メニュー", p.menuNames.join("、")],
     ])}
     <p style="margin:20px 0 0;color:#71717a;font-size:13px;line-height:1.6;">
       ${footer}${p.storePhone ? `<br>TEL: ${escapeHtml(p.storePhone)}` : ""}
     </p>`
  );
}

function cancellationHtml(p: CancellationEmailParams, tpl: Required<MailTemplateOverride>): string {
  const vars: Record<string, string> = {
    storeName: p.storeName,
    customerName: p.customerName,
    staffName: p.staffName,
    date: p.date,
    time: p.time,
    menuNames: p.menuNames.join("、"),
    storePhone: p.storePhone ?? "",
  };

  const heading = replaceVars(tpl.heading, vars);
  const body = replaceVars(tpl.body, vars);
  const footer = replaceVars(tpl.footer, vars);

  return baseLayout(
    p.storeName,
    `<h2 style="margin:0 0 8px;color:#dc2626;font-size:18px;">${heading}</h2>
     <p style="margin:0 0 20px;color:#52525b;font-size:14px;line-height:1.6;">
       ${body}
     </p>
     ${detailTable([
       ["日付", p.date],
       ["時間", p.time],
       ["担当", p.staffName],
       ["メニュー", p.menuNames.join("、")],
     ])}
     <p style="margin:20px 0 0;color:#71717a;font-size:13px;line-height:1.6;">
       ${footer}${p.storePhone ? `<br>TEL: ${escapeHtml(p.storePhone)}` : ""}
     </p>`
  );
}

function adminNotifyHtml(p: AdminNotifyParams, tpl: Required<MailTemplateOverride>): string {
  const vars: Record<string, string> = {
    storeName: p.storeName,
    customerName: p.customerName,
    customerEmail: p.customerEmail,
    customerPhone: p.customerPhone,
    staffName: p.staffName,
    date: p.date,
    time: p.time,
    duration: String(p.duration),
    menuNames: p.menuNames.join("、"),
  };

  const heading = replaceVars(tpl.heading, vars);

  return baseLayout(
    p.storeName,
    `<h2 style="margin:0 0 8px;color:#18181b;font-size:18px;">${heading}</h2>
     ${detailTable([
       ["お客様", `${p.customerName} (${p.customerEmail})`],
       ["電話番号", p.customerPhone || "未登録"],
       ["日付", p.date],
       ["時間", `${p.time} (${p.duration}分)`],
       ["担当", p.staffName],
       ["メニュー", p.menuNames.join("、")],
     ])}`
  );
}

// ─── テンプレート解決ヘルパー ───

function resolveTemplate(
  mailConfig: MailTemplateConfig | undefined,
  key: keyof MailTemplateConfig,
): Required<MailTemplateOverride> {
  const defaults = DEFAULT_TEMPLATES[key];
  const overrides = mailConfig?.[key];
  if (!overrides) return defaults;
  return {
    subject: overrides.subject || defaults.subject,
    heading: overrides.heading || defaults.heading,
    body: overrides.body || defaults.body,
    footer: overrides.footer || defaults.footer,
  };
}

// ─── 公開API: メール種別ごとの送信関数 ───

/**
 * 顧客へ予約確定メールを送信する
 */
export async function sendBookingConfirmation(
  to: string,
  params: BookingEmailParams,
  mailConfig?: MailTemplateConfig,
): Promise<void> {
  const tpl = resolveTemplate(mailConfig, "booking_confirmation");
  const vars: Record<string, string> = {
    storeName: params.storeName,
    customerName: params.customerName,
    staffName: params.staffName,
    date: params.date,
    time: params.time,
    duration: String(params.duration),
    menuNames: params.menuNames.join("、"),
    storePhone: params.storePhone ?? "",
  };
  await sendEmail({
    to,
    subject: sanitizeSubject(replaceVars(tpl.subject, vars)),
    html: bookingConfirmationHtml(params, tpl),
  });
}

/**
 * 顧客へリマインドメールを送信する
 */
export async function sendReminder(
  to: string,
  params: ReminderEmailParams,
  mailConfig?: MailTemplateConfig,
): Promise<void> {
  const tpl = resolveTemplate(mailConfig, "reminder");
  const vars: Record<string, string> = {
    storeName: params.storeName,
    customerName: params.customerName,
    staffName: params.staffName,
    date: params.date,
    time: params.time,
    duration: String(params.duration),
    menuNames: params.menuNames.join("、"),
    storePhone: params.storePhone ?? "",
  };
  await sendEmail({
    to,
    subject: sanitizeSubject(replaceVars(tpl.subject, vars)),
    html: reminderHtml(params, tpl),
  });
}

/**
 * 顧客へキャンセル通知メールを送信する
 */
export async function sendCancellationNotice(
  to: string,
  params: CancellationEmailParams,
  mailConfig?: MailTemplateConfig,
): Promise<void> {
  const tpl = resolveTemplate(mailConfig, "cancellation");
  const vars: Record<string, string> = {
    storeName: params.storeName,
    customerName: params.customerName,
    staffName: params.staffName,
    date: params.date,
    time: params.time,
    menuNames: params.menuNames.join("、"),
    storePhone: params.storePhone ?? "",
  };
  await sendEmail({
    to,
    subject: sanitizeSubject(replaceVars(tpl.subject, vars)),
    html: cancellationHtml(params, tpl),
  });
}

/**
 * 管理者へ新規予約通知メールを送信する
 */
export async function sendAdminNewBookingNotify(
  to: string,
  params: AdminNotifyParams,
  mailConfig?: MailTemplateConfig,
): Promise<void> {
  const tpl = resolveTemplate(mailConfig, "admin_notify");
  const vars: Record<string, string> = {
    storeName: params.storeName,
    customerName: params.customerName,
    customerEmail: params.customerEmail,
    customerPhone: params.customerPhone,
    staffName: params.staffName,
    date: params.date,
    time: params.time,
    duration: String(params.duration),
    menuNames: params.menuNames.join("、"),
  };
  await sendEmail({
    to,
    subject: sanitizeSubject(replaceVars(tpl.subject, vars)),
    html: adminNotifyHtml(params, tpl),
  });
}
