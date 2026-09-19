import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../theme/colors';

interface DebtSafetyMeterProps {
  status: 'safe' | 'moderate' | 'high_risk';
  ratio: number;
  label: string;
}

export const DebtSafetyMeter: React.FC<DebtSafetyMeterProps> = ({ status, ratio, label }) => {
  const getFillColor = () => {
    if (status === 'safe') return Colors.success;
    if (status === 'moderate') return Colors.warning;
    return Colors.danger;
  };

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Farmer Debt Safety Meter</Text>
        <View style={[styles.badge, { backgroundColor: getFillColor() + '25' }]}>
          <Text style={[styles.badgeText, { color: getFillColor() }]}>{label}</Text>
        </View>
      </View>

      <Text style={styles.description}>
        Monthly EMIs consume approx {ratio}% of estimated agricultural income.
      </Text>

      <View style={styles.track}>
        <View style={[styles.fill, { width: `${Math.min(100, ratio)}%`, backgroundColor: getFillColor() }]} />
      </View>

      <View style={styles.scaleLabels}>
        <Text style={styles.scaleText}>0% (Safe)</Text>
        <Text style={styles.scaleText}>35% (Warning)</Text>
        <Text style={styles.scaleText}>60%+ (Critical)</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  description: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 10,
  },
  track: {
    height: 8,
    backgroundColor: Colors.surfaceLight,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 6,
  },
  fill: {
    height: '100%',
    borderRadius: 4,
  },
  scaleLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  scaleText: {
    fontSize: 10,
    color: Colors.textMuted,
  },
});
