import { useColorScheme } from "react-native";

import { useProgress } from "./store";

/**
 * Design tokens lifted from the web app's Tailwind palette
 * (sky/green/rose/indigo with darker bottom borders for the 3D effect).
 *
 * Colors come in a light and a dark palette with identical keys. Components
 * resolve the active palette through `useThemeColors()` / `makeThemedStyles()`
 * based on the user's preference (device setting by default, overridable in
 * the profile settings).
 */
const lightColors = {
  // brand
  green: "#22c55e",
  greenDark: "#16a34a",
  greenLight: "#4ade80",
  sky: "#38bdf8",
  skyDark: "#0ea5e9",
  rose: "#f43f5e",
  roseDark: "#e11d48",
  indigo: "#6366f1",
  indigoDark: "#4f46e5",
  amber: "#f59e0b",
  orange: "#ff9600",

  // neutrals
  white: "#ffffff",
  background: "#ffffff",
  /** Card / chip surfaces that sit on the background. */
  surface: "#ffffff",
  text: "#3c3c3c",
  textMuted: "#737373",
  neutral100: "#f5f5f5",
  neutral200: "#e5e5e5",
  neutral300: "#d4d4d4",
  neutral400: "#a3a3a3",
  neutral700: "#404040",

  // feedback surfaces
  correctBg: "#d7ffb8",
  correctText: "#58a700",
  wrongBg: "#ffdfe0",
  wrongText: "#ea2b2b",
  selectedBg: "#e0f2fe",
  selectedText: "#0ea5e9",
} as const;

export type ThemeColors = { [K in keyof typeof lightColors]: string };

/** Duolingo-style night palette: deep blue-gray, brighter accents for contrast. */
const darkColors: ThemeColors = {
  // brand (unchanged — these read fine on the dark background)
  green: "#22c55e",
  greenDark: "#16a34a",
  greenLight: "#4ade80",
  sky: "#38bdf8",
  skyDark: "#0ea5e9",
  rose: "#f43f5e",
  roseDark: "#e11d48",
  indigo: "#818cf8",
  indigoDark: "#4f46e5",
  amber: "#f59e0b",
  orange: "#ff9600",

  // neutrals
  white: "#ffffff",
  background: "#131f24",
  surface: "#1b272e",
  text: "#e8eef1",
  textMuted: "#9aabb4",
  neutral100: "#1e2c33",
  neutral200: "#37464f",
  neutral300: "#43555f",
  neutral400: "#5f7681",
  neutral700: "#dce6ea",

  // feedback surfaces
  correctBg: "#1d3a1e",
  correctText: "#8bd94a",
  wrongBg: "#3a2126",
  wrongText: "#ff7b89",
  selectedBg: "#12303f",
  selectedText: "#38bdf8",
};

export const radius = {
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  full: 999,
} as const;

/**
 * "Little Explorers" world tokens (redesign 27/10/2026 — additive only).
 * Fake-3D depth comes from chunky bottom borders + these soft shadows;
 * no gradient library is used anywhere.
 */
export const shadow = {
  card: {
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  chunky: {
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
} as const;

/** Adventure highlight used for the current lesson / continue CTA. */
export const adventureColors = {
  glow: "#fbbf24",
  glowSoft: "#fde68a",
} as const;

/**
 * Palette per land kind for the world map. `top`/`bottom` are two layered
 * View colors that fake a gradient "scene" on the land banner; `dark` is
 * the land accent in dark mode (banners pair it with a dimmed `bottom`).
 */
export type LandKind =
  | "forest"
  | "island"
  | "village"
  | "ocean"
  | "castle"
  | "mountain"
  | "valley"
  | "meadow";

export const landPalette: Record<
  LandKind,
  { top: string; bottom: string; accent: string; dark: string }
> = {
  forest: { top: "#86efac", bottom: "#22c55e", accent: "#16a34a", dark: "#15803d" },
  island: { top: "#fde68a", bottom: "#38bdf8", accent: "#0ea5e9", dark: "#0369a1" },
  village: { top: "#fed7aa", bottom: "#fb923c", accent: "#ea580c", dark: "#9a3412" },
  ocean: { top: "#7dd3fc", bottom: "#0284c7", accent: "#0369a1", dark: "#075985" },
  castle: { top: "#c7d2fe", bottom: "#6366f1", accent: "#4f46e5", dark: "#3730a3" },
  mountain: { top: "#e2e8f0", bottom: "#38bdf8", accent: "#0284c7", dark: "#475569" },
  valley: { top: "#fbcfe8", bottom: "#f59e0b", accent: "#d97706", dark: "#b45309" },
  meadow: { top: "#fef08a", bottom: "#4ade80", accent: "#16a34a", dark: "#15803d" },
};

/** Units cycle through these (Duolingo-style section colors). */
export const unitPalette: { main: string; dark: string }[] = [
  { main: lightColors.green, dark: lightColors.greenDark },
  { main: lightColors.indigo, dark: lightColors.indigoDark },
  { main: lightColors.sky, dark: lightColors.skyDark },
  { main: lightColors.rose, dark: lightColors.roseDark },
  { main: lightColors.amber, dark: "#d97706" },
];

/**
 * The color scheme in effect right now: the user's explicit choice, or the
 * device setting when the preference is "system".
 */
export function useResolvedScheme(): "light" | "dark" {
  const preference = useProgress((s) => s.themePreference);
  const system = useColorScheme();
  if (preference === "system") return system === "dark" ? "dark" : "light";
  return preference;
}

export function useThemeColors(): ThemeColors {
  return useResolvedScheme() === "dark" ? darkColors : lightColors;
}

/**
 * Theme-aware replacement for a module-level `StyleSheet.create`:
 *
 *   const useStyles = makeThemedStyles((colors) => StyleSheet.create({...}));
 *
 * The factory runs once per palette; the styles are cached so re-renders and
 * remounts reuse the same StyleSheet objects.
 */
export function makeThemedStyles<T>(factory: (colors: ThemeColors) => T): () => T {
  const cache = new Map<ThemeColors, T>();
  return function useThemedStyles(): T {
    const colors = useThemeColors();
    let styles = cache.get(colors);
    if (!styles) {
      styles = factory(colors);
      cache.set(colors, styles);
    }
    return styles;
  };
}
