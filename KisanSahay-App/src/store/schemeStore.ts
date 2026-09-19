import { create } from 'zustand';
import { ApiService } from '../services/api';
import { Storage } from '../services/storage';

export interface Scheme {
  id: string;
  name: string;
  fullName?: string;
  category: string;
  ministry?: string;
  state: string;
  benefit: string;
  details?: string;
  eligibility?: any;
  documents?: string[];
  applicationUrl?: string;
  interestRate?: number;
  matchScore?: number;
}

interface SchemeState {
  schemes: Scheme[];
  filteredSchemes: Scheme[];
  bookmarkedIds: string[];
  searchQuery: string;
  selectedCategory: string;
  selectedState: string;
  isLoading: boolean;
  loadSchemes: () => Promise<void>;
  setSearchQuery: (query: string) => void;
  setSelectedCategory: (category: string) => void;
  setSelectedState: (state: string) => void;
  toggleBookmark: (schemeId: string) => Promise<void>;
  filterSchemes: () => void;
}

export const useSchemeStore = create<SchemeState>((set, get) => ({
  schemes: [],
  filteredSchemes: [],
  bookmarkedIds: [],
  searchQuery: '',
  selectedCategory: 'all',
  selectedState: 'all',
  isLoading: false,

  async loadSchemes() {
    set({ isLoading: true });
    const all = await ApiService.getSchemes();
    const bookmarks = await Storage.get<string[]>('kisansahay_bookmarks', []);
    
    set({
      schemes: all,
      filteredSchemes: all.slice(0, 50), // Initial fast page
      bookmarkedIds: bookmarks,
      isLoading: false,
    });
  },

  setSearchQuery(query: string) {
    set({ searchQuery: query });
    get().filterSchemes();
  },

  setSelectedCategory(category: string) {
    set({ selectedCategory: category });
    get().filterSchemes();
  },

  setSelectedState(state: string) {
    set({ selectedState: state });
    get().filterSchemes();
  },

  async toggleBookmark(schemeId: string) {
    const current = get().bookmarkedIds;
    const exists = current.includes(schemeId);
    const updated = exists ? current.filter((id) => id !== schemeId) : [...current, schemeId];
    await Storage.set('kisansahay_bookmarks', updated);
    set({ bookmarkedIds: updated });
  },

  filterSchemes() {
    const { schemes, searchQuery, selectedCategory, selectedState } = get();
    const query = searchQuery.trim().toLowerCase();

    const filtered = schemes.filter((s) => {
      // Category filter
      if (selectedCategory !== 'all') {
        const cat = (s.category || '').toLowerCase();
        if (selectedCategory === 'loans' && !cat.includes('loan') && !cat.includes('credit')) return false;
        if (selectedCategory === 'income' && !cat.includes('income') && !cat.includes('subsidy')) return false;
        if (selectedCategory === 'infra' && !cat.includes('infra') && !cat.includes('equipment')) return false;
      }

      // State filter
      if (selectedState !== 'all') {
        if (s.state !== 'All India' && s.state.toLowerCase() !== selectedState.toLowerCase()) return false;
      }

      // Search Query filter
      if (query) {
        const matchName = (s.name || '').toLowerCase().includes(query);
        const matchFull = (s.fullName || '').toLowerCase().includes(query);
        const matchBenefit = (s.benefit || '').toLowerCase().includes(query);
        const matchState = (s.state || '').toLowerCase().includes(query);
        if (!matchName && !matchFull && !matchBenefit && !matchState) return false;
      }

      return true;
    });

    set({ filteredSchemes: filtered.slice(0, 100) });
  },
}));
