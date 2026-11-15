"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { House, UserRound } from "lucide-react";
import { TabBar } from "glisse";
export function AppDock({ avatar }: { avatar?: string }) {
  const pathname = usePathname();
  const [selection, setSelection] = useState(pathname === "/profile" ? "profile" : "home");
  useEffect(() => setSelection(pathname === "/profile" ? "profile" : "home"), [pathname]);
  if (pathname !== "/" && pathname !== "/profile") return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex justify-center pb-[max(14px,env(safe-area-inset-bottom))]">
      <TabBar
        dir="ltr"
        aria-label="ناوبری"
        value={selection}
        onValueChange={setSelection}
        link={Link}
        className="pointer-events-auto"
        items={[
          { value: "home", href: "/", icon: <House size={22} />, label: "خانه" },
          {
            value: "profile",
            href: "/profile",
            icon: avatar ? (
              <img src={avatar} alt="" className="size-[22px] rounded-full object-cover" />
            ) : (
              <UserRound size={22} />
            ),
            label: "پروفایل",
          },
        ]}
      />
    </div>
  );
}
