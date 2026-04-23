import { useEffect, useState } from "react";

export type PageSize = "a4" | "letter";
export type Orientation = "portrait" | "landscape";

export interface CardapioPrintPrefs {
  pageSize: PageSize;
  orientation: Orientation;
  includeClientInfo: boolean;
}

const STORAGE_KEY = "cardapio_print_prefs_v1";

export const DEFAULT_PRINT_PREFS: CardapioPrintPrefs = {
  pageSize: "a4",
  orientation: "portrait",
  includeClientInfo: true,
};

function readPrefs(): CardapioPrintPrefs {
  if (typeof window === "undefined") return DEFAULT_PRINT_PREFS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PRINT_PREFS;
    const parsed = JSON.parse(raw);
    return {
      pageSize: parsed.pageSize === "letter" ? "letter" : "a4",
      orientation: parsed.orientation === "landscape" ? "landscape" : "portrait",
      includeClientInfo: parsed.includeClientInfo !== false,
    };
  } catch {
    return DEFAULT_PRINT_PREFS;
  }
}

export function useCardapioPrintPrefs() {
  const [prefs, setPrefs] = useState<CardapioPrintPrefs>(() => readPrefs());

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
    } catch {
      // ignore quota errors
    }
  }, [prefs]);

  return [prefs, setPrefs] as const;
}
