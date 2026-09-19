import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { Colors } from '../theme/colors';
import { calculateLoanFinancials } from '../utils/emiCalculator';
import { formatCurrency } from '../utils/formatCurrency';

export const EmiCalculator: React.FC = () => {
  const [principal, setPrincipal] = useState('100000');
  const [rate, setRate] = useState('7');
  const [tenure, setTenure] = useState('36');

  const calc = calculateLoanFinancials(Number(principal) || 0, Number(rate) || 0, Number(tenure) || 12);

  return (
    <View style={styles.card}>
      <Text style={styles.heading}>🌾 Agricultural Loan & EMI Calculator</Text>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Loan Amount (₹)</Text>
        <TextInput
          style={styles.input}
          keyboardType="numeric"
          value={principal}
          onChangeText={setPrincipal}
          placeholder="e.g. 100000"
          placeholderTextColor={Colors.textMuted}
        />
      </View>

      <View style={styles.row}>
        <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
          <Text style={styles.label}>Interest Rate (%)</Text>
          <TextInput
            style={styles.input}
            keyboardType="numeric"
            value={rate}
            onChangeText={setRate}
            placeholder="e.g. 7"
            placeholderTextColor={Colors.textMuted}
          />
        </View>

        <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
          <Text style={styles.label}>Tenure (Months)</Text>
          <TextInput
            style={styles.input}
            keyboardType="numeric"
            value={tenure}
            onChangeText={setTenure}
            placeholder="e.g. 36"
            placeholderTextColor={Colors.textMuted}
          />
        </View>
      </View>

      {/* Results */}
      <View style={styles.resultBox}>
        <View style={styles.resultRow}>
          <Text style={styles.resultLabel}>Estimated Monthly EMI</Text>
          <Text style={styles.resultEmi}>{formatCurrency(calc.monthlyEmi)}</Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.subResultRow}>
          <View>
            <Text style={styles.subResultLabel}>Total Interest</Text>
            <Text style={styles.subResultValue}>{formatCurrency(calc.totalInterest)}</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.subResultLabel}>Total Payable</Text>
            <Text style={styles.subResultValue}>{formatCurrency(calc.totalWithInterest)}</Text>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    marginVertical: 12,
  },
  heading: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 14,
  },
  inputGroup: {
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
  },
  label: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 6,
  },
  input: {
    backgroundColor: Colors.surfaceLight,
    color: Colors.text,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    fontSize: 14,
  },
  resultBox: {
    backgroundColor: 'rgba(22, 163, 74, 0.12)',
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(22, 163, 74, 0.25)',
    marginTop: 6,
  },
  resultRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  resultLabel: {
    fontSize: 13,
    color: Colors.text,
    fontWeight: '600',
  },
  resultEmi: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.primaryLight,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(22, 163, 74, 0.2)',
    marginVertical: 10,
  },
  subResultRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  subResultLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
  },
  subResultValue: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text,
    marginTop: 2,
  },
});
