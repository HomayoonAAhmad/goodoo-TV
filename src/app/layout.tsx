import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Goodoo TV — تماشا با هم",
  description: "یک اتاق بساز، لینک ویدیو را بفرست و با هم تماشا کنید.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fa" dir="rtl">
      <body>{children}</body>
    </html>
  );
}
