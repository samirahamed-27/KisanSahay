import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, FlatList, Alert } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';
import { useAuthStore } from '../store/authStore';
import { PatternLock } from '../components/PatternLock';
import { PinInput } from '../components/PinInput';

export const VaultScreen: React.FC = () => {
  const {
    isVaultUnlocked,
    vaultSecretType,
    vaultDocuments,
    unlockVault,
    lockVault,
    setVaultSecret,
    addVaultDocument,
    removeVaultDocument,
  } = useAuthStore();

  const [activeTab, setActiveTab] = useState<'word' | 'pin' | 'pattern'>(vaultSecretType);
  const [wordPassword, setWordPassword] = useState('');
  const [docTitle, setDocTitle] = useState('');
  const [docCategory, setDocCategory] = useState('Aadhaar Card');

  const handleWordUnlock = async () => {
    if (!wordPassword.trim()) {
      Alert.alert('Missing Password', 'Please enter your vault password word.');
      return;
    }
    const success = await unlockVault(wordPassword.trim());
    if (!success) {
      Alert.alert('Incorrect Password', 'The entered password does not match your vault key.');
    }
  };

  const handlePinUnlock = async (pin: string) => {
    const success = await unlockVault(pin);
    if (!success) {
      Alert.alert('Incorrect PIN', 'The entered 4-digit PIN is incorrect.');
    }
  };

  const handlePatternUnlock = async (pattern: string) => {
    const success = await unlockVault(pattern);
    if (!success) {
      Alert.alert('Incorrect Pattern', 'The entered pattern sequence did not unlock the vault.');
    }
  };

  const handleAddSampleDoc = async () => {
    if (!docTitle.trim()) {
      Alert.alert('Missing Document Name', 'Please enter a document title.');
      return;
    }
    await addVaultDocument({
      id: 'doc_' + Date.now(),
      title: docTitle.trim(),
      category: docCategory,
      uploadedAt: new Date().toLocaleDateString('en-IN'),
      verified: true,
    });
    setDocTitle('');
    Alert.alert('Encrypted & Stored', `${docTitle} was safely secured in your encrypted vault.`);
  };

  return (
    <View style={styles.container}>
      {/* Top Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Farmer Document Vault</Text>
          <Text style={styles.subtitle}>Client-side encrypted storage for land records & IDs</Text>
        </View>

        {isVaultUnlocked && (
          <TouchableOpacity style={styles.lockButton} onPress={lockVault}>
            <MaterialCommunityIcons name="lock" size={18} color="#ffffff" />
            <Text style={styles.lockButtonText}>Lock</Text>
          </TouchableOpacity>
        )}
      </View>

      {!isVaultUnlocked ? (
        /* LOCKED STATE: SHOW AUTHENTICATOR TABS */
        <View style={styles.lockedContainer}>
          <View style={styles.lockIconBox}>
            <MaterialCommunityIcons name="shield-lock-outline" size={54} color={Colors.gold} />
            <Text style={styles.lockedTitle}>Vault is Encrypted & Locked</Text>
            <Text style={styles.lockedSub}>Choose your security method to decrypt documents</Text>
          </View>

          {/* Security Tab Selector */}
          <View style={styles.secTabs}>
            <TouchableOpacity
              style={[styles.secTab, activeTab === 'word' && styles.secTabActive]}
              onPress={() => setActiveTab('word')}
            >
              <Text style={[styles.secTabText, activeTab === 'word' && styles.secTabTextActive]}>Word</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.secTab, activeTab === 'pin' && styles.secTabActive]}
              onPress={() => setActiveTab('pin')}
            >
              <Text style={[styles.secTabText, activeTab === 'pin' && styles.secTabTextActive]}>PIN</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.secTab, activeTab === 'pattern' && styles.secTabActive]}
              onPress={() => setActiveTab('pattern')}
            >
              <Text style={[styles.secTabText, activeTab === 'pattern' && styles.secTabTextActive]}>Pattern</Text>
            </TouchableOpacity>
          </View>

          {/* Unlock Views */}
          {activeTab === 'word' && (
            <View style={styles.wordBox}>
              <TextInput
                style={styles.wordInput}
                secureTextEntry
                placeholder="Enter secret word or passphrase"
                placeholderTextColor={Colors.textMuted}
                value={wordPassword}
                onChangeText={setWordPassword}
              />
              <TouchableOpacity style={styles.unlockBtn} onPress={handleWordUnlock}>
                <Text style={styles.unlockBtnText}>Unlock Vault</Text>
              </TouchableOpacity>
            </View>
          )}

          {activeTab === 'pin' && <PinInput onPinComplete={handlePinUnlock} />}

          {activeTab === 'pattern' && <PatternLock onPatternComplete={handlePatternUnlock} />}
        </View>
      ) : (
        /* UNLOCKED STATE: SHOW DOCUMENTS */
        <View style={styles.unlockedContainer}>
          {/* Add Document Box */}
          <View style={styles.addDocBox}>
            <Text style={styles.addDocTitle}>Secure New Document</Text>
            <TextInput
              style={styles.docInput}
              placeholder="e.g. Khasra / Khatoni 2026, SBI KCC Passbook"
              placeholderTextColor={Colors.textMuted}
              value={docTitle}
              onChangeText={setDocTitle}
            />
            <View style={styles.docTypeRow}>
              {['Aadhaar Card', 'Land Record', 'KCC Passbook'].map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[styles.catPill, docCategory === cat && styles.catPillActive]}
                  onPress={() => setDocCategory(cat)}
                >
                  <Text style={[styles.catPillText, docCategory === cat && styles.catPillTextActive]}>{cat}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity style={styles.addDocBtn} onPress={handleAddSampleDoc}>
              <MaterialCommunityIcons name="file-upload-outline" size={18} color="#ffffff" />
              <Text style={styles.addDocBtnText}>Encrypt & Save to Vault</Text>
            </TouchableOpacity>
          </View>

          {/* Documents List */}
          <FlatList
            data={vaultDocuments}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ paddingBottom: 40 }}
            renderItem={({ item }) => (
              <View style={styles.docCard}>
                <View style={styles.docIconBox}>
                  <MaterialCommunityIcons name="file-document-check" size={26} color={Colors.primaryLight} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardDocTitle}>{item.title}</Text>
                  <Text style={styles.cardDocCategory}>{item.category} • Secured {item.uploadedAt}</Text>
                </View>
                <TouchableOpacity
                  onPress={() => removeVaultDocument(item.id)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <MaterialCommunityIcons name="delete-outline" size={22} color={Colors.danger} />
                </TouchableOpacity>
              </View>
            )}
            ListEmptyComponent={
              <View style={styles.emptyBox}>
                <MaterialCommunityIcons name="folder-lock-open-outline" size={48} color={Colors.textMuted} />
                <Text style={styles.emptyTitle}>Your Vault is Empty</Text>
                <Text style={styles.emptySub}>Add your scanned Aadhaar, KCC, or land records above.</Text>
              </View>
            }
          />
        </View>
      )}
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
  lockButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.danger,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  lockButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  lockedContainer: {
    flex: 1,
    padding: 20,
    alignItems: 'center',
  },
  lockIconBox: {
    alignItems: 'center',
    marginVertical: 16,
  },
  lockedTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
    marginTop: 10,
  },
  lockedSub: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 4,
    textAlign: 'center',
  },
  secTabs: {
    flexDirection: 'row',
    backgroundColor: Colors.surfaceLight,
    borderRadius: 10,
    padding: 3,
    width: '100%',
    marginVertical: 14,
  },
  secTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  secTabActive: {
    backgroundColor: Colors.primary,
  },
  secTabText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  secTabTextActive: {
    color: '#ffffff',
  },
  wordBox: {
    width: '100%',
    marginTop: 16,
  },
  wordInput: {
    backgroundColor: Colors.surface,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 14,
  },
  unlockBtn: {
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  unlockBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  unlockedContainer: {
    flex: 1,
    padding: 16,
  },
  addDocBox: {
    backgroundColor: Colors.surface,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 16,
  },
  addDocTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 8,
  },
  docInput: {
    backgroundColor: Colors.surfaceLight,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 8,
  },
  docTypeRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 10,
  },
  catPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: Colors.surfaceLight,
  },
  catPillActive: {
    backgroundColor: Colors.primary,
  },
  catPillText: {
    fontSize: 11,
    color: Colors.textSecondary,
  },
  catPillTextActive: {
    color: '#ffffff',
    fontWeight: '600',
  },
  addDocBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  addDocBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
  },
  docCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 10,
    gap: 12,
  },
  docIconBox: {
    backgroundColor: 'rgba(22, 163, 74, 0.15)',
    padding: 8,
    borderRadius: 8,
  },
  cardDocTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text,
  },
  cardDocCategory: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  emptyBox: {
    alignItems: 'center',
    justifyContent: 'center',
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
  },
});
