import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';
import { LoanSummary } from '../store/loanStore';
import { formatCurrency } from '../utils/formatCurrency';

interface SummaryStatsProps {
  summary: LoanSummary;
}

export const SummaryStats: React.FC<SummaryStatsProps> = ({ summary }) => {
  return (
    <View style={styles.container}>
      <View style={styles.row}>
        {/* Total Borrowed */}
        <View style={[styles.statBox, { borderLeftColor: Colors.blue }]}>
          <View style={styles.iconTitleRow}>
            <MaterialCommunityIcons name="bank-transfer-in" size={18} color={Colors.blue} />
            <Text style={styles.statLabel}>Borrowed</Text>
          </View>
          <Text style={styles.statValue}>{formatCurrency(summary.totalBorrowed)}</Text>
          <Text style={styles.statSubText}>{summary.allCount} total loans</Text>
        </View>

        {/* Total Paid */}
        <View style={[styles.statBox, { borderLeftColor: Colors.success }]}>
          <View style={styles.iconTitleRow}>
            <MaterialCommunityIcons name="check-decagram" size={18} color={Colors.success} />
            <Text style={styles.statLabel}>Total Paid</Text>
          </View>
          <Text style={[styles.statValue, { color: Colors.success }]}>{formatCurrency(summary.totalPaid)}</Text>
          <Text style={styles.statSubText}>{summary.endedCount} completed</Text>
        </View>
      </View>

      <View style={styles.row}>
        {/* Total Due */}
        <View style={[styles.statBox, { borderLeftColor: Colors.danger }]}>
          <View style={styles.iconTitleRow}>
            <MaterialCommunityIcons name="alert-circle-outline" size={18} color={Colors.danger} />
            <Text style={styles.statLabel}>Remaining Due</Text>
          </View>
          <Text style={[styles.statValue, { color: Colors.danger }]}>{formatCurrency(summary.totalDue)}</Text>
          <Text style={styles.statSubText}>{summary.activeCount} active loans</Text>
        </View>

        {/* Monthly EMI */}
        <View style={[styles.statBox, { borderLeftColor: Colors.gold }]}>
          <View style={styles.iconTitleRow}>
            <MaterialCommunityIcons name="calendar-clock" size={18} color={Colors.gold} />
            <Text style={styles.statLabel}>Monthly EMI</Text>
          </View>
          <Text style={[styles.statValue, { color: Colors.gold }]}>{formatCurrency(summary.totalMonthlyEmi)}</Text>
          <Text style={styles.statSubText}>Due this month</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  statBox: {
    flex: 1,
    backgroundColor: Colors.surface,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    borderLeftWidth: 4,
  },
  iconTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  statValue: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.text,
    marginVertical: 2,
  },
  statSubText: {
    fontSize: 10,
    color: Colors.textMuted,
  },
});
