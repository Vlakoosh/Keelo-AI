import { createContext, useContext, useMemo, useState } from "react";

export type ThemeMode = "dark" | "light";

export type ThemePalette = {
  mode: ThemeMode;
  canvas: string;
  card: string;
  cardMuted: string;
  cardAccent: string;
  cardSuccess: string;
  cardWarning: string;
  input: string;
  primaryAccent: string;
  primaryAccentSoft: string;
  secondaryAccent: string;
  secondaryAccentSoft: string;
  info: string;
  infoSoft: string;
  success: string;
  successSoft: string;
  warning: string;
  warningSoft: string;
  danger: string;
  dangerSoft: string;
  active: string;
  activeSoft: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  textOnAccent: string;
  icon: string;
  iconMuted: string;
  overlay: string;
  shadow: string;
  hairline: string;
  protein: string;
  carbs: string;
  fats: string;
  completed: string;
  completedSoft: string;
  destructive: string;
  destructiveSoft: string;
  transparent: string;

  /**
   * Backward-compatible aliases for the existing screens while the app moves
   * toward the semantic token names above.
   */
  primary: string;
  secondary: string;
  tertiary: string;
  quaternary: string;
  background: string;
  surface: string;
  surface2: string;
  border: string;
  muted: string;
};

const palettes: Record<ThemeMode, ThemePalette> = {
  dark: {
    mode: "dark",
    canvas: "#161917",
    card: "#202622",
    cardMuted: "#263029",
    cardAccent: "#28362E",
    cardSuccess: "#223329",
    cardWarning: "#342F22",
    input: "#27302A",
    primaryAccent: "#9CCB8E",
    primaryAccentSoft: "#2D3E31",
    secondaryAccent: "#F0A27E",
    secondaryAccentSoft: "#3C2E27",
    info: "#90B4D8",
    infoSoft: "#243342",
    success: "#8CCF9C",
    successSoft: "#223329",
    warning: "#E8C66B",
    warningSoft: "#342F22",
    danger: "#F3A09B",
    dangerSoft: "#3D2928",
    active: "#9CCB8E",
    activeSoft: "#2D3E31",
    text: "#F6F4EE",
    textSecondary: "#D4D0C6",
    textMuted: "#A59F94",
    textOnAccent: "#102015",
    icon: "#F6F4EE",
    iconMuted: "#A59F94",
    overlay: "rgba(0,0,0,0.62)",
    shadow: "rgba(0,0,0,0.34)",
    hairline: "#323A34",
    protein: "#8CCF9C",
    carbs: "#90B4D8",
    fats: "#E8C66B",
    completed: "#9CCB8E",
    completedSoft: "#2D3E31",
    destructive: "#F3A09B",
    destructiveSoft: "#3D2928",
    transparent: "rgba(0,0,0,0)",

    primary: "#202622",
    secondary: "#9CCB8E",
    tertiary: "#263029",
    quaternary: "#323A34",
    background: "#161917",
    surface: "#202622",
    surface2: "#263029",
    border: "#323A34",
    muted: "#A59F94",
  },
  light: {
    mode: "light",
    canvas: "#E8ECE5",
    card: "#FFFFFF",
    cardMuted: "#F6F7F2",
    cardAccent: "#EAF2E5",
    cardSuccess: "#E8F3EA",
    cardWarning: "#FBF1D7",
    input: "#F7F8F3",
    primaryAccent: "#7FA56F",
    primaryAccentSoft: "#EAF2E5",
    secondaryAccent: "#E99A78",
    secondaryAccentSoft: "#F8E8DE",
    info: "#789AC1",
    infoSoft: "#E7EEF6",
    success: "#6EA77B",
    successSoft: "#E8F3EA",
    warning: "#D6AC47",
    warningSoft: "#FBF1D7",
    danger: "#D86D62",
    dangerSoft: "#F7E2DE",
    active: "#6EA77B",
    activeSoft: "#E8F3EA",
    text: "#171A17",
    textSecondary: "#4E554E",
    textMuted: "#7C8379",
    textOnAccent: "#FFFFFF",
    icon: "#20251F",
    iconMuted: "#7C8379",
    overlay: "rgba(17,17,17,0.18)",
    shadow: "rgba(31,45,32,0.12)",
    hairline: "#E2E5DC",
    protein: "#6EA77B",
    carbs: "#789AC1",
    fats: "#D6AC47",
    completed: "#6EA77B",
    completedSoft: "#E8F3EA",
    destructive: "#D86D62",
    destructiveSoft: "#F7E2DE",
    transparent: "rgba(0,0,0,0)",

    primary: "#FFFFFF",
    secondary: "#7FA56F",
    tertiary: "#FFFFFF",
    quaternary: "#E2E5DC",
    background: "#E8ECE5",
    surface: "#FFFFFF",
    surface2: "#F6F7F2",
    border: "#E2E5DC",
    muted: "#7C8379",
  },
};

type ThemeContextValue = {
  theme: ThemePalette;
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  toggleMode: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>("light");

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme: palettes[mode],
      mode,
      setMode,
      toggleMode: () =>
        setMode((current) => (current === "dark" ? "light" : "dark")),
    }),
    [mode],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useAppTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useAppTheme must be used within ThemeProvider");
  }

  return context;
}
