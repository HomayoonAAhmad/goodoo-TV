"use client";
import { useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useRouter } from "next/navigation";
import { Camera, ChevronRight, LogOut, UserRound } from "lucide-react";
import { Button, Input, Switch } from "glisse";
import { ThemeToggle } from "./theme-toggle";
import { AppDock } from "./app-dock";
import { disconnectSocket } from "@/lib/socket";
type Profile = { firstName: string; lastName: string; username: string; avatar: string };
export function ProfileScreen({ initial, phone }: { initial: Profile; phone: string }) {
  const router = useRouter();
  const reduced = useReducedMotion();
  const inputRef = useRef<HTMLInputElement>(null);
  const [profile, setProfile] = useState(initial);
  const [editing, setEditing] = useState(false);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [solid, setSolid] = useState(false);
  useState(() => {
    if (typeof window !== "undefined")
      setTimeout(() => setSolid(localStorage.getItem("goodoo-solid") === "true"), 0);
  });
  function update(key: keyof Profile, value: string) {
    setProfile((current) => ({ ...current, [key]: value }));
  }
  function photo(file?: File) {
    if (!file) return;
    setMessage("");
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 250_000) {
      setMessage("عکس باید PNG، JPG یا WebP و کمتر از ۲۵۰ کیلوبایت باشد.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== "string") return setMessage("خواندن عکس ممکن نشد.");
      update("avatar", reader.result);
      setEditing(true);
    };
    reader.onerror = () => setMessage("خواندن عکس ممکن نشد.");
    reader.readAsDataURL(file);
  }
  async function save() {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "ذخیره ممکن نشد.");
      setEditing(false);
      setMessage("ذخیره شد");
      router.refresh();
    } catch (error) {
      setMessage((error as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    disconnectSocket();
    router.push("/login");
    router.refresh();
  }
  return (
    <main className="mx-auto min-h-dvh max-w-3xl px-4 pb-32 pt-5 text-stone-950 dark:text-stone-50 sm:px-8">
      <header className="flex items-center justify-between">
        <Button
          variant="glass"
          icon={<ChevronRight size={19} />}
          aria-label="بازگشت"
          onClick={() => router.push("/")}
        />
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Button variant="glass" onClick={() => setEditing((value) => !value)}>
            {editing ? "بستن" : "ویرایش"}
          </Button>
        </div>
      </header>
      <section className="mt-8 flex flex-col items-center text-center">
        <button
          aria-label="تغییر عکس پروفایل"
          onClick={() => inputRef.current?.click()}
          className="relative grid size-28 place-items-center overflow-hidden rounded-full bg-stone-200 text-stone-500 ring-1 ring-white/15 dark:bg-stone-800"
        >
          {profile.avatar ? (
            <img src={profile.avatar} alt="عکس پروفایل" className="size-full object-cover" />
          ) : (
            <UserRound size={43} />
          )}
          <span className="absolute bottom-0 left-0 right-0 bg-black/55 py-1 text-white">
            <Camera size={15} className="mx-auto" />
          </span>
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={(event) => {
            photo(event.target.files?.[0]);
            event.currentTarget.value = "";
          }}
        />
        <h1 className="mt-5 text-3xl font-semibold tracking-tight">
          {[profile.firstName, profile.lastName].filter(Boolean).join(" ") || "پروفایل من"}
        </h1>
        {profile.username && (
          <p dir="ltr" className="mt-1 text-base text-stone-500 dark:text-stone-400">
            @{profile.username}
          </p>
        )}
      </section>
      {/* <Button variant="glass"
        onClick={() => inputRef.current?.click()}
        className="mt-10 flex w-full items-center gap-3 rounded-3xl px-5 py-4 text-right text-blue-600 dark:text-[#0a84ff]"
      >
        <Camera size={22} /> تغییر عکس پروفایل
      </Button> */}
      <section className="mt-5 overflow-hidden rounded-3xl border border-black/5 bg-white dark:border-white/5 dark:bg-[#1c1c1e]">
        {(
          [
            ["firstName", "نام"],
            ["lastName", "نام خانوادگی"],
            ["username", "نام کاربری"],
          ] as const
        ).map(([key, label], index) => (
          <div
            key={key}
            className={`flex min-h-16 items-center gap-4 px-5 ${index < 2 ? "border-b border-stone-300/70 dark:border-white/10" : ""}`}
          >
            <span className="w-25 shrink-0 text-sm text-stone-500 dark:text-stone-400">
              {label}
            </span>
            {editing ? (
              <Input
                value={profile[key]}
                onValueChange={(value) => {
                  update(key, value);
                  setEditing(true);
                }}
                dir={key === "username" ? "ltr" : "rtl"}
                placeholder={label}
                maxLength={key === "username" ? 24 : 40}
                className={`h-16 min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-stone-400 ${index < 2 ? "border-b border-stone-300/70 dark:border-white/10" : ""}`}
              />
            ) : (
              <span
                dir={key === "username" ? "ltr" : "rtl"}
                className="min-w-0 flex-1 truncate text-base"
              >
                {profile[key] || "—"}
              </span>
            )}
          </div>
        ))}
        <div className="flex min-h-16 items-center gap-4 px-5">
          <span className="w-25 shrink-0 text-sm text-stone-500 dark:text-stone-400">
            شماره تلفن
          </span>
          <span dir="ltr" className="flex-1 text-left text-base">
            {phone}
          </span>
        </div>
      </section>
      <AnimatePresence>
        {editing && (
          <motion.div
            key="save"
            initial={reduced ? false : { opacity: 0, transform: "translateY(6px)" }}
            animate={{ opacity: 1, transform: "translateY(0)" }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
          >
            <Button
              variant="filled"
              className="min-h-12 w-full rounded-2xl font-semibold mt-6"
              disabled={busy}
              onClick={save}
            >
              {busy ? "در حال ذخیره…" : "ذخیره تغییرات"}
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
      {message && (
        <p role="status" className="mt-4 text-center text-sm text-stone-500">
          {message}
        </p>
      )}
      <Button variant="glass" onClick={logout} destructive className="mt-6 w-full">
        <LogOut size={20} /> خروج از حساب
      </Button>
      <section className="mt-6 flex items-center justify-between rounded-3xl border border-black/5 bg-white px-5 py-4 dark:border-white/5 dark:bg-[#1c1c1e]">
        <span>کاهش شفافیت شیشه</span>
        <Switch
          aria-label="کاهش شفافیت شیشه"
          checked={solid}
          onCheckedChange={(value) => {
            setSolid(value);
            document.documentElement.classList.toggle("solid-glass", value);
            localStorage.setItem("goodoo-solid", String(value));
          }}
        />
      </section>
      <AppDock active="profile" avatar={profile.avatar} />
    </main>
  );
}
