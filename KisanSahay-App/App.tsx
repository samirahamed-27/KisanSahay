import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import './src/i18n'; // Initialize 15 Indian languages
import { RootNavigator } from './src/navigation/RootNavigator';
import { DarkTheme, LightTheme } from './src/theme/theme';
import { Colors } from './src/theme/colors';
import { Database } from './src/services/database';
import { useSettingsStore } from './src/store/settingsStore';
import { useProfileStore } from './src/store/profileStore';
import { useAuthStore } from './src/store/authStore';
import { useLoanStore } from './src/store/loanStore';
import { useSchemeStore } from './src/store/schemeStore';

export default function App() {
  const [isReady, setIsReady] = useState(false);
  const { themeMode, loadSettings } = useSettingsStore();
  const { loadProfile } = useProfileStore();
  const { loadAccounts } = useAuthStore();
  const { loadLoans } = useLoanStore();
  const { loadSchemes } = useSchemeStore();

  useEffect(() => {
    async function prepare() {
      try {
        await Database.init();
        await Promise.all([
          loadSettings(),
          loadProfile(),
          loadAccounts(),
          loadLoans(),
          loadSchemes(),
        ]);
      } catch (e) {
        console.warn('[App] Preparation error:', e);
      } finally {
        setIsReady(true);
      }
    }
    prepare();
  }, []);

  if (!isReady) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  const activeTheme = themeMode === 'light' ? LightTheme : DarkTheme;

  return (
    <SafeAreaProvider>
      <PaperProvider theme={activeTheme as any}>
        <NavigationContainer>
          <StatusBar style={themeMode === 'light' ? 'dark' : 'light'} />
          <RootNavigator />
        </NavigationContainer>
      </PaperProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
