"use client";

import Link from "next/link";
import { createPortal } from "react-dom";
import { useEffect, useState } from "react";
import { House, UserRound } from "lucide-react";
import { TabBar } from "glisse";
export function AppDock({ active, avatar }: { active: "home" | "profile"; avatar?: string }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  return createPortal(
    <nav
      dir="ltr"
      aria-label="ناوبری"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex justify-center pb-[max(14px,env(safe-area-inset-bottom))]"
    >
      <TabBar
        className="pointer-events-auto"
        dir="ltr"
        value={active}
        link={Link}
        items={[
          {
            value: "home",
            label: "خانه",
            icon: <House size={21} />,
            href: "/",
          },
          {
            value: "profile",
            label: "پروفایل",
            icon: avatar ? (
              <img src={avatar} alt="" className="size-6 rounded-full object-cover" />
            ) : (
              <UserRound size={21} />
            ),
            href: "/profile",
          },
        ]}
      />
    </nav>,
    document.body,
  );
}
