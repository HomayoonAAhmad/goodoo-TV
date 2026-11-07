import type { Metadata } from "next";
import type { Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  applicationName: "Goodoo TV",
  appleWebApp: { capable: true, title: "Goodoo TV", statusBarStyle: "default" },
  icons: {
    icon: [{ url: "/brand/icon-192.png", sizes: "192x192", type: "image/png" }],
    apple: [{ url: "/brand/icon-180.png", sizes: "180x180", type: "image/png" }],
  },
  title: "Goodoo TV — تماشا با هم",
  description: "یک اتاق بساز، لینک ویدیو را بفرست و با هم تماشا کنید.",
};

export const viewport: Viewport = {
  width: "device-width",
  viewportFit: "cover",
  themeColor: "#f2f2f7",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fa" dir="rtl">
      <body>{children}</body>
    </html>
  );
}
