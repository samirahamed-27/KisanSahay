import { MD3DarkTheme, MD3LightTheme } from 'react-native-paper';
import { Colors } from './colors';

export const DarkTheme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: Colors.primary,
    onPrimary: '#ffffff',
    primaryContainer: Colors.primaryMuted,
    onPrimaryContainer: Colors.primaryLight,
    background: Colors.background,
    onBackground: Colors.text,
    surface: Colors.surface,
    onSurface: Colors.text,
    surfaceVariant: Colors.surfaceLight,
    onSurfaceVariant: Colors.textSecondary,
    outline: Colors.border,
    error: Colors.danger,
  },
  roundness: 12,
};

export const LightTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: Colors.primary,
    onPrimary: '#ffffff',
    background: '#f8fafc',
    onBackground: '#0f172a',
    surface: '#ffffff',
    onSurface: '#0f172a',
    surfaceVariant: '#f1f5f9',
    onSurfaceVariant: '#64748b',
    outline: '#cbd5e1',
  },
  roundness: 12,
};
