import React, { useState } from 'react';
import { View, Text, TextInput, ScrollView, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { RouteProp, useRoute, useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { RootStackParamList } from '../navigation/types';
import { Colors } from '../theme/colors';
import { useLoanStore } from '../store/loanStore';
import { calculateLoanFinancials } from '../utils/emiCalculator';
import { formatCurrency } from '../utils/formatCurrency';

type AddLoanRouteProp = RouteProp<RootStackParamList, 'AddLoan'>;

export const AddLoanScreen: React.FC = () => {
  const route = useRoute<AddLoanRouteProp>();
  const navigation = useNavigation();
  const existingLoan = route.params?.loan;

  const { addLoan, deleteLoan } = useLoanStore();

  const [schemeName, setSchemeName] = useState(existingLoan?.schemeName || '');
  const [bankName, setBankName] = useState(existingLoan?.bankName || '');
  const [principal, setPrincipal] = useState(existingLoan?.principalAmount?.toString() || '100000');
  const [rate, setRate] = useState(existingLoan?.interestRate?.toString() || '7');
  const [tenure, setTenure] = useState(existingLoan?.tenureMonths?.toString() || '36');
  const [paid, setPaid] = useState(existingLoan?.paidAmount?.toString() || '0');
  const [nextEmiDate, setNextEmiDate] = useState(existingLoan?.nextEmiDate || '2026-10-15');

  const calc = calculateLoanFinancials(
    Number(principal) || 0,
    Number(rate) || 0,
    Number(tenure) || 12,
    Number(paid) || 0
  );

  const handleSave = async () => {
    if (!schemeName.trim()) {
      Alert.alert('Missing Field', 'Please enter a loan / scheme title.');
      return;
    }
    const p = Number(principal);
    if (!p || p <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid principal loan amount.');
      return;
    }

    await addLoan({
      schemeName: schemeName.trim(),
      bankName: bankName.trim() || 'Cooperative Bank',
      principalAmount: p,
      interestRate: Number(rate) || 0,
      tenureMonths: Number(tenure) || 12,
      paidAmount: Number(paid) || 0,
      nextEmiDate: nextEmiDate.trim() || undefined,
      status: calc.dueAmount <= 0 ? 'ended' : 'active',
    });

    Alert.alert('Saved', 'Loan record saved successfully!');
    navigation.goBack();
  };

  const handleDelete = () => {
    if (existingLoan) {
      Alert.alert('Delete Loan', 'Are you sure you want to delete this loan record?', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteLoan(existingLoan.id);
            navigation.goBack();
          },
        },
      ]);
    }
  };

  return (
    <View style={styles.container}>
      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{existingLoan ? 'Edit Loan Record' : 'Add New Loan'}</Text>
        {existingLoan ? (
          <TouchableOpacity onPress={handleDelete} style={styles.deleteButton}>
            <MaterialCommunityIcons name="trash-can-outline" size={22} color={Colors.danger} />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 24 }} />
        )}
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Scheme / Loan Name */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Scheme or Loan Title *</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Kisan Credit Card (KCC)"
            placeholderTextColor={Colors.textMuted}
            value={schemeName}
            onChangeText={setSchemeName}
          />
        </View>

        {/* Bank / Lending Agency */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Bank / Lending Institution</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. State Bank of India, Baroda UP Bank"
            placeholderTextColor={Colors.textMuted}
            value={bankName}
            onChangeText={setBankName}
          />
        </View>

        {/* Loan Amount */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Principal Loan Amount (₹) *</Text>
          <TextInput
            style={styles.input}
            keyboardType="numeric"
            placeholder="e.g. 150000"
            placeholderTextColor={Colors.textMuted}
            value={principal}
            onChangeText={setPrincipal}
          />
        </View>

        {/* Rate & Tenure */}
        <View style={styles.row}>
          <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
            <Text style={styles.label}>Interest Rate (%)</Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              placeholder="e.g. 4"
              placeholderTextColor={Colors.textMuted}
              value={rate}
              onChangeText={setRate}
            />
          </View>
          <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
            <Text style={styles.label}>Tenure (Months)</Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              placeholder="e.g. 36"
              placeholderTextColor={Colors.textMuted}
              value={tenure}
              onChangeText={setTenure}
            />
          </View>
        </View>

        {/* Already Paid & Next EMI */}
        <View style={styles.row}>
          <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
            <Text style={styles.label}>Already Paid (₹)</Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              placeholder="e.g. 30000"
              placeholderTextColor={Colors.textMuted}
              value={paid}
              onChangeText={setPaid}
            />
          </View>
          <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
            <Text style={styles.label}>Next EMI Date</Text>
            <TextInput
              style={styles.input}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={Colors.textMuted}
              value={nextEmiDate}
              onChangeText={setNextEmiDate}
            />
          </View>
        </View>

        {/* Calculation Preview */}
        <View style={styles.previewCard}>
          <Text style={styles.previewTitle}>Live Repayment Calculation</Text>
          <View style={styles.previewRow}>
            <Text style={styles.previewLabel}>Monthly EMI:</Text>
            <Text style={styles.previewEmi}>{formatCurrency(calc.monthlyEmi)}</Text>
          </View>
          <View style={styles.previewRow}>
            <Text style={styles.previewLabel}>Total with Interest:</Text>
            <Text style={styles.previewValue}>{formatCurrency(calc.totalWithInterest)}</Text>
          </View>
          <View style={styles.previewRow}>
            <Text style={styles.previewLabel}>Remaining Balance:</Text>
            <Text style={[styles.previewValue, { color: Colors.danger }]}>{formatCurrency(calc.dueAmount)}</Text>
          </View>
          <View style={styles.previewRow}>
            <Text style={styles.previewLabel}>EMIs Remaining:</Text>
            <Text style={styles.previewValue}>{calc.emisLeft} installments</Text>
          </View>
        </View>

        {/* Submit */}
        <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
          <Text style={styles.saveButtonText}>Save Loan Plan</Text>
        </TouchableOpacity>
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
  backButton: {
    padding: 4,
  },
  deleteButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  inputGroup: {
    marginBottom: 14,
  },
  row: {
    flexDirection: 'row',
  },
  label: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 6,
    fontWeight: '500',
  },
  input: {
    backgroundColor: Colors.surface,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  previewCard: {
    backgroundColor: Colors.surface,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    marginVertical: 14,
  },
  previewTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.primaryLight,
    marginBottom: 10,
  },
  previewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  previewLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  previewValue: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text,
  },
  previewEmi: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.gold,
  },
  saveButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
});
