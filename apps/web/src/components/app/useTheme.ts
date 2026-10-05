import { useEffect, useState } from "react";

export type Theme = "dark" | "light";

const STORAGE_KEY = "huddle.theme";

function storedTheme(): Theme {
  try {
    return localStorage.getItem(STORAGE_KEY) === "light" ? "light" : "dark";
  } catch {
    return "dark";
  }
}

/** The app's colour theme. `persist` is off for the landing demo so it never touches the real setting. */
export function useTheme(persist = true): [Theme, (theme: Theme) => void] {
  const [theme, setTheme] = useState<Theme>(() => (persist ? storedTheme() : "dark"));

  useEffect(() => {
    if (!persist) return;
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      // Private mode or storage disabled: the choice lasts for this tab only.
    }
  }, [persist, theme]);

  return [theme, setTheme];
}
