import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, RefreshControl } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/types';
import { Colors } from '../theme/colors';
import { useLoanStore } from '../store/loanStore';
import { useProfileStore } from '../store/profileStore';
import { useSchemes } from '../hooks/useSchemes';
import { SummaryStats } from '../components/SummaryStats';
import { SchemeCard } from '../components/SchemeCard';
import { NotificationBell } from '../components/NotificationBell';
import { VoiceButton } from '../components/VoiceButton';
import { useVoiceInput } from '../hooks/useVoiceInput';
import { DebtSafetyMeter } from '../components/DebtSafetyMeter';

type HomeScreenProp = StackNavigationProp<RootStackParamList>;

export const HomeScreen: React.FC = () => {
  const navigation = useNavigation<HomeScreenProp>();
  const { summary, debtSafety, loadLoans } = useLoanStore();
  const { profile, loadProfile } = useProfileStore();
  const { recommendedSchemes, bookmarkedIds, toggleBookmark, refreshSchemes } = useSchemes();
  const [refreshing, setRefreshing] = useState(false);

  const { isListening, startListening, stopListening } = useVoiceInput((text) => {
    navigation.navigate('MainTabs');
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadLoans(), loadProfile(), refreshSchemes()]);
    setRefreshing(false);
  };

  return (
    <View style={styles.container}>
      {/* Top Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.greeting}>नमस्ते / Welcome,</Text>
          <Text style={styles.farmerName}>{profile.name} 🌾</Text>
          <Text style={styles.farmerLocation}>
            {profile.district}, {profile.state} • {profile.landArea} {profile.landUnit}s
          </Text>
        </View>

        <View style={styles.headerActions}>
          <NotificationBell unreadCount={2} onPress={() => navigation.navigate('Notifications')} />
          <TouchableOpacity
            style={styles.langPill}
            onPress={() => navigation.navigate('LanguageSelect')}
          >
            <Text style={styles.langText}>भाषा / Lang</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
      >
        {/* Quick Voice Bar */}
        <View style={styles.voiceSearchBox}>
          <View style={{ flex: 1 }}>
            <Text style={styles.voicePromptTitle}>Speak in your language</Text>
            <Text style={styles.voicePromptSub}>"KCC loan interest" or "PM-KISAN status"</Text>
          </View>
          <VoiceButton
            isListening={isListening}
            onPress={isListening ? stopListening : () => startListening('hi-IN')}
            size={44}
          />
        </View>

        {/* Quick Action Buttons */}
        <View style={styles.actionGrid}>
          <TouchableOpacity
            style={[styles.actionCard, { backgroundColor: 'rgba(22, 163, 74, 0.15)', borderColor: Colors.primary }]}
            onPress={() => navigation.navigate('AIChat')}
          >
            <MaterialCommunityIcons name="robot" size={26} color={Colors.primaryLight} />
            <Text style={styles.actionCardTitle}>Sahay AI</Text>
            <Text style={styles.actionCardSub}>Chat Assistant</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionCard, { backgroundColor: 'rgba(59, 130, 246, 0.15)', borderColor: Colors.blue }]}
            onPress={() => navigation.navigate('SoilAnalysis')}
          >
            <MaterialCommunityIcons name="sprout" size={26} color={Colors.blue} />
            <Text style={styles.actionCardTitle}>Soil Health</Text>
            <Text style={styles.actionCardSub}>NPK & Fertilizer</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionCard, { backgroundColor: 'rgba(245, 158, 11, 0.15)', borderColor: Colors.gold }]}
            onPress={() => navigation.navigate('Vault')}
          >
            <MaterialCommunityIcons name="safe" size={26} color={Colors.gold} />
            <Text style={styles.actionCardTitle}>Doc Vault</Text>
            <Text style={styles.actionCardSub}>Aadhaar & KCC</Text>
          </TouchableOpacity>
        </View>

        {/* Financial Summary */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Financial & Loan Summary</Text>
          <TouchableOpacity onPress={() => navigation.navigate('AddLoan', {})}>
            <Text style={styles.addLoanLink}>+ Add Loan</Text>
          </TouchableOpacity>
        </View>
        <SummaryStats summary={summary} />

        {/* Debt Safety */}
        <DebtSafetyMeter status={debtSafety.status} ratio={debtSafety.ratio} label={debtSafety.label} />

        {/* Top Recommended Schemes for this Farmer */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Top Schemes For You</Text>
          <Text style={styles.schemeCountBadge}>{recommendedSchemes.length} matched</Text>
        </View>

        {recommendedSchemes.map((scheme) => (
          <SchemeCard
            key={scheme.id}
            scheme={scheme}
            isBookmarked={bookmarkedIds.includes(scheme.id)}
            onBookmarkToggle={() => toggleBookmark(scheme.id)}
            onPress={() => navigation.navigate('SchemeDetail', { scheme })}
          />
        ))}
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 48,
    paddingBottom: 16,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerLeft: {
    flex: 1,
  },
  greeting: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  farmerName: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.text,
    marginVertical: 2,
  },
  farmerLocation: {
    fontSize: 12,
    color: Colors.primaryLight,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  langPill: {
    backgroundColor: Colors.surfaceLight,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  langText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.text,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  voiceSearchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 16,
  },
  voicePromptTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text,
  },
  voicePromptSub: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  actionGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 18,
  },
  actionCard: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  actionCardTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.text,
    marginTop: 6,
  },
  actionCardSub: {
    fontSize: 10,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
  },
  addLoanLink: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.primary,
  },
  schemeCountBadge: {
    fontSize: 11,
    color: Colors.primaryLight,
    backgroundColor: 'rgba(22, 163, 74, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    fontWeight: '600',
  },
});
