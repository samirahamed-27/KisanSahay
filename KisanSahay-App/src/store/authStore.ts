import { create } from 'zustand';
import { Storage } from '../services/storage';
import { VaultEncryption } from '../services/encryption';

export interface UserAccount {
  id: string;
  name: string;
  phone: string;
  avatarColor: string;
  createdAt: string;
}

interface AuthState {
  profiles: UserAccount[];
  activeProfileId: string;
  isVaultUnlocked: boolean;
  vaultSecret: string | null;
  vaultSecretType: 'word' | 'pin' | 'pattern';
  vaultDocuments: any[];
  loadAccounts: () => Promise<void>;
  createAccount: (name: string, phone: string) => Promise<UserAccount>;
  switchAccount: (id: string) => Promise<void>;
  deleteAccount: (id: string) => Promise<void>;
  unlockVault: (secret: string) => Promise<boolean>;
  lockVault: () => void;
  setVaultSecret: (secret: string, type: 'word' | 'pin' | 'pattern') => Promise<void>;
  addVaultDocument: (doc: any) => Promise<void>;
  removeVaultDocument: (docId: string) => Promise<void>;
}

const DEFAULT_ACCOUNTS: UserAccount[] = [
  { id: 'user_1', name: 'Ramesh Kumar (Self)', phone: '9876543210', avatarColor: '#16a34a', createdAt: new Date().toISOString() },
  { id: 'user_2', name: 'Sunita Devi (Wife)', phone: '9876543211', avatarColor: '#3b82f6', createdAt: new Date().toISOString() },
];

export const useAuthStore = create<AuthState>((set, get) => ({
  profiles: DEFAULT_ACCOUNTS,
  activeProfileId: 'user_1',
  isVaultUnlocked: false,
  vaultSecret: null,
  vaultSecretType: 'word',
  vaultDocuments: [],

  async loadAccounts() {
    const saved = await Storage.get<UserAccount[]>('kisansahay_user_accounts', DEFAULT_ACCOUNTS);
    const activeId = await Storage.get<string>('kisansahay_active_user_id', 'user_1');
    const secretType = await Storage.get<'word' | 'pin' | 'pattern'>('kisansahay_vault_secret_type', 'word');

    set({
      profiles: saved,
      activeProfileId: activeId,
      vaultSecretType: secretType,
    });
  },

  async createAccount(name: string, phone: string) {
    const colors = ['#16a34a', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899'];
    const newAcc: UserAccount = {
      id: 'user_' + Date.now(),
      name,
      phone,
      avatarColor: colors[get().profiles.length % colors.length],
      createdAt: new Date().toISOString(),
    };
    const updated = [...get().profiles, newAcc];
    await Storage.set('kisansahay_user_accounts', updated);
    await Storage.set('kisansahay_active_user_id', newAcc.id);
    set({ profiles: updated, activeProfileId: newAcc.id });
    return newAcc;
  },

  async switchAccount(id: string) {
    await Storage.set('kisansahay_active_user_id', id);
    set({ activeProfileId: id, isVaultUnlocked: false, vaultSecret: null, vaultDocuments: [] });
  },

  async deleteAccount(id: string) {
    const filtered = get().profiles.filter((p) => p.id !== id);
    const nextActive = filtered.length > 0 ? filtered[0].id : 'user_1';
    await Storage.set('kisansahay_user_accounts', filtered);
    await Storage.set('kisansahay_active_user_id', nextActive);
    set({ profiles: filtered, activeProfileId: nextActive });
  },

  async unlockVault(secret: string): Promise<boolean> {
    const storedHash = await Storage.get<string>('kisansahay_vault_hash', '');
    const enteredHash = VaultEncryption.hashSecret(secret);

    // If never initialized, accept the first secret as configuration
    if (!storedHash) {
      await Storage.set('kisansahay_vault_hash', enteredHash);
      set({ isVaultUnlocked: true, vaultSecret: secret });
      return true;
    }

    if (storedHash === enteredHash) {
      // Decrypt stored documents
      const encryptedDocs = await Storage.get<string>(`kisansahay_vault_docs_${get().activeProfileId}`, '');
      let docs: any[] = [];
      if (encryptedDocs) {
        try {
          const raw = VaultEncryption.decrypt(encryptedDocs, secret);
          docs = JSON.parse(raw);
        } catch (e) {
          console.warn('[Vault] Decryption failed:', e);
        }
      }
      set({ isVaultUnlocked: true, vaultSecret: secret, vaultDocuments: docs });
      return true;
    }
    return false;
  },

  lockVault() {
    set({ isVaultUnlocked: false, vaultSecret: null, vaultDocuments: [] });
  },

  async setVaultSecret(secret: string, type: 'word' | 'pin' | 'pattern') {
    const hash = VaultEncryption.hashSecret(secret);
    await Storage.set('kisansahay_vault_hash', hash);
    await Storage.set('kisansahay_vault_secret_type', type);
    set({ vaultSecretType: type, vaultSecret: secret, isVaultUnlocked: true });
  },

  async addVaultDocument(doc: any) {
    const updated = [...get().vaultDocuments, doc];
    set({ vaultDocuments: updated });

    if (get().vaultSecret) {
      const encrypted = VaultEncryption.encrypt(JSON.stringify(updated), get().vaultSecret!);
      await Storage.set(`kisansahay_vault_docs_${get().activeProfileId}`, encrypted);
    }
  },

  async removeVaultDocument(docId: string) {
    const updated = get().vaultDocuments.filter((d) => d.id !== docId);
    set({ vaultDocuments: updated });

    if (get().vaultSecret) {
      const encrypted = VaultEncryption.encrypt(JSON.stringify(updated), get().vaultSecret!);
      await Storage.set(`kisansahay_vault_docs_${get().activeProfileId}`, encrypted);
    }
  },
}));
