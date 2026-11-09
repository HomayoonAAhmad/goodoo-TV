"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { Button } from "glisse";

function applyTheme(value: boolean) {
  const color = value ? "#000000" : "#f2f2f7";
  document.documentElement.classList.toggle("dark", value);
  document.documentElement.dataset.theme = value ? "dark" : "light";
  document.querySelectorAll('meta[name="theme-color"]').forEach((meta) => meta.setAttribute("content", color));
  document.cookie = `goodoo-theme=${value ? "dark" : "light"}; Path=/; Max-Age=31536000; SameSite=Lax`;
}

export function ThemeToggle() {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const saved = localStorage.getItem("goodoo-theme") === "dark";
    applyTheme(saved);
    document.documentElement.classList.toggle("solid-glass", localStorage.getItem("goodoo-solid") === "true");
    setDark(saved);
  }, []);
  useEffect(() => {
    document.querySelectorAll('meta[name="theme-color"]').forEach((meta) =>
      meta.setAttribute("content", dark ? "#000000" : "#f2f2f7"),
    );
  }, [dark]);
  return (
    <Button
      variant="glass"
      aria-label={dark ? "حالت روشن" : "حالت تاریک"}
      icon={dark ? <Sun size={18} /> : <Moon size={18} />}
      onClick={() => {
        const next = !dark;
        setDark(next);
        applyTheme(next);
        localStorage.setItem("goodoo-theme", next ? "dark" : "light");
      }}
    />
  );
}
