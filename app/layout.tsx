import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "サロン予約システム",
  description: "マルチテナント型サロン予約管理プラットフォーム",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body className="min-h-screen bg-ivory text-charcoal antialiased">
        {children}
      </body>
    </html>
  );
}
