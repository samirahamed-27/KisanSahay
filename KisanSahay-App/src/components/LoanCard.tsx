import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';
import { LocalLoanRecord } from '../services/database';
import { calculateLoanFinancials } from '../utils/emiCalculator';
import { formatCurrency } from '../utils/formatCurrency';

interface LoanCardProps {
  loan: LocalLoanRecord;
  onPress: () => void;
  onRecordPayment?: () => void;
}

export const LoanCard: React.FC<LoanCardProps> = ({ loan, onPress, onRecordPayment }) => {
  const calc = calculateLoanFinancials(loan.principalAmount, loan.interestRate, loan.tenureMonths, loan.paidAmount);
  const isEnded = loan.status === 'ended' || calc.dueAmount <= 0;

  return (
    <TouchableOpacity activeOpacity={0.85} style={styles.card} onPress={onPress}>
      <View style={styles.header}>
        <View style={styles.titleArea}>
          <Text style={styles.schemeName} numberOfLines={1}>
            {loan.schemeName}
          </Text>
          {loan.bankName && <Text style={styles.bankName}>{loan.bankName}</Text>}
        </View>

        <View style={[styles.statusBadge, isEnded ? styles.statusEnded : styles.statusActive]}>
          <Text style={[styles.statusText, isEnded ? styles.textEnded : styles.textActive]}>
            {isEnded ? 'COMPLETED' : 'ACTIVE'}
          </Text>
        </View>
      </View>

      {/* Financial Numbers Grid */}
      <View style={styles.grid}>
        <View style={styles.gridItem}>
          <Text style={styles.gridLabel}>Principal</Text>
          <Text style={styles.gridValue}>{formatCurrency(calc.principal)}</Text>
        </View>
        <View style={styles.gridItem}>
          <Text style={styles.gridLabel}>Monthly EMI</Text>
          <Text style={[styles.gridValue, { color: Colors.gold }]}>{formatCurrency(calc.monthlyEmi)}</Text>
        </View>
        <View style={styles.gridItem}>
          <Text style={styles.gridLabel}>Due Balance</Text>
          <Text style={[styles.gridValue, { color: isEnded ? Colors.success : Colors.danger }]}>
            {formatCurrency(calc.dueAmount)}
          </Text>
        </View>
      </View>

      {/* Progress Bar */}
      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${calc.percentPaid}%` }]} />
        </View>
        <View style={styles.progressLabels}>
          <Text style={styles.progressSubText}>
            Paid: {formatCurrency(loan.paidAmount)} ({calc.percentPaid}%)
          </Text>
          {!isEnded && loan.nextEmiDate && (
            <Text style={styles.dueAlert}>Next EMI: {loan.nextEmiDate}</Text>
          )}
        </View>
      </View>

      {/* Action footer */}
      {!isEnded && onRecordPayment && (
        <TouchableOpacity style={styles.paymentButton} onPress={onRecordPayment}>
          <MaterialCommunityIcons name="cash-plus" size={16} color="#ffffff" style={{ marginRight: 6 }} />
          <Text style={styles.paymentButtonText}>Record Payment</Text>
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  titleArea: {
    flex: 1,
    marginRight: 8,
  },
  schemeName: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
  },
  bankName: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusActive: {
    backgroundColor: 'rgba(22, 163, 74, 0.15)',
  },
  statusEnded: {
    backgroundColor: 'rgba(107, 114, 128, 0.2)',
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  textActive: {
    color: Colors.primaryLight,
  },
  textEnded: {
    color: Colors.textSecondary,
  },
  grid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: Colors.surfaceLight,
    padding: 10,
    borderRadius: 10,
    marginBottom: 12,
  },
  gridItem: {
    alignItems: 'center',
    flex: 1,
  },
  gridLabel: {
    fontSize: 11,
    color: Colors.textMuted,
    marginBottom: 2,
  },
  gridValue: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text,
  },
  progressContainer: {
    marginBottom: 12,
  },
  progressBar: {
    height: 6,
    backgroundColor: Colors.surfaceLight,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 6,
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 3,
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressSubText: {
    fontSize: 11,
    color: Colors.textSecondary,
  },
  dueAlert: {
    fontSize: 11,
    color: Colors.gold,
    fontWeight: '600',
  },
  paymentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 2,
  },
  paymentButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
  },
});
