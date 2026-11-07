"use client";

import { BrandLogo } from "./brand-logo";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Smartphone } from "lucide-react";
import { Button, Input } from "glisse";
import { ThemeToggle } from "./theme-toggle";

const digits = (value: string) =>
  value
    .replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)))
    .replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)))
    .replace(/\D/g, "");

export function LoginScreen() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (step === "phone") {
      const normalized = digits(phone).replace(/^0098/, "0").replace(/^98/, "0");
      if (!/^09\d{9}$/.test(normalized)) return setError("شماره موبایل معتبر وارد کن.");
      setPhone(normalized);
      setStep("code");
      return;
    }
    if (code.length !== 6) return setError("کد شش رقمی را وارد کن.");
    setBusy(true);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, code }),
      });
      if (!response.ok) throw new Error("کد نادرست است.");
      router.push("/");
      router.refresh();
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-3xl flex-col px-4 pb-[max(24px,env(safe-area-inset-bottom))] pt-[max(20px,env(safe-area-inset-top))] sm:px-8">
      <header className="flex items-center justify-between">
        <span className="flex items-center gap-2 font-bold">
          <BrandLogo size={21} /> Goodoo TV
        </span>
        <ThemeToggle />
      </header>
      <div className="flex flex-1 flex-col items-center justify-center py-10 text-center">
        <h1 className="text-[32px] font-bold tracking-tight">
          {step === "phone" ? "ورود به Goodoo TV" : "کد ورود"}
        </h1>
        <p className="mt-2 text-sm leading-7 text-[#8e8e93]">
          {step === "phone" ? (
            "شماره موبایلت را وارد کن"
          ) : (
            <>
              کد شش رقمی برای{" "}
              <span dir="ltr" className="inline-block">
                {phone}
              </span>
            </>
          )}
        </p>
        <form
          onSubmit={submit}
          className="mt-9 w-full max-w-md rounded-3xl bg-white p-5 text-center dark:bg-[#1c1c1e]"
        >
          {step === "phone" ? (
            <Input
              key="phone"
              autoFocus
              name="tel"
              type="tel"
              inputMode="tel"
              autoComplete="tel-national"
              aria-label="شماره موبایل"
              dir="ltr"
              maxLength={16}
              value={phone}
              onValueChange={(value) => setPhone(digits(value))}
              placeholder="09123456789"
              className="!h-12 w-full min-w-full"
            />
          ) : (
            <Input
              key="code"
              autoFocus
              name="one-time-code"
              type="tel"
              inputMode="numeric"
              autoComplete="one-time-code"
              enterKeyHint="done"
              aria-label="کد ورود"
              dir="ltr"
              maxLength={6}
              value={code}
              onValueChange={(value) => setCode(digits(value).slice(0, 6))}
              placeholder="••••••"
              className="!h-12 w-full min-w-full text-center tracking-[.35em]"
            />
          )}
          {error && (
            <p role="alert" className="mt-3 text-sm text-[#ff3b30] dark:text-[#ff453a]">
              {error}
            </p>
          )}
          <Button
            type="submit"
            variant="filled"
            className="mt-4 min-h-12 w-full rounded-2xl font-semibold"
            disabled={busy}
          >
            {busy ? "در حال ورود…" : step === "phone" ? "ادامه" : "ورود"}
          </Button>
        </form>
        {step === "code" && (
          <Button
            variant="glass"
            className="mt-4"
            onClick={() => {
              setStep("phone");
              setCode("");
              setError("");
            }}
          >
            <ArrowRight size={16} /> تغییر شماره
          </Button>
        )}
      </div>
    </main>
  );
}
