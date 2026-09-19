import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/types';
import { Colors } from '../theme/colors';
import { useSettingsStore } from '../store/settingsStore';

type OnboardProp = StackNavigationProp<RootStackParamList>;

export const OnboardingScreen: React.FC = () => {
  const navigation = useNavigation<OnboardProp>();
  const { setLanguage } = useSettingsStore();
  const [selectedLang, setSelectedLang] = useState('hi');

  const handleFinish = async () => {
    await setLanguage(selectedLang);
    navigation.replace('MainTabs');
  };

  return (
    <View style={styles.container}>
      <View style={styles.heroBox}>
        <View style={styles.iconCircle}>
          <MaterialCommunityIcons name="sprout" size={48} color={Colors.primary} />
        </View>
        <Text style={styles.appName}>KisanSahay 🌾</Text>
        <Text style={styles.tagline}>किसान की अपनी वित्तीय और सरकारी योजना साथी</Text>
      </View>

      {/* Feature Highlights */}
      <View style={styles.features}>
        <View style={styles.featureRow}>
          <MaterialCommunityIcons name="shield-check" size={22} color={Colors.primaryLight} />
          <Text style={styles.featureText}>500+ Verified Government Agricultural Schemes</Text>
        </View>
        <View style={styles.featureRow}>
          <MaterialCommunityIcons name="currency-inr" size={22} color={Colors.gold} />
          <Text style={styles.featureText}>Low-Interest Crop Loans, KCC & EMI Tracker</Text>
        </View>
        <View style={styles.featureRow}>
          <MaterialCommunityIcons name="microphone" size={22} color={Colors.blue} />
          <Text style={styles.featureText}>Voice Search & AI Assistant in 15 Indian Languages</Text>
        </View>
        <View style={styles.featureRow}>
          <MaterialCommunityIcons name="wifi-off" size={22} color={Colors.success} />
          <Text style={styles.featureText}>100% Offline Access Without Internet</Text>
        </View>
      </View>

      {/* Language Quick Selection */}
      <Text style={styles.langHeading}>Choose Your Preferred Language</Text>
      <View style={styles.langGrid}>
        {[
          { code: 'hi', label: 'हिन्दी' },
          { code: 'en', label: 'English' },
          { code: 'mr', label: 'मराठी' },
          { code: 'pa', label: 'ਪੰਜਾਬੀ' },
          { code: 'te', label: 'తెలుగు' },
          { code: 'ta', label: 'தமிழ்' },
        ].map((item) => (
          <TouchableOpacity
            key={item.code}
            style={[styles.langChip, selectedLang === item.code && styles.langChipActive]}
            onPress={() => setSelectedLang(item.code)}
          >
            <Text style={[styles.langChipText, selectedLang === item.code && styles.langChipTextActive]}>
              {item.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Get Started Button */}
      <TouchableOpacity style={styles.startButton} onPress={handleFinish}>
        <Text style={styles.startButtonText}>Get Started / आगे बढ़ें</Text>
        <MaterialCommunityIcons name="arrow-right" size={20} color="#ffffff" style={{ marginLeft: 6 }} />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    padding: 24,
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingBottom: 40,
  },
  heroBox: {
    alignItems: 'center',
  },
  iconCircle: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: 'rgba(22, 163, 74, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  appName: {
    fontSize: 28,
    fontWeight: '900',
    color: Colors.text,
  },
  tagline: {
    fontSize: 14,
    color: Colors.primaryLight,
    marginTop: 6,
    textAlign: 'center',
  },
  features: {
    backgroundColor: Colors.surface,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 14,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  featureText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text,
    flex: 1,
  },
  langHeading: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  langGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
  },
  langChip: {
    backgroundColor: Colors.surface,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  langChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  langChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text,
  },
  langChipTextActive: {
    color: '#ffffff',
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    borderRadius: 14,
  },
  startButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
  },
});
