import { useEffect } from 'react';
import { useSchemeStore } from '../store/schemeStore';
import { useProfileStore } from '../store/profileStore';

export function useSchemes() {
  const {
    schemes,
    filteredSchemes,
    bookmarkedIds,
    searchQuery,
    selectedCategory,
    selectedState,
    isLoading,
    loadSchemes,
    setSearchQuery,
    setSelectedCategory,
    setSelectedState,
    toggleBookmark,
  } = useSchemeStore();

  const { profile } = useProfileStore();

  useEffect(() => {
    if (schemes.length === 0) {
      loadSchemes();
    }
  }, [schemes.length, loadSchemes]);

  const bookmarkedSchemes = schemes.filter((s) => bookmarkedIds.includes(s.id));

  // Top recommended schemes for current farmer profile
  const recommendedSchemes = schemes
    .filter((s) => s.state === 'All India' || s.state === profile.state)
    .slice(0, 5);

  return {
    schemes,
    filteredSchemes,
    bookmarkedSchemes,
    recommendedSchemes,
    bookmarkedIds,
    searchQuery,
    selectedCategory,
    selectedState,
    isLoading,
    setSearchQuery,
    setSelectedCategory,
    setSelectedState,
    toggleBookmark,
    refreshSchemes: loadSchemes,
  };
}
