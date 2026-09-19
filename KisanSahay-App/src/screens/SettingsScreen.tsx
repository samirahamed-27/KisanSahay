import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Switch, Linking, Alert } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/types';
import { Colors } from '../theme/colors';
import { useSettingsStore } from '../store/settingsStore';
import { Storage } from '../services/storage';

type SettingsScreenProp = StackNavigationProp<RootStackParamList>;

export const SettingsScreen: React.FC = () => {
  const navigation = useNavigation<SettingsScreenProp>();
  const { currentLang, themeMode, fontScale, notificationsEnabled, setThemeMode, setFontScale, toggleNotifications } =
    useSettingsStore();

  const handleClearCache = async () => {
    Alert.alert('Clear Cache', 'Do you want to clear temporary offline cached data? (Your saved profile and vault remain safe)', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear',
        onPress: async () => {
          await Storage.remove('kisansahay_bookmarks');
          Alert.alert('Cleared', 'Temporary cache successfully cleared.');
        },
      },
    ]);
  };

  const openPrivacy = () => {
    Linking.openURL('https://kisansahay.vercel.app/privacy');
  };

  return (
    <View style={styles.container}>
      {/* Top Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Settings & Preferences</Text>
        <Text style={styles.subtitle}>Customize accessibility, language, and theme</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Language Section */}
        <Text style={styles.sectionTitle}>Regional Language</Text>
        <TouchableOpacity
          style={styles.settingRow}
          onPress={() => navigation.navigate('LanguageSelect')}
        >
          <View style={styles.settingLeft}>
            <MaterialCommunityIcons name="translate" size={22} color={Colors.primaryLight} />
            <View>
              <Text style={styles.settingLabel}>App Language / भाषा</Text>
              <Text style={styles.settingSubLabel}>Currently: {currentLang.toUpperCase()} (15 Indian Languages)</Text>
            </View>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={22} color={Colors.textMuted} />
        </TouchableOpacity>

        {/* Display & Accessibility */}
        <Text style={styles.sectionTitle}>Display & Accessibility</Text>

        <View style={styles.settingRow}>
          <View style={styles.settingLeft}>
            <MaterialCommunityIcons name="theme-light-dark" size={22} color={Colors.blue} />
            <View>
              <Text style={styles.settingLabel}>Dark Theme</Text>
              <Text style={styles.settingSubLabel}>Optimized for outdoor sunlight contrast</Text>
            </View>
          </View>
          <Switch
            value={themeMode === 'dark'}
            onValueChange={(val) => setThemeMode(val ? 'dark' : 'light')}
            trackColor={{ false: Colors.surfaceLight, true: Colors.primary }}
            thumbColor="#ffffff"
          />
        </View>

        <View style={styles.settingRow}>
          <View style={styles.settingLeft}>
            <MaterialCommunityIcons name="format-size" size={22} color={Colors.gold} />
            <View>
              <Text style={styles.settingLabel}>Font Size Scale</Text>
              <Text style={styles.settingSubLabel}>Current: {fontScale.toUpperCase()}</Text>
            </View>
          </View>
          <View style={styles.fontButtons}>
            {(['small', 'medium', 'large'] as const).map((s) => (
              <TouchableOpacity
                key={s}
                style={[styles.fontBtn, fontScale === s && styles.fontBtnActive]}
                onPress={() => setFontScale(s)}
              >
                <Text style={[styles.fontBtnText, fontScale === s && styles.fontBtnTextActive]}>
                  {s.charAt(0).toUpperCase()}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Notifications */}
        <Text style={styles.sectionTitle}>Alerts & Notifications</Text>
        <View style={styles.settingRow}>
          <View style={styles.settingLeft}>
            <MaterialCommunityIcons name="bell-ring-outline" size={22} color={Colors.primary} />
            <View>
              <Text style={styles.settingLabel}>EMI & Scheme Alerts</Text>
              <Text style={styles.settingSubLabel}>Receive 3-day reminder prior to loan due dates</Text>
            </View>
          </View>
          <Switch
            value={notificationsEnabled}
            onValueChange={toggleNotifications}
            trackColor={{ false: Colors.surfaceLight, true: Colors.primary }}
            thumbColor="#ffffff"
          />
        </View>

        {/* Account & Multiuser */}
        <Text style={styles.sectionTitle}>Farmer Profiles</Text>
        <TouchableOpacity
          style={styles.settingRow}
          onPress={() => navigation.navigate('SwitchProfile')}
        >
          <View style={styles.settingLeft}>
            <MaterialCommunityIcons name="account-multiple-outline" size={22} color={Colors.primaryLight} />
            <View>
              <Text style={styles.settingLabel}>Manage Family Profiles</Text>
              <Text style={styles.settingSubLabel}>Switch between multiple farmer accounts on one device</Text>
            </View>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={22} color={Colors.textMuted} />
        </TouchableOpacity>

        {/* Storage & Privacy */}
        <Text style={styles.sectionTitle}>Data & Privacy</Text>
        <TouchableOpacity style={styles.settingRow} onPress={handleClearCache}>
          <View style={styles.settingLeft}>
            <MaterialCommunityIcons name="broom" size={22} color={Colors.danger} />
            <View>
              <Text style={styles.settingLabel}>Clear Offline Cache</Text>
              <Text style={styles.settingSubLabel}>Clears temporary files without deleting loans/vault</Text>
            </View>
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={styles.settingRow} onPress={openPrivacy}>
          <View style={styles.settingLeft}>
            <MaterialCommunityIcons name="shield-account-outline" size={22} color={Colors.textSecondary} />
            <View>
              <Text style={styles.settingLabel}>Privacy Policy & Data Safety</Text>
              <Text style={styles.settingSubLabel}>Your farm data is encrypted and stored on-device</Text>
            </View>
          </View>
          <MaterialCommunityIcons name="open-in-new" size={18} color={Colors.textMuted} />
        </TouchableOpacity>

        {/* About App */}
        <View style={styles.aboutCard}>
          <Text style={styles.aboutTitle}>KisanSahay Mobile v1.0.0</Text>
          <Text style={styles.aboutSub}>Accessible Agricultural Finance & Scheme Portal for Indian Farmers</Text>
          <Text style={styles.aboutCopy}>Built for rural empowerment with 100% offline capability.</Text>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 48,
    paddingBottom: 12,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.text,
  },
  subtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 50,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.primaryLight,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 18,
    marginBottom: 8,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 8,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  settingLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  settingSubLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  fontButtons: {
    flexDirection: 'row',
    gap: 6,
  },
  fontBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fontBtnActive: {
    backgroundColor: Colors.primary,
  },
  fontBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  fontBtnTextActive: {
    color: '#ffffff',
  },
  aboutCard: {
    backgroundColor: Colors.surface,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    marginTop: 24,
    alignItems: 'center',
  },
  aboutTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text,
  },
  aboutSub: {
    fontSize: 12,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
  },
  aboutCopy: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 6,
  },
});
