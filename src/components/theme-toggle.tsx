"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { Button } from "glisse";

export function ThemeToggle() {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const saved = localStorage.getItem("goodoo-theme") === "dark";
    document.documentElement.classList.toggle("dark", saved);
    document.documentElement.classList.toggle("solid-glass", localStorage.getItem("goodoo-solid") === "true");
    setDark(saved);
  }, []);
  return (
    <Button
      variant="glass"
      aria-label={dark ? "حالت روشن" : "حالت تاریک"}
      icon={dark ? <Sun size={18} /> : <Moon size={18} />}
      onClick={() => {
        const next = !dark;
        setDark(next);
        document.documentElement.classList.toggle("dark", next);
        localStorage.setItem("goodoo-theme", next ? "dark" : "light");
      }}
    />
  );
}
