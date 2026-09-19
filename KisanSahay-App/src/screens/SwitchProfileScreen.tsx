import React, { useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Modal, TextInput, Alert } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { Colors } from '../theme/colors';
import { useAuthStore, UserAccount } from '../store/authStore';

export const SwitchProfileScreen: React.FC = () => {
  const navigation = useNavigation();
  const { profiles, activeProfileId, switchAccount, createAccount, deleteAccount } = useAuthStore();

  const [modalVisible, setModalVisible] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');

  const handleSwitch = async (id: string) => {
    await switchAccount(id);
    Alert.alert('Profile Switched', 'Switched active farmer profile successfully.');
    navigation.goBack();
  };

  const handleSendOtp = () => {
    if (!name.trim() || phone.length < 10) {
      Alert.alert('Invalid Input', 'Please enter farmer name and a valid 10-digit mobile number.');
      return;
    }
    setOtpSent(true);
    Alert.alert('OTP Sent', 'A verification OTP has been sent via SMS (Demo OTP: 123456)');
  };

  const handleVerifyAndAdd = async () => {
    if (otpCode !== '123456' && otpCode.length < 4) {
      Alert.alert('Invalid OTP', 'Please enter the 6-digit OTP code.');
      return;
    }
    await createAccount(name.trim(), phone.trim());
    setModalVisible(false);
    setOtpSent(false);
    setName('');
    setPhone('');
    setOtpCode('');
    Alert.alert('Profile Created', 'New farmer profile added to this device.');
  };

  const handleDelete = (acc: UserAccount) => {
    Alert.alert('Remove Profile', `Do you want to remove ${acc.name} from this device?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => deleteAccount(acc.id) },
    ]);
  };

  return (
    <View style={styles.container}>
      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Switch Farmer Profile</Text>
        <TouchableOpacity onPress={() => setModalVisible(true)} style={styles.addBtn}>
          <MaterialCommunityIcons name="account-plus" size={22} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      <Text style={styles.infoBanner}>
        Multiple farmers in the same family can use KisanSahay on one shared phone with separate loan records and document vaults.
      </Text>

      <FlatList
        data={profiles}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => {
          const isActive = item.id === activeProfileId;
          return (
            <TouchableOpacity
              activeOpacity={0.85}
              style={[styles.profileCard, isActive && styles.profileCardActive]}
              onPress={() => handleSwitch(item.id)}
            >
              <View style={[styles.avatar, { backgroundColor: item.avatarColor || Colors.primary }]}>
                <Text style={styles.avatarInitial}>{item.name.charAt(0)}</Text>
              </View>

              <View style={{ flex: 1, marginLeft: 12 }}>
                <View style={styles.nameRow}>
                  <Text style={styles.profileName}>{item.name}</Text>
                  {isActive && (
                    <View style={styles.activeBadge}>
                      <Text style={styles.activeBadgeText}>ACTIVE</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.profilePhone}>+91 {item.phone}</Text>
              </View>

              {profiles.length > 1 && !isActive && (
                <TouchableOpacity onPress={() => handleDelete(item)} style={{ padding: 6 }}>
                  <MaterialCommunityIcons name="trash-can-outline" size={20} color={Colors.danger} />
                </TouchableOpacity>
              )}
            </TouchableOpacity>
          );
        }}
      />

      {/* Add Profile Modal */}
      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Add Family Member Profile</Text>
            <Text style={styles.modalSub}>Requires one-time OTP verification to sandbox documents</Text>

            {!otpSent ? (
              <>
                <TextInput
                  style={styles.modalInput}
                  placeholder="Farmer Full Name (e.g. Ramesh Kumar)"
                  placeholderTextColor={Colors.textMuted}
                  value={name}
                  onChangeText={setName}
                />
                <TextInput
                  style={styles.modalInput}
                  keyboardType="numeric"
                  placeholder="10-digit Mobile Number"
                  placeholderTextColor={Colors.textMuted}
                  value={phone}
                  onChangeText={setPhone}
                />
                <TouchableOpacity style={styles.primaryModalBtn} onPress={handleSendOtp}>
                  <Text style={styles.btnText}>Send Verification OTP</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <TextInput
                  style={styles.modalInput}
                  keyboardType="numeric"
                  placeholder="Enter 6-digit OTP (123456)"
                  placeholderTextColor={Colors.textMuted}
                  value={otpCode}
                  onChangeText={setOtpCode}
                />
                <TouchableOpacity style={styles.primaryModalBtn} onPress={handleVerifyAndAdd}>
                  <Text style={styles.btnText}>Verify & Create Profile</Text>
                </TouchableOpacity>
              </>
            )}

            <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalVisible(false)}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
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
  backBtn: {
    padding: 4,
  },
  addBtn: {
    padding: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
  },
  infoBanner: {
    backgroundColor: 'rgba(22, 163, 74, 0.1)',
    color: Colors.primaryLight,
    padding: 12,
    fontSize: 12,
    lineHeight: 18,
    marginHorizontal: 16,
    marginTop: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(22, 163, 74, 0.25)',
  },
  list: {
    padding: 16,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    padding: 16,
    borderRadius: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  profileCardActive: {
    borderColor: Colors.primary,
    backgroundColor: 'rgba(22, 163, 74, 0.08)',
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontSize: 20,
    fontWeight: '800',
    color: '#ffffff',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  profileName: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text,
  },
  profilePhone: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  activeBadge: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  activeBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#ffffff',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: Colors.surface,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
  },
  modalSub: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 4,
    marginBottom: 16,
  },
  modalInput: {
    backgroundColor: Colors.surfaceLight,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 10,
    color: Colors.text,
    fontSize: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 12,
  },
  primaryModalBtn: {
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 4,
  },
  btnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  cancelBtn: {
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  cancelText: {
    color: Colors.textSecondary,
    fontSize: 13,
  },
});
