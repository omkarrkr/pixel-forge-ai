import { useEffect, useState } from "react";

type Preference = "light" | "dark" | "system";
const STORAGE_KEY = "pixelforge-theme";

function readPreference(): Preference {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    if (value === "light" || value === "dark") return value;
  } catch { /* Theme selection still works when storage is unavailable. */ }
  return "system";
}

export function useTheme() {
  const [preference, setPreference] = useState<Preference>(readPreference);
  const [systemDark, setSystemDark] = useState(() => window.matchMedia("(prefers-color-scheme: dark)").matches);
  const theme = preference === "system" ? (systemDark ? "dark" : "light") : preference;

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const changed = (event: MediaQueryListEvent) => setSystemDark(event.matches);
    media.addEventListener("change", changed);
    const sync = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY || event.key === null) setPreference(readPreference());
    };
    window.addEventListener("storage", sync);
    return () => { media.removeEventListener("change", changed); window.removeEventListener("storage", sync); };
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  const chooseTheme = (value: Preference) => {
    setPreference(value);
    try { localStorage.setItem(STORAGE_KEY, value); } catch { /* Keep the in-memory choice. */ }
  };
  return { theme, preference, chooseTheme };
}
