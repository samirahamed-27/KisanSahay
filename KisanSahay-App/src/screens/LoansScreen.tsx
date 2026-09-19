import React, { useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Modal, TextInput, Alert } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/types';
import { Colors } from '../theme/colors';
import { useLoans } from '../hooks/useLoans';
import { LoanCard } from '../components/LoanCard';
import { SummaryStats } from '../components/SummaryStats';
import { DebtSafetyMeter } from '../components/DebtSafetyMeter';
import { EmiCalculator } from '../components/EmiCalculator';

type LoansScreenProp = StackNavigationProp<RootStackParamList>;

export const LoansScreen: React.FC = () => {
  const navigation = useNavigation<LoansScreenProp>();
  const {
    loans,
    allLoans,
    activeFilter,
    summary,
    debtSafety,
    updateLoanPayment,
    deleteLoan,
    setActiveFilter,
  } = useLoans();

  const [selectedLoanId, setSelectedLoanId] = useState<string | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [showCalculator, setShowCalculator] = useState(false);

  const handleOpenPayment = (loanId: string) => {
    setSelectedLoanId(loanId);
    setPaymentAmount('');
    setModalVisible(true);
  };

  const handleRecordPayment = async () => {
    const amt = Number(paymentAmount);
    if (!amt || amt <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid payment amount.');
      return;
    }
    if (selectedLoanId) {
      await updateLoanPayment(selectedLoanId, amt);
      setModalVisible(false);
      Alert.alert('Success', 'Payment recorded successfully! Balance updated.');
    }
  };

  return (
    <View style={styles.container}>
      {/* Top Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>My Loans & EMIs</Text>
          <Text style={styles.subtitle}>Track institutional bank credit, KCC, and repayments</Text>
        </View>

        <TouchableOpacity
          style={styles.addButton}
          onPress={() => navigation.navigate('AddLoan', {})}
        >
          <MaterialCommunityIcons name="plus" size={20} color="#ffffff" />
          <Text style={styles.addButtonText}>Add Loan</Text>
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeFilter === 'active' && styles.tabActive]}
          onPress={() => setActiveFilter('active')}
        >
          <Text style={[styles.tabText, activeFilter === 'active' && styles.tabTextActive]}>
            Active ({summary.activeCount})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeFilter === 'ended' && styles.tabActive]}
          onPress={() => setActiveFilter('ended')}
        >
          <Text style={[styles.tabText, activeFilter === 'ended' && styles.tabTextActive]}>
            Completed ({summary.endedCount})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeFilter === 'all' && styles.tabActive]}
          onPress={() => setActiveFilter('all')}
        >
          <Text style={[styles.tabText, activeFilter === 'all' && styles.tabTextActive]}>
            All ({allLoans.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* List with Stats in Header */}
      <FlatList
        data={loans}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <>
            <SummaryStats summary={summary} />
            <DebtSafetyMeter status={debtSafety.status} ratio={debtSafety.ratio} label={debtSafety.label} />

            <TouchableOpacity
              style={styles.calculatorToggle}
              onPress={() => setShowCalculator(!showCalculator)}
            >
              <MaterialCommunityIcons name="calculator-variant" size={20} color={Colors.primaryLight} />
              <Text style={styles.calculatorToggleText}>
                {showCalculator ? 'Hide EMI Calculator' : 'Open Loan & EMI Calculator'}
              </Text>
              <MaterialCommunityIcons
                name={showCalculator ? 'chevron-up' : 'chevron-down'}
                size={20}
                color={Colors.primaryLight}
              />
            </TouchableOpacity>

            {showCalculator && <EmiCalculator />}

            <Text style={styles.sectionTitle}>
              {activeFilter === 'active' ? 'Active Repayment Plans' : 'All Loan Records'}
            </Text>
          </>
        }
        renderItem={({ item }) => (
          <LoanCard
            loan={item}
            onPress={() => navigation.navigate('AddLoan', { loan: item })}
            onRecordPayment={() => handleOpenPayment(item.id)}
          />
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="hand-coin-outline" size={48} color={Colors.textMuted} />
            <Text style={styles.emptyTitle}>No Loans Under This Filter</Text>
            <Text style={styles.emptySub}>Tap '+ Add Loan' to record a new Kisan Credit Card or bank loan.</Text>
          </View>
        }
      />

      {/* Record Payment Modal */}
      <Modal visible={modalVisible} transparent animationType="fade" onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Record Payment Made</Text>
            <Text style={styles.modalSub}>Enter amount paid to reduce your outstanding due balance</Text>

            <TextInput
              style={styles.paymentInput}
              keyboardType="numeric"
              placeholder="₹ Amount e.g. 5000"
              placeholderTextColor={Colors.textMuted}
              value={paymentAmount}
              onChangeText={setPaymentAmount}
              autoFocus
            />

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setModalVisible(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSubmit} onPress={handleRecordPayment}>
                <Text style={styles.modalSubmitText}>Save Payment</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  addButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    paddingHorizontal: 16,
    paddingBottom: 10,
    gap: 8,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: Colors.surfaceLight,
  },
  tabActive: {
    backgroundColor: Colors.primary,
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  tabTextActive: {
    color: '#ffffff',
  },
  listContent: {
    padding: 16,
    paddingBottom: 40,
  },
  calculatorToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(22, 163, 74, 0.12)',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(22, 163, 74, 0.25)',
    marginBottom: 16,
  },
  calculatorToggleText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.primaryLight,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 12,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
    marginTop: 10,
  },
  emptySub: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 4,
    textAlign: 'center',
    maxWidth: 260,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 4,
  },
  modalSub: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 16,
  },
  paymentInput: {
    backgroundColor: Colors.surfaceLight,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.primary,
    marginBottom: 20,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  modalCancel: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 10,
    backgroundColor: Colors.surfaceLight,
  },
  modalCancelText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  modalSubmit: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 10,
    backgroundColor: Colors.primary,
  },
  modalSubmitText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
  },
});
