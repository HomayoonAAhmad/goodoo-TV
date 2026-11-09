"use client";

import { BrandLogo } from "./brand-logo";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CirclePlay, Link2, LogIn, UserRound, Users } from "lucide-react";
import { Button, Input } from "glisse";
import { getSocket } from "@/lib/socket";
import { ThemeToggle } from "./theme-toggle";

export function HomeScreen({ name, avatar }: { name: string; avatar: string }) {
  const router = useRouter();
  const [source, setSource] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  function createRoom() {
    if (!/^https?:\/\//i.test(source.trim())) return setError("یک لینک معتبر وارد کن.");
    setBusy(true);
    setError("");
    getSocket().emit(
      "room:create",
      { source: source.trim() },
      (result: { roomId?: string; error?: string }) => {
        setBusy(false);
        if (result.error) return setError(result.error);
        router.push(`/room/${result.roomId}`);
      },
    );
  }
  function joinRoom() {
    const cleaned = code.trim().toUpperCase();
    if (!/^[A-F0-9]{12}$/.test(cleaned)) return setError("کد دعوت باید ۱۲ کاراکتر باشد.");
    router.push(`/room/${cleaned}`);
  }
  return (
    <main className="mx-auto h-[calc(100dvh-30px)] max-w-3xl overflow-y-hidden px-4 pb-[calc(82px+env(safe-area-inset-bottom))] pt-[max(20px,env(safe-area-inset-top))] sm:px-8">
      <header className="flex items-center justify-between pb-5">
        <Link href="/" className="flex items-center gap-2 font-extrabold">
          {/* <span className="grid size-9 place-items-center rounded-xl bg-stone-900 text-white dark:bg-white dark:text-stone-900"> */}
          {/* <BrandLogo size={19} /> */}
          <BrandLogo size={30} />
          {/* </span>{" "} */}
          {/* Goodoo TV */}
          <span className="mt-2">Goodoo TV</span>
        </Link>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Button
            variant="glass"
            onClick={() => router.push("/profile")}
            aria-label="پروفایل"
            className="grid size-10 place-items-center overflow-hidden rounded-full bg-stone-200 dark:bg-stone-800"
          >
            {avatar ? (
              <img src={avatar} alt="" className="size-full object-cover" />
            ) : (
              <UserRound size={18} />
            )}
          </Button>
        </div>
      </header>

      <section className="mt-6 rounded-3xl border border-black/5 bg-white p-5 dark:border-white/5 dark:bg-[#1c1c1e]">
        <div className="flex items-center gap-2">
          <CirclePlay size={19} />
          <h2 className="font-bold">اتاق جدید</h2>
        </div>
        <label htmlFor="source" className="mt-6 mb-3 block text-xs font-semibold">
          لینک ویدیو
        </label>

        <Input
          id="source"
          dir="ltr"
          value={source}
          onValueChange={setSource}
          placeholder={"https://..."}
          className="h-12 w-full min-w-full"
        />

        <Button
          variant="filled"
          className="w-full rounded-2xl font-semibold mt-4"
          disabled={busy}
          onClick={createRoom}
        >
          {busy ? "در حال ساخت…" : "ساخت اتاق"}
        </Button>
      </section>
      <section className="mt-4 rounded-3xl border border-black/5 bg-white p-5 dark:border-white/5 dark:bg-[#1c1c1e]">
        <div className="flex items-center gap-2">
          <LogIn size={19} />
          <h2 className="font-bold">ورود به اتاق</h2>
        </div>
        <div className="mt-5 flex items-center w-full gap-2">
          <Input
            aria-label="کد دعوت"
            dir="ltr"
            maxLength={12}
            value={code}
            onValueChange={(value) => setCode(value.toUpperCase())}
            placeholder="کد ۱۲ کاراکتری"
            className="h-12 w-full md:min-w-[90%]"
          />
          <Button variant="filled" onClick={joinRoom} className="" aria-label="ورود">
            <ArrowLeft size={19} />
          </Button>
        </div>
      </section>
      {error && (
        <p role="alert" className="mt-3 text-sm text-red-600">
          {error}
        </p>
      )}
    </main>
  );
}
