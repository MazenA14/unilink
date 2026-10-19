/**
 * UniLink Color Tokens — original red/coral on dark-gray palette, refined.
 * -------------------------------------------------------------
 * Brand red `#FF4136` (coral `#FF6B5A` in dark mode) on neutral grays, with
 * the dark theme built on the original `#1A1A1A` charcoal. Refinements over
 * the first palette: softer near-black text, a cleaner neutral gray ramp,
 * hairline borders that read in both modes, and semantic colours tuned so
 * they stay legible on their soft backgrounds.
 *
 * Legacy keys (mainFont, secondaryFont, tabColor, cardBackground, grade*, …)
 * are kept and mapped onto the tokens so every screen follows the theme.
 *
 * Contrast rules:
 *  - Filled primary buttons use `onPrimary` (white in light, charcoal in
 *    dark, since the dark-mode coral is light). Never hardcode white on tint.
 *  - `onAccent` is for content on saturated accent fills (slot types,
 *    grades, GPA, destructive buttons).
 */
export const Colors = {
  light: {
    text: '#111111',
    background: '#FFFFFF',
    tint: '#FF4136',
    icon: '#6D6D6D',
    tabIconDefault: '#6D6D6D',
    tabIconSelected: '#FF4136',
    // Custom app colors
    mainFont: '#111111',
    secondaryFont: '#6D6D6D',
    tabColor: '#FF4136',
    fileBackground: '#FFDE59',
    border: '#E6E6E8',
    financials: '#27AE60',
    // Grade colors
    gradeExcellent: '#2E7D32',
    gradeGood: '#66BB6A',
    gradeAverage: '#FF9800',
    gradeBelowAverage: '#FF5722',
    gradeFailing: '#F44336',
    // Course without grades color
    noGrades: '#2196F3',
    // Error colors
    error: '#F44336',
    cardBackground: '#FFFFFF',
    // CMS color - distinctive purple for app view changes
    cms: '#8E44AD',

    // ── Design-system tokens ──
    // Brand — red/coral
    primary: '#FF4136',
    primaryDark: '#E0352B',
    primaryLight: '#FF6B5A',
    primarySoft: '#FFEDEB',
    onPrimary: '#FFFFFF',
    // Content on saturated accent fills (slot types, grades, status)
    onAccent: '#FFFFFF',
    // Secondary — blue accent
    secondary: '#2196F3',
    secondaryDark: '#1976D2',
    secondaryLight: '#64B5F6',
    secondarySoft: '#E8F2FD',
    onSecondary: '#FFFFFF',
    // Links
    link: '#2563EB',
    // Surface tiers (light-gray cards on white)
    surface: '#F4F4F5',
    surfaceElevated: '#FFFFFF',
    surfaceSunken: '#ECECEE',
    surfaceAlt: '#F8F8F9',
    // Text tiers
    textPrimary: '#111111',
    textSecondary: '#6D6D6D',
    textTertiary: '#9A9A9E',
    // Lines
    borderStrong: '#D2D2D6',
    divider: '#EDEDEF',
    // Semantic
    success: '#27AE60',
    warning: '#F59E0B',
    info: '#2196F3',
    danger: '#F44336',
    successSoft: '#E7F6EE',
    warningSoft: '#FEF4E2',
    infoSoft: '#E8F2FD',
    dangerSoft: '#FDECEB',
    // Elevation / overlay
    shadow: '#000000',
    overlay: 'rgba(0, 0, 0, 0.5)',
  },
  dark: {
    text: '#F2F2F2',
    background: '#1A1A1A',
    tint: '#FF6B5A',
    icon: '#A0A0A0',
    tabIconDefault: '#A0A0A0',
    tabIconSelected: '#FF6B5A',
    // Custom app colors (dark theme variants)
    mainFont: '#F2F2F2',
    secondaryFont: '#A0A0A0',
    tabColor: '#FF6B5A',
    fileBackground: '#B8A142',
    border: '#383838',
    financials: '#2ECC71',
    // Grade colors (dark theme variants)
    gradeExcellent: '#2E7D32',
    gradeGood: '#66BB6A',
    gradeAverage: '#FF9800',
    gradeBelowAverage: '#FF5722',
    gradeFailing: '#F44336',
    // Course without grades color (dark theme)
    noGrades: '#64B5F6',
    // Error colors (dark theme variants)
    error: '#F44336',
    cardBackground: '#2A2A2A',
    // CMS color (dark theme)
    cms: '#9B59B6',

    // ── Design-system tokens ──
    // Brand — coral (light enough for charcoal text on top)
    primary: '#FF6B5A',
    primaryDark: '#FF4136',
    primaryLight: '#FF8A7A',
    primarySoft: '#3A211E',
    onPrimary: '#1A1A1A',
    // Content on saturated accent fills (slot types, grades, status)
    onAccent: '#FFFFFF',
    // Secondary — blue accent
    secondary: '#64B5F6',
    secondaryDark: '#2196F3',
    secondaryLight: '#90CAF9',
    secondarySoft: '#172A3B',
    onSecondary: '#1A1A1A',
    // Links
    link: '#60A5FA',
    // Surface tiers (charcoal ramp)
    surface: '#242424',
    surfaceElevated: '#2A2A2A',
    surfaceSunken: '#141414',
    surfaceAlt: '#202020',
    // Text tiers
    textPrimary: '#F2F2F2',
    textSecondary: '#A0A0A0',
    textTertiary: '#727272',
    // Lines
    borderStrong: '#4A4A4A',
    divider: '#303030',
    // Semantic
    success: '#2ECC71',
    warning: '#FFA726',
    info: '#64B5F6',
    danger: '#EF5350',
    successSoft: '#163323',
    warningSoft: '#3A2D14',
    infoSoft: '#172A3B',
    dangerSoft: '#3A1A1A',
    // Elevation / overlay
    shadow: '#000000',
    overlay: 'rgba(0, 0, 0, 0.6)',
  },
};

