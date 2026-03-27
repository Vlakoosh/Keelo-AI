import { createContext, useContext, useMemo, useState } from "react";

export type ThemeMode = "dark" | "light";

type ThemePalette = {
  mode: ThemeMode;
  primary: string;
  secondary: string;
  tertiary: string;
  quaternary: string;
  background: string;
  surface: string;
  surface2: string;
  border: string;
  text: string;
  textSecondary: string;
  muted: string;
  overlay: string;
  protein: string;
  carbs: string;
  fats: string;
};

const palettes: Record<ThemeMode, ThemePalette> = {
  dark: {
    mode: "dark",
    primary: "#111111",
    secondary: "#FF772C",
    tertiary: "#181818",
    quaternary: "#1C1E1F",
    background: "#111111",
    surface: "#141414",
    surface2: "#181818",
    border: "#262626",
    text: "#FAFAFA",
    textSecondary: "#242529",
    muted: "#A3A3A3",
    overlay: "rgba(0,0,0,0.7)",
    protein: "#7ED957",
    carbs: "#60A5FA",
    fats: "#F59E0B"
  },
  light: {
    mode: "light",
    primary: "#EEEEEE",
    secondary: "#FF8A4C",
    tertiary: "#DADADA",
    quaternary: "#CFCFCF",
    background: "#EEEEEE",
    surface: "#FFFFFF",
    surface2: "#E4E4E4",
    border: "#C8C8C8",
    text: "#111111",
    textSecondary: "#242529",
    muted: "#6B7280",
    overlay: "rgba(17,17,17,0.18)",
    protein: "#3FAE2A",
    carbs: "#2563EB",
    fats: "#D97706"
  }
};

type ThemeContextValue = {
  theme: ThemePalette;
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  toggleMode: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>("dark");

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme: palettes[mode],
      mode,
      setMode,
      toggleMode: () => setMode((current) => (current === "dark" ? "light" : "dark"))
    }),
    [mode]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useAppTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useAppTheme must be used within ThemeProvider");
  }

  return context;
}
