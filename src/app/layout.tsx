import type { Metadata } from "next";
import type { Viewport } from "next";
import { cookies } from "next/headers";
import "./globals.css";
import { getUser } from "@/lib/auth";
import { AppDock } from "@/components/app-dock";

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

export async function generateViewport(): Promise<Viewport> {
  const dark = (await cookies()).get("goodoo-theme")?.value === "dark";
  return {
    width: "device-width",
    viewportFit: "cover",
    themeColor: dark ? "#000000" : "#f2f2f7",
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
  };
}

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const user = await getUser();
  const dark = (await cookies()).get("goodoo-theme")?.value === "dark";
  return (
    <html lang="fa" dir="rtl" className={dark ? "dark" : undefined} data-theme={dark ? "dark" : "light"}>
      <body>
        {children}
        {user && <AppDock avatar={user.avatar || undefined} />}
      </body>
    </html>
  );
}
