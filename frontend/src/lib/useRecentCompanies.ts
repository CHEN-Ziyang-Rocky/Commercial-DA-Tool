import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { readRecentCompanies, rememberCompanies } from "./recent-companies";

const event = "commercial:recent-companies";
export function useRecentCompanies() {
  const { user } = useAuth();
  const key = user ? `commercial:recent-companies:${user.sub}` : null;
  const [recent, setRecent] = useState<string[]>([]);
  useEffect(() => {
    const read = () => {
      try { setRecent(key ? readRecentCompanies(localStorage.getItem(key)) : []); }
      catch { setRecent([]); }
    };
    read();
    window.addEventListener(event, read);
    window.addEventListener("storage", read);
    return () => { window.removeEventListener(event, read); window.removeEventListener("storage", read); };
  }, [key]);
  const save = useCallback((chosen: string[] | null) => {
    if (!key) return;
    let current = recent;
    try { current = readRecentCompanies(localStorage.getItem(key)); } catch { /* Storage may be disabled. */ }
    const next = chosen ? rememberCompanies(current, chosen) : [];
    setRecent(next);
    try {
      localStorage.setItem(key, JSON.stringify(next));
      window.dispatchEvent(new Event(event));
    } catch { /* Keep the selector usable without persistent storage. */ }
  }, [key, recent]);
  return { recent, remember: (chosen: string[]) => save(chosen), clear: () => save(null) };
}
