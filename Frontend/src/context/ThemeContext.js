import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

const ThemeContext = createContext(undefined);

const STORAGE_KEY = "theme";
const VALID = ["light", "dark", "system"];

function readStoredTheme() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return VALID.includes(stored) ? stored : "system";
  } catch {
    return "system";
  }
}

function prefersDark() {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-color-scheme: dark)").matches
  );
}

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(readStoredTheme);
  const [systemDark, setSystemDark] = useState(prefersDark);

  const resolvedTheme = theme === "system" ? (systemDark ? "dark" : "light") : theme;

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", resolvedTheme === "dark");
    root.style.colorScheme = resolvedTheme;
  }, [resolvedTheme]);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return undefined;
    }
    const query = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = (event) => setSystemDark(event.matches);
    setSystemDark(query.matches);
    query.addEventListener("change", handleChange);
    return () => query.removeEventListener("change", handleChange);
  }, []);

  const setTheme = useCallback((next) => {
    if (!VALID.includes(next)) return;
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* storage unavailable: keep in-memory theme */
    }
    setThemeState(next);
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(resolvedTheme === "dark" ? "light" : "dark");
  }, [resolvedTheme, setTheme]);

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
