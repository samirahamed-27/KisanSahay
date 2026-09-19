import { create } from 'zustand';
import { Storage } from '../services/storage';
import i18n from '../i18n';

interface SettingsState {
  currentLang: string;
  themeMode: 'dark' | 'light';
  fontScale: 'small' | 'medium' | 'large';
  notificationsEnabled: boolean;
  setLanguage: (lang: string) => Promise<void>;
  setThemeMode: (mode: 'dark' | 'light') => Promise<void>;
  setFontScale: (scale: 'small' | 'medium' | 'large') => Promise<void>;
  toggleNotifications: () => Promise<void>;
  loadSettings: () => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  currentLang: 'hi',
  themeMode: 'dark',
  fontScale: 'medium',
  notificationsEnabled: true,

  async setLanguage(lang: string) {
    await i18n.changeLanguage(lang);
    await Storage.set('kisansahay_lang', lang);
    set({ currentLang: lang });
  },

  async setThemeMode(mode: 'dark' | 'light') {
    await Storage.set('kisansahay_theme', mode);
    set({ themeMode: mode });
  },

  async setFontScale(scale: 'small' | 'medium' | 'large') {
    await Storage.set('kisansahay_font_scale', scale);
    set({ fontScale: scale });
  },

  async toggleNotifications() {
    const next = !get().notificationsEnabled;
    await Storage.set('kisansahay_notifs_enabled', next);
    set({ notificationsEnabled: next });
  },

  async loadSettings() {
    const lang = await Storage.get<string>('kisansahay_lang', 'hi');
    const theme = await Storage.get<'dark' | 'light'>('kisansahay_theme', 'dark');
    const scale = await Storage.get<'small' | 'medium' | 'large'>('kisansahay_font_scale', 'medium');
    const notifs = await Storage.get<boolean>('kisansahay_notifs_enabled', true);

    await i18n.changeLanguage(lang);
    set({
      currentLang: lang,
      themeMode: theme,
      fontScale: scale,
      notificationsEnabled: notifs,
    });
  },
}));
