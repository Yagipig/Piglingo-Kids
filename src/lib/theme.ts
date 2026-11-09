import { useColorScheme } from "react-native";

import { kingdomForCourse } from "./kingdoms";
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
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  full: 999,
} as const;

/* ------------------------------------------------------------------ */
/* REDESIGN PHASE 2 — design system dùng chung (additive, không phá   */
/* token cũ). Mọi phase sau (Home/Bản đồ/Học/Game) lấy token từ đây.  */
/* ------------------------------------------------------------------ */

/** Thang khoảng cách chuẩn (px) — dùng cho padding/margin/gap. */
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 40,
} as const;

/**
 * Thang chữ chuẩn cho giao diện game: tiêu đề thật đậm và tròn trịa,
 * nội dung vừa phải cho trẻ 7–9 tuổi đọc một mình.
 */
export const typography = {
  display: { fontSize: 30, lineHeight: 36, fontWeight: "900" },
  h1: { fontSize: 24, lineHeight: 30, fontWeight: "900" },
  h2: { fontSize: 20, lineHeight: 26, fontWeight: "800" },
  title: { fontSize: 17, lineHeight: 22, fontWeight: "800" },
  body: { fontSize: 15, lineHeight: 21, fontWeight: "600" },
  bodySmall: { fontSize: 14, lineHeight: 19, fontWeight: "600" },
  caption: { fontSize: 13, lineHeight: 17, fontWeight: "700" },
  tiny: { fontSize: 11, lineHeight: 14, fontWeight: "700" },
} as const;

/** Vùng chạm: mọi nút/chip bấm được phải đạt tối thiểu 48px (brief). */
export const touchTargets = {
  min: 48,
  tabBarHeight: 88,
  tabIcon: 28,
} as const;

/** Khung layout mobile-first portrait dùng chung toàn app. */
export const layout = {
  /** Bề rộng tối đa của cột nội dung kiểu điện thoại (căn giữa khi màn rộng). */
  phoneMaxWidth: 480,
  /** Bề rộng tối đa cho nội dung đọc rộng (panel, dashboard). */
  contentMaxWidth: 720,
  /** Lề ngang chuẩn của màn hình điện thoại. */
  gutter: 16,
} as const;

/**
 * Bảng màu "trời/biển" sáng kiểu game cho nền trang trí ngoài cột điện
 * thoại (tablet/desktop) và các cảnh trời/biển về sau. `skyTop`/`skyBottom`
 * là 2 lớp View chồng nhau giả gradient như tiền lệ palette vùng đất —
 * app không dùng thư viện gradient.
 */
export const gamePalette = {
  skyTop: "#7dd3fc",
  skyBottom: "#e0f2fe",
  sea: "#38bdf8",
  seaDeep: "#0284c7",
  sand: "#fde68a",
  grass: "#86efac",
  cloud: "#ffffff",
} as const;

export type GamePalette = { [K in keyof typeof gamePalette]: string };

/** Bản tối của bảng màu trời/biển (đêm trong vườn). */
export const gamePaletteDark: GamePalette = {
  skyTop: "#0b2536",
  skyBottom: "#131f24",
  sea: "#0c4a6e",
  seaDeep: "#082f49",
  sand: "#b45309",
  grass: "#14532d",
  cloud: "#1e2c33",
};

/** Bảng màu trời/biển theo giao diện sáng/tối đang hiệu lực. */
export function useGamePalette(): GamePalette {
  return useResolvedScheme() === "dark" ? gamePaletteDark : gamePalette;
}

/**
 * Token màu theo vương quốc của một khóa — NGUỒN DUY NHẤT là bảng màu
 * trong `kingdoms.ts` (Vương quốc Cổ Tích / Hoa Anh Đào / Đèn Lồng),
 * hàm này chỉ dẫn xuất dạng token phẳng cho design system dùng chung.
 * Trả null nếu khóa không thuộc 3 vương quốc thật.
 */
export function kingdomColorTokens(courseId: string) {
  const kingdom = kingdomForCourse(courseId);
  if (!kingdom) return null;
  const p = kingdom.palette;
  return {
    kingdomName: kingdom.kingdomName,
    targetLanguage: kingdom.targetLanguage,
    primary: p.primary,
    deep: p.deep,
    secondary: p.secondary,
    accent: p.accent,
    soft: p.soft,
    onPrimary: p.onPrimary,
  } as const;
}

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
  /** Bóng mềm rất nhẹ cho thẻ/chip trên nền trời sáng (Phase 2). */
  soft: {
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 5,
    elevation: 2,
  },
  /** Bóng nổi cho phần tử bay trên nền (tab bar, nút nổi, panel). */
  floating: {
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.14,
    shadowRadius: 12,
    elevation: 8,
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
