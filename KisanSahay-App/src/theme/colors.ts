export const Colors = {
  // Brand Palette
  primary: '#16a34a',       // KisanSahay vibrant emerald green
  primaryDark: '#15803d',
  primaryLight: '#86efac',
  primaryMuted: '#064e3b',
  
  // Theme Backgrounds
  background: '#0a0f1a',    // Deep night sky / navy
  surface: '#111827',       // Dark card surface
  surfaceLight: '#1f2937',  // Elevated element surface
  border: '#374151',        // Soft divider
  borderLight: '#4b5563',
  
  // Typography
  text: '#f9fafb',          // High-contrast primary text
  textSecondary: '#9ca3af', // Subtle text
  textMuted: '#6b7280',     // Inactive text
  
  // Status & Semantics
  warning: '#f59e0b',       // Amber warning
  danger: '#ef4444',        // Error / high debt risk
  success: '#22c55e',       // Verification passed / safe debt
  gold: '#fbbf24',          // Harvest gold / KCC highlight
  blue: '#3b82f6',          // Information / Aadhaar
  
  // Overlays
  overlay: 'rgba(10, 15, 26, 0.85)',
  glass: 'rgba(17, 24, 39, 0.75)',
};

export type ThemeColors = typeof Colors;
