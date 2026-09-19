import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';
import { useSoilData } from '../hooks/useSoilData';
import { useProfileStore } from '../store/profileStore';

export const SoilScreen: React.FC = () => {
  const { profile } = useProfileStore();
  const { soilProfile, isLoading, refreshSoil } = useSoilData();

  const getLevelColor = (level: string) => {
    const l = (level || '').toLowerCase();
    if (l === 'high' || l === 'rich') return Colors.success;
    if (l === 'medium' || l === 'moderate') return Colors.gold;
    return Colors.danger;
  };

  return (
    <View style={styles.container}>
      {/* Top Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Soil Fertility & Health</Text>
          <Text style={styles.subtitle}>
            District-level soil nutrients & fertilizer guidance for {profile.district}, {profile.state}
          </Text>
        </View>
        <TouchableOpacity onPress={refreshSoil} style={styles.refreshBtn}>
          <MaterialCommunityIcons name="refresh" size={22} color={Colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Soil Health Overview Card */}
        <View style={styles.overviewCard}>
          <View style={styles.cardHeader}>
            <MaterialCommunityIcons name="earth" size={24} color={Colors.primaryLight} />
            <Text style={styles.cardHeaderTitle}>Regional Soil Composition</Text>
          </View>
          <Text style={styles.soilTypeDesc}>
            Alluvial / Loamy soil characteristic of {profile.district} basin. Suitable for intensive rabi and kharif rotation.
          </Text>
          <View style={styles.phBadge}>
            <Text style={styles.phLabel}>Soil pH Value:</Text>
            <Text style={styles.phValue}>{soilProfile?.pH || 7.2} (Neutral/Optimal)</Text>
          </View>
        </View>

        {/* NPK Macronutrient Cards */}
        <Text style={styles.sectionHeading}>Primary Macronutrients (NPK)</Text>
        <View style={styles.npkGrid}>
          {/* Nitrogen */}
          <View style={styles.npkCard}>
            <Text style={styles.npkLetter}>N</Text>
            <Text style={styles.npkName}>Nitrogen</Text>
            <Text style={[styles.npkStatus, { color: getLevelColor(soilProfile?.nitrogen) }]}>
              {soilProfile?.nitrogen || 'Medium'}
            </Text>
          </View>

          {/* Phosphorus */}
          <View style={styles.npkCard}>
            <Text style={styles.npkLetter}>P</Text>
            <Text style={styles.npkName}>Phosphorus</Text>
            <Text style={[styles.npkStatus, { color: getLevelColor(soilProfile?.phosphorus) }]}>
              {soilProfile?.phosphorus || 'Low'}
            </Text>
          </View>

          {/* Potassium */}
          <View style={styles.npkCard}>
            <Text style={styles.npkLetter}>K</Text>
            <Text style={styles.npkName}>Potassium</Text>
            <Text style={[styles.npkStatus, { color: getLevelColor(soilProfile?.potassium) }]}>
              {soilProfile?.potassium || 'High'}
            </Text>
          </View>
        </View>

        {/* Fertilizer & Soil Health Recommendations */}
        <View style={styles.adviceCard}>
          <View style={styles.adviceHeader}>
            <MaterialCommunityIcons name="sprout-outline" size={20} color={Colors.primaryLight} />
            <Text style={styles.adviceTitle}>Fertilizer & Soil Advice</Text>
          </View>
          <Text style={styles.adviceBody}>
            {soilProfile?.fertilizerAdvice ||
              'Apply 120 kg Nitrogen and 60 kg Phosphorus per hectare. Add 5 tonnes of farmyard manure (FYM) or vermicompost prior to sowing to enhance organic carbon absorption.'}
          </Text>
        </View>

        {/* Suitable Crops */}
        <View style={styles.cropCard}>
          <Text style={styles.cropTitle}>Top Recommended Crops for this Soil</Text>
          <View style={styles.cropChipsRow}>
            {((soilProfile?.recommendedCrops as string[]) || ['Wheat', 'Paddy', 'Mustard', 'Sugarcane', 'Gram']).map(
              (crop, idx) => (
                <View key={idx} style={styles.cropChip}>
                  <Text style={styles.cropChipText}>🌾 {crop}</Text>
                </View>
              )
            )}
          </View>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
    maxWidth: '90%',
  },
  refreshBtn: {
    padding: 6,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  overviewCard: {
    backgroundColor: Colors.surface,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  cardHeaderTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text,
  },
  soilTypeDesc: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
    marginBottom: 12,
  },
  phBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceLight,
    padding: 10,
    borderRadius: 8,
    gap: 8,
  },
  phLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  phValue: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.primaryLight,
  },
  sectionHeading: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 10,
  },
  npkGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  npkCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  npkLetter: {
    fontSize: 24,
    fontWeight: '900',
    color: Colors.primaryLight,
  },
  npkName: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  npkStatus: {
    fontSize: 13,
    fontWeight: '800',
    marginTop: 6,
  },
  adviceCard: {
    backgroundColor: 'rgba(22, 163, 74, 0.12)',
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(22, 163, 74, 0.25)',
    marginBottom: 16,
  },
  adviceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  adviceTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.primaryLight,
  },
  adviceBody: {
    fontSize: 13,
    color: Colors.text,
    lineHeight: 20,
  },
  cropCard: {
    backgroundColor: Colors.surface,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cropTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 10,
  },
  cropChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  cropChip: {
    backgroundColor: Colors.surfaceLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cropChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.text,
  },
});