// Schedule type colors - warm theme (original)
export const ScheduleTypeColors = {
  personal: '#FF6B6B', // Coral red (matches app theme)
  staff: '#FF6B6B',
  instructor: '#FF8C42', // Orange
  course: '#FF6B6B',
  group: '#FF69B4',    // Hot pink
  combined: '#4CAF50', // Green for combined selections
};

// Slot type colors - matching dashboard colors (original)
export const SlotTypeColors = {
  Lecture: '#3B82F6',    // Blue
  Tutorial: '#10B981',   // Green
  Lab: '#F59E0B',        // Amber
  Practical: '#FF6B35',  // Orange-red
  Seminar: '#8B5CF6',    // Purple
  Workshop: '#EF4444',   // Red
  Project: '#06B6D4',    // Cyan
  Thesis: '#84CC16',     // Lime
  Free: '#6B7280',       // Gray
};

// Schedule color palettes for light and dark modes (original warm theme, slightly cleaner)
export const ScheduleColors = {
  light: {
    // Background colors
    periodRowBg: '#FFF6F5',
    periodRowBorder: '#FFE2DF',
    periodLabelBg: '#FFFFFF',
    periodLabelBorder: '#FFE2DF',
    emptyPeriodBg: '#FFF9F8',
    emptyPeriodBorder: '#FFDAD6',

    // Text colors
    periodLabelText: '#2A1E1E',
    emptyText: '#8B5A5A',

    // Accent colors
    accent1: '#FFE66D', // Yellow
    accent2: '#FF8B94', // Pink
    accent3: '#FFB347', // Orange
    accent4: '#FFD3A5', // Peach
  },
  dark: {
    // Background colors
    periodRowBg: '#2A1F1F',
    periodRowBorder: '#3D2A2A',
    periodLabelBg: '#1F1515',
    periodLabelBorder: '#3D2A2A',
    emptyPeriodBg: '#2A1F1F',
    emptyPeriodBorder: '#3D2A2A',

    // Text colors
    periodLabelText: '#F5E6E6',
    emptyText: '#B8A0A0',

    // Accent colors
    accent1: '#FFD700', // Gold
    accent2: '#FF69B4', // Hot pink
    accent3: '#FF8C00', // Dark orange
    accent4: '#FFA07A', // Light salmon
  },
};
