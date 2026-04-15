/**
 * Design System - Projeto Cirurgiao
 * Paleta inspirada no conceito navy/moderno (referencia Coursera)
 */

// ============================================
// SPACING SCALE (base 4px)
// ============================================
export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  '4xl': 40,
  '5xl': 48,
  '6xl': 64,
} as const;

// ============================================
// TYPOGRAPHY SCALE
// ============================================
export const FontSize = {
  xs: 11,
  sm: 12,
  md: 14,
  base: 16,
  lg: 18,
  xl: 20,
  '2xl': 24,
  '3xl': 28,
  '4xl': 32,
} as const;

export const FontWeight = {
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
};

export const LineHeight = {
  tight: 1.2,
  normal: 1.5,
  relaxed: 1.75,
} as const;

// ============================================
// BORDER RADIUS SCALE
// ============================================
export const BorderRadius = {
  sm: 6,
  md: 8,
  lg: 12,
  xl: 16,
  '2xl': 24,
  full: 9999,
} as const;

// ============================================
// ELEVATION / SHADOWS
// ============================================
export const Shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  xl: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
  },
} as const;

// ============================================
// ICON SIZES
// ============================================
export const IconSize = {
  sm: 16,
  md: 20,
  lg: 24,
  xl: 28,
  '2xl': 32,
} as const;

// ============================================
// COLORS
// ============================================
export const Colors = {
  // ---- Brand / Primary (Navy) ----
  primary: '#1B2A4A',        // Navy escuro principal (header, brand)
  primaryDark: '#0F1B33',    // Navy mais profundo
  primaryLight: '#2D4373',   // Navy mais claro

  // ---- Accent (Azul vibrante) ----
  accent: '#4A6CF7',         // Azul vibrante (botoes, links, destaques)
  accentDark: '#3451D1',
  accentLight: '#6B8AFF',
  accentSoft: '#EEF1FE',    // Background sutil do accent

  // ---- Semantic ----
  success: '#22C55E',
  successLight: '#ECFDF5',
  danger: '#EF4444',
  dangerLight: '#FEF2F2',
  warning: '#F59E0B',
  warningLight: '#FFFBEB',
  info: '#3B82F6',
  infoLight: '#EFF6FF',

  // ---- Neutrals ----
  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',

  // ---- Backgrounds ----
  background: '#F5F7FA',     // Fundo geral (cinza frio)
  backgroundDark: '#0F172A',
  card: '#FFFFFF',
  cardDark: '#1E293B',

  // ---- Text ----
  text: '#1E293B',           // Texto principal (quase preto)
  textSecondary: '#64748B',  // Texto secundario
  textMuted: '#94A3B8',      // Texto desabilitado/dica
  textDark: '#F8FAFC',
  textMutedDark: '#94A3B8',
  textOnPrimary: '#FFFFFF',  // Texto sobre fundo navy
  textOnAccent: '#FFFFFF',   // Texto sobre botao accent

  // ---- Borders ----
  border: '#E2E8F0',
  borderLight: '#F1F5F9',
  borderDark: '#334155',
  borderFocus: '#4A6CF7',    // Borda quando input em foco

  // ---- Input ----
  inputBackground: '#FFFFFF',
  inputBorder: '#E2E8F0',
  inputText: '#1E293B',
  inputPlaceholder: '#94A3B8',

  // ---- Gradients ----
  gradientNavy: ['#1B2A4A', '#0F1B33'] as readonly string[],
  gradientAccent: ['#4A6CF7', '#3451D1'] as readonly string[],
  gradientSuccess: ['#22C55E', '#16A34A'] as readonly string[],

  // ---- Social Login ----
  google: '#FFFFFF',
  facebook: '#1877F2',
  apple: '#000000',
};

// Tema claro (react-navigation)
export const LightTheme = {
  dark: false,
  colors: {
    primary: Colors.accent,
    background: Colors.background,
    card: Colors.card,
    text: Colors.text,
    border: Colors.border,
    notification: Colors.danger,
  },
};

// Tema escuro (react-navigation)
export const DarkTheme = {
  dark: true,
  colors: {
    primary: Colors.accent,
    background: Colors.backgroundDark,
    card: Colors.cardDark,
    text: Colors.textDark,
    border: Colors.borderDark,
    notification: Colors.danger,
  },
};

export default Colors;
