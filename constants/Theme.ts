/**
 * UniLink Design System — Layout & Style Tokens
 * -------------------------------------------------------------
 * Shared spacing, radius, typography and elevation primitives used to
 * keep every screen visually consistent. Pure presentation — no logic.
 *
 * Usage:
 *   import { Spacing, Radius, Type, Shadow } from '@/constants/Theme';
 *   style={{ padding: Spacing.lg, borderRadius: Radius.lg, ...Shadow.card(colors) }}
 */
import { TextStyle } from 'react-native';

// ── Spacing scale (4pt base) ──────────────────────────────────
export const Spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 40,
} as const;

// ── Corner radii ──────────────────────────────────────────────
export const Radius = {
  xs: 6,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
  pill: 999,
} as const;

// ── Typography scale ──────────────────────────────────────────
export const Type = {
  // Display / hero
  display: { fontSize: 32, fontWeight: '800', letterSpacing: -0.5 } as TextStyle,
  // Screen titles
  title: { fontSize: 26, fontWeight: '800', letterSpacing: -0.4 } as TextStyle,
  // Section headers
  h2: { fontSize: 20, fontWeight: '700', letterSpacing: -0.3 } as TextStyle,
  h3: { fontSize: 17, fontWeight: '700', letterSpacing: -0.2 } as TextStyle,
  // Body
  body: { fontSize: 15, fontWeight: '500', letterSpacing: -0.1 } as TextStyle,
  bodyStrong: { fontSize: 15, fontWeight: '700', letterSpacing: -0.1 } as TextStyle,
  // Supporting
  callout: { fontSize: 14, fontWeight: '600' } as TextStyle,
  subtext: { fontSize: 13, fontWeight: '500' } as TextStyle,
  caption: { fontSize: 12, fontWeight: '600', letterSpacing: 0.1 } as TextStyle,
  overline: { fontSize: 11, fontWeight: '700', letterSpacing: 0.6, textTransform: 'uppercase' } as TextStyle,
} as const;

// ── Elevation / shadow presets ────────────────────────────────
// Each returns a style fragment; pass the active `colors` object so the
// shadow colour follows the theme.
type WithShadow = { shadow: string };

export const Shadow = {
  none: () => ({
    shadowColor: 'transparent',
    shadowOpacity: 0,
    elevation: 0,
  }),
  // Subtle lift for chips / small controls
  xs: (c: WithShadow) => ({
    shadowColor: c.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 1,
  }),
  // Default card
  card: (c: WithShadow) => ({
    shadowColor: c.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  }),
  // Raised / interactive card
  md: (c: WithShadow) => ({
    shadowColor: c.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
    elevation: 6,
  }),
  // Floating (modals, menus, FABs)
  lg: (c: WithShadow) => ({
    shadowColor: c.shadow,
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.18,
    shadowRadius: 28,
    elevation: 12,
  }),
  // Coloured glow (accent buttons)
  glow: (color: string) => ({
    shadowColor: color,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 6,
  }),
} as const;

// ── Common layout constants ───────────────────────────────────
export const Layout = {
  screenPadding: Spacing.xl,
  headerTopPad: 60,
  cardGap: Spacing.md,
  hairline: 1,
} as const;

// Convenience: add alpha to a hex color (#RRGGBB -> #RRGGBBAA)
// Accepts 0..1 opacity. Falls back to the raw color if not a 6-digit hex.
export function withAlpha(hex: string, opacity: number): string {
  if (!/^#([0-9A-Fa-f]{6})$/.test(hex)) return hex;
  const a = Math.round(Math.max(0, Math.min(1, opacity)) * 255)
    .toString(16)
    .padStart(2, '0');
  return `${hex}${a}`;
}
