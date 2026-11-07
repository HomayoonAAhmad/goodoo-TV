"use client";
import Link from "next/link";
import { Clapperboard, UserRound } from "lucide-react";
import { TabBar } from "glisse";
export function AppDock({ active, avatar }: { active: "home" | "profile"; avatar?: string }) {
  return (
    <nav
      dir="ltr"
      aria-label="ناوبری"
      className="fixed inset-x-0 bottom-0 z-50 mx-auto w-fit pb-[max(14px,env(safe-area-inset-bottom))]"
    >
      <TabBar
        dir="ltr"
        value={active}
        link={Link}
        items={[
          {
            value: "home",
            label: "خانه",
            icon: <Clapperboard size={21} />,
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
    </nav>
  );
}
