import { create } from 'zustand';
import { Storage } from '../services/storage';
import { LandUnit } from '../utils/unitConverter';

export interface FarmerProfile {
  id: string;
  name: string;
  phone: string;
  state: string;
  district: string;
  landArea: number;
  landUnit: LandUnit;
  cropType: string;
  gender: 'Male' | 'Female' | 'Other';
  age: number;
  income: number;
  residence: 'Rural' | 'Urban';
  disability: 'No' | 'Yes';
  minority: 'No' | 'Yes';
  hasKcc: boolean;
  aadhaarLinked: boolean;
}

const DEFAULT_PROFILE: FarmerProfile = {
  id: 'profile_default',
  name: 'Ramesh Kumar',
  phone: '9876543210',
  state: 'Uttar Pradesh',
  district: 'Varanasi',
  landArea: 2.5,
  landUnit: 'acre',
  cropType: 'Wheat',
  gender: 'Male',
  age: 38,
  income: 150000,
  residence: 'Rural',
  disability: 'No',
  minority: 'No',
  hasKcc: true,
  aadhaarLinked: true,
};

interface ProfileState {
  profile: FarmerProfile;
  isLoading: boolean;
  updateProfile: (data: Partial<FarmerProfile>) => Promise<void>;
  loadProfile: () => Promise<void>;
}

export const useProfileStore = create<ProfileState>((set, get) => ({
  profile: DEFAULT_PROFILE,
  isLoading: false,

  async updateProfile(data: Partial<FarmerProfile>) {
    const updated = { ...get().profile, ...data };
    await Storage.set('kisansahay_farmer_profile', updated);
    set({ profile: updated });
  },

  async loadProfile() {
    set({ isLoading: true });
    const saved = await Storage.get<FarmerProfile>('kisansahay_farmer_profile', DEFAULT_PROFILE);
    set({ profile: saved, isLoading: false });
  },
}));
