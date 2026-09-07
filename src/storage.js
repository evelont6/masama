import { useState, useEffect } from "react";
import { validateDraft } from "./draft.js";

export function useSavedState(key, initial) {
  const [value, setValue] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(`masama-draft-${key}`));
      return validateDraft(key, saved, initial);
    } catch { return initial; }
  });
  useEffect(() => {
    try { localStorage.setItem(`masama-draft-${key}`, JSON.stringify(value)); }
    catch { window.dispatchEvent(new Event("masama-storage-error")); }
  }, [key, value]);
  return [value, setValue];
}
