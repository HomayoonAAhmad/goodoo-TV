"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { House, UserRound } from "lucide-react";
export function AppDock({ avatar }: { avatar?: string }) {
  const pathname = usePathname();
  if (pathname !== "/" && pathname !== "/profile") return null;
  const active = pathname === "/profile" ? "profile" : "home";
  return (
    <nav
      dir="ltr"
      aria-label="ناوبری"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex justify-center pb-[max(14px,env(safe-area-inset-bottom))]"
    >
      <div className="pointer-events-auto flex h-[68px] items-center rounded-full border border-black/10 bg-white/90 p-1 shadow-lg backdrop-blur-xl dark:border-white/10 dark:bg-[#1c1c1e]/90">
        <Link
          href="/"
          aria-current={active === "home" ? "page" : undefined}
          className={`flex h-[58px] w-[78px] flex-col items-center justify-center gap-0.5 rounded-full text-[10px] ${active === "home" ? "bg-black/5 text-[#007aff] dark:bg-white/10 dark:text-[#0a84ff]" : "text-stone-600 dark:text-stone-300"}`}
        >
          <House size={22} />
          <span>خانه</span>
        </Link>
        <Link
          href="/profile"
          aria-current={active === "profile" ? "page" : undefined}
          className={`flex h-[58px] w-[78px] flex-col items-center justify-center gap-0.5 rounded-full text-[10px] ${active === "profile" ? "bg-black/5 text-[#007aff] dark:bg-white/10 dark:text-[#0a84ff]" : "text-stone-600 dark:text-stone-300"}`}
        >
          {avatar ? <img src={avatar} alt="" className="size-[22px] rounded-full object-cover" /> : <UserRound size={22} />}
          <span>پروفایل</span>
        </Link>
      </div>
    </nav>
  );
}
