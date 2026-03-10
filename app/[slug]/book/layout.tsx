import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "ご予約 | サロン予約",
};

export default function BookLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-ivory">
      {children}
    </div>
  );
}
