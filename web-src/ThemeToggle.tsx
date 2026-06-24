import { Monitor, Moon, Sun } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type Theme = "light" | "dark" | "system";

const STORAGE_KEY = "ai-shop:theme";

function readStored(): Theme {
  if (typeof window === "undefined") return "system";
  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    if (value === "light" || value === "dark" || value === "system") return value;
  } catch {
    // ignore
  }
  return "system";
}

function systemPrefersDark(): boolean {
  if (typeof window === "undefined") return true;
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? true;
}

function applyTheme(theme: Theme): void {
  if (typeof document === "undefined") return;
  const resolved = theme === "system" ? (systemPrefersDark() ? "dark" : "light") : theme;
  if (resolved === "light") {
    document.documentElement.setAttribute("data-theme", "light");
  } else {
    document.documentElement.removeAttribute("data-theme");
  }
}

export function initTheme(): void {
  applyTheme(readStored());
}

const OPTIONS: Array<{ value: Theme; label: string; icon: typeof Sun }> = [
  { value: "light", label: "สว่าง", icon: Sun },
  { value: "dark", label: "มืด", icon: Moon },
  { value: "system", label: "ตามระบบ", icon: Monitor }
];

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(() => readStored());
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    applyTheme(theme);
    try {
      window.localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      // ignore quota errors
    }
  }, [theme]);

  useEffect(() => {
    if (theme !== "system") return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => applyTheme("system");
    media.addEventListener("change", handler);
    return () => media.removeEventListener("change", handler);
  }, [theme]);

  useEffect(() => {
    if (!open) return;
    function handleClick(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("mousedown", handleClick);
    window.addEventListener("keydown", handleKey);
    return () => {
      window.removeEventListener("mousedown", handleClick);
      window.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  const current = OPTIONS.find((option) => option.value === theme) ?? OPTIONS[2];
  const CurrentIcon = current.icon;

  return (
    <div className="theme-toggle-wrap" ref={containerRef}>
      <button
        type="button"
        className="theme-toggle-trigger"
        aria-label={`ธีม: ${current.label}`}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <CurrentIcon size={18} />
      </button>
      {open && (
        <div className="theme-toggle-panel" role="menu">
          {OPTIONS.map((option) => {
            const Icon = option.icon;
            const active = option.value === theme;
            return (
              <button
                key={option.value}
                type="button"
                role="menuitemradio"
                aria-checked={active}
                className={`theme-option ${active ? "is-active" : ""}`}
                onClick={() => {
                  setTheme(option.value);
                  setOpen(false);
                }}
              >
                <Icon size={16} />
                <span>{option.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
