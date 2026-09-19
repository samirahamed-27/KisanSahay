import React, { useState } from 'react';
import { View, Text, TextInput, FlatList, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/types';
import { Colors } from '../theme/colors';
import { useSchemes } from '../hooks/useSchemes';
import { SchemeCard } from '../components/SchemeCard';
import { VoiceButton } from '../components/VoiceButton';
import { useVoiceInput } from '../hooks/useVoiceInput';

type SchemesScreenProp = StackNavigationProp<RootStackParamList>;

export const SchemesScreen: React.FC = () => {
  const navigation = useNavigation<SchemesScreenProp>();
  const {
    filteredSchemes,
    bookmarkedIds,
    searchQuery,
    selectedCategory,
    setSearchQuery,
    setSelectedCategory,
    toggleBookmark,
    isLoading,
  } = useSchemes();

  const [activeTab, setActiveTab] = useState<'all' | 'saved'>('all');

  const { isListening, startListening, stopListening } = useVoiceInput((text) => {
    setSearchQuery(text);
  });

  const categories = [
    { key: 'all', label: 'All Schemes' },
    { key: 'loans', label: 'Crop Loans & Credit' },
    { key: 'income', label: 'Income Support' },
    { key: 'infra', label: 'Equipment & Infra' },
  ];

  const displayedSchemes = activeTab === 'saved'
    ? filteredSchemes.filter((s) => bookmarkedIds.includes(s.id))
    : filteredSchemes;

  return (
    <View style={styles.container}>
      {/* Top Search & Filter Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Government Schemes (500+)</Text>
        <Text style={styles.subtitle}>Find verified pan-India and state-specific agricultural schemes</Text>

        {/* Search Bar */}
        <View style={styles.searchRow}>
          <View style={styles.searchBar}>
            <MaterialCommunityIcons name="magnify" size={20} color={Colors.textSecondary} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search scheme name, crop, or benefit..."
              placeholderTextColor={Colors.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <MaterialCommunityIcons name="close-circle" size={18} color={Colors.textMuted} />
              </TouchableOpacity>
            )}
          </View>
          <VoiceButton
            isListening={isListening}
            onPress={isListening ? stopListening : () => startListening('hi-IN')}
            size={42}
          />
        </View>

        {/* Tab switch: All / Saved */}
        <View style={styles.tabSwitch}>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'all' && styles.tabButtonActive]}
            onPress={() => setActiveTab('all')}
          >
            <Text style={[styles.tabButtonText, activeTab === 'all' && styles.tabButtonTextActive]}>
              All Schemes ({filteredSchemes.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'saved' && styles.tabButtonActive]}
            onPress={() => setActiveTab('saved')}
          >
            <Text style={[styles.tabButtonText, activeTab === 'saved' && styles.tabButtonTextActive]}>
              Saved ({bookmarkedIds.length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Category Pills */}
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={categories}
          keyExtractor={(item) => item.key}
          contentContainerStyle={styles.categoryList}
          renderItem={({ item }) => {
            const isSelected = selectedCategory === item.key;
            return (
              <TouchableOpacity
                style={[styles.pill, isSelected && styles.pillSelected]}
                onPress={() => setSelectedCategory(item.key)}
              >
                <Text style={[styles.pillText, isSelected && styles.pillTextSelected]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {/* Schemes List */}
      <FlatList
        data={displayedSchemes}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <SchemeCard
            scheme={item}
            isBookmarked={bookmarkedIds.includes(item.id)}
            onBookmarkToggle={() => toggleBookmark(item.id)}
            onPress={() => navigation.navigate('SchemeDetail', { scheme: item })}
          />
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="file-search-outline" size={48} color={Colors.textMuted} />
            <Text style={styles.emptyTitle}>No Schemes Found</Text>
            <Text style={styles.emptySub}>Try searching for another crop, state, or keyword.</Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
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
    marginBottom: 12,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceLight,
    borderRadius: 10,
    paddingHorizontal: 10,
    height: 42,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    color: Colors.text,
    fontSize: 13,
  },
  tabSwitch: {
    flexDirection: 'row',
    backgroundColor: Colors.surfaceLight,
    borderRadius: 8,
    padding: 3,
    marginBottom: 10,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 6,
    alignItems: 'center',
    borderRadius: 6,
  },
  tabButtonActive: {
    backgroundColor: Colors.surface,
  },
  tabButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  tabButtonTextActive: {
    color: Colors.text,
  },
  categoryList: {
    gap: 8,
    paddingVertical: 4,
  },
  pill: {
    backgroundColor: Colors.surfaceLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  pillSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  pillText: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  pillTextSelected: {
    color: '#ffffff',
  },
  listContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
    marginTop: 12,
  },
  emptySub: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 4,
    textAlign: 'center',
  },
});
