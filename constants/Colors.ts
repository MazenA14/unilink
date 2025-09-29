/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */
export const Colors = {
  light: {
    text: '#000000',
    background: '#ffffff',
    tint: '#ff4136',
    icon: '#6d6d6d',
    tabIconDefault: '#6d6d6d',
    tabIconSelected: '#ff4136',
    // Custom app colors
    mainFont: '#000000',
    secondaryFont: '#6d6d6d',
    tabColor: '#ff4136',
    fileBackground: '#ffde59',
    border: '#e0e0e0',
    financials: '#2ecc71',
    // Grade colors
    gradeExcellent: '#2E7D32',
    gradeGood: '#66BB6A',
    gradeAverage: '#FF9800',
    gradeBelowAverage: '#FF5722',
    gradeFailing: '#F44336',
    // Course without grades color
    noGrades: '#2196F3', // Blue
    // Error colors
    error: '#F44336',
    cardBackground: '#ffffff',
    // CMS color - distinctive purple for app view changes
    cms: '#8E44AD',
  },
  dark: {
    text: '#ffffff',
    background: '#1a1a1a',
    tint: '#ff6b5a',
    icon: '#a0a0a0',
    tabIconDefault: '#a0a0a0',
    tabIconSelected: '#ff6b5a',
    // Custom app colors (dark theme variants)
    mainFont: '#ffffff',
    secondaryFont: '#a0a0a0',
    tabColor: '#ff6b5a',
    fileBackground: '#b8a142',
    border: '#404040',
    financials: '#27ae60',
    // Grade colors (dark theme variants)
    gradeExcellent: '#2E7D32',
    gradeGood: '#66BB6A',
    gradeAverage: '#FF9800',
    gradeBelowAverage: '#FF5722',
    gradeFailing: '#F44336',
    // Course without grades color (dark theme)
    noGrades: '#64B5F6', // Light blue
    // Error colors (dark theme variants)
    error: '#F44336',
    cardBackground: '#2a2a2a',
    // CMS color - distinctive purple for app view changes (dark theme)
    cms: '#9B59B6',
  },
};

// Schedule type colors - Warm theme colors
export const ScheduleTypeColors = { // FF8C42
  personal: '#FF6B6B', // Vibrant coral red (matches app theme)
  staff: '#FF6B6B',    // Match personal (red)
  instructor: '#FF8C42',    // Match personal (red)
  course: '#FF6B6B',   // Match personal (red)
  group: '#FF69B4',    // Hot pink
  combined: '#4CAF50', // Green for combined selections
};

// Slot type colors - matching dashboard colors
export const SlotTypeColors = {
  Lecture: '#3B82F6',    // Blue
  Tutorial: '#10B981',   // Green
  Lab: '#F59E0B',        // Amber/Orange
  Seminar: '#8B5CF6',    // Purple
  Workshop: '#EF4444',   // Red
  Project: '#06B6D4',    // Cyan
  Thesis: '#84CC16',     // Lime
  Free: '#6B7280',       // Gray
};

// Schedule color palettes for light and dark modes - matching app theme
export const ScheduleColors = {
  light: {
    // Background colors - warm and colorful
    periodRowBg: '#FFF5F5', // Very light red tint
    periodRowBorder: '#FFE0E0', // Light red border
    periodLabelBg: '#FFFFFF',
    periodLabelBorder: '#FFE0E0',
    emptyPeriodBg: '#FFF8F8', // Light warm background
    emptyPeriodBorder: '#FFD6D6', // Warm border
    
    // Text colors
    periodLabelText: '#2D1B1B', // Warm dark text
    emptyText: '#8B5A5A', // Warm muted text
    
    // Accent colors - warm theme
    accent1: '#FFE66D', // Yellow
    accent2: '#FF8B94', // Pink
    accent3: '#FFB347', // Orange
    accent4: '#FFD3A5', // Peach
  },
  dark: {
    // Background colors - warm dark theme
    periodRowBg: '#2A1F1F', // Warm dark background
    periodRowBorder: '#3D2A2A', // Warm dark border
    periodLabelBg: '#1F1515', // Very dark warm background
    periodLabelBorder: '#3D2A2A',
    emptyPeriodBg: '#2A1F1F',
    emptyPeriodBorder: '#3D2A2A',
    
    // Text colors
    periodLabelText: '#F5E6E6', // Warm light text
    emptyText: '#B8A0A0', // Warm muted light text
    
    // Accent colors - warm bright theme
    accent1: '#FFD700', // Gold
    accent2: '#FF69B4', // Hot pink
    accent3: '#FF8C00', // Dark orange
    accent4: '#FFA07A', // Light salmon
  },
};
