import React from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { Colors } from '../theme/colors';
import { SUPPORTED_LANGUAGES, LanguageItem } from '../i18n';
import { useSettingsStore } from '../store/settingsStore';

export const LanguageScreen: React.FC = () => {
  const navigation = useNavigation();
  const { currentLang, setLanguage } = useSettingsStore();

  const handleSelect = async (code: string) => {
    await setLanguage(code);
    navigation.goBack();
  };

  const renderItem = ({ item }: { item: LanguageItem }) => {
    const isSelected = item.code === currentLang;
    return (
      <TouchableOpacity
        activeOpacity={0.8}
        style={[styles.row, isSelected && styles.rowSelected]}
        onPress={() => handleSelect(item.code)}
      >
        <View style={styles.leftInfo}>
          <Text style={styles.flag}>{item.flag}</Text>
          <View>
            <Text style={styles.nativeName}>{item.native}</Text>
            <Text style={styles.englishName}>{item.name}</Text>
          </View>
        </View>

        {isSelected && <MaterialCommunityIcons name="check-circle" size={24} color={Colors.primary} />}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Select Language / भाषा चुनें</Text>
        <View style={{ width: 24 }} />
      </View>

      <FlatList
        data={SUPPORTED_LANGUAGES}
        keyExtractor={(item) => item.code}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
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
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
  },
  listContent: {
    padding: 16,
    paddingBottom: 40,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  rowSelected: {
    backgroundColor: 'rgba(22, 163, 74, 0.15)',
    borderColor: Colors.primary,
  },
  leftInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  flag: {
    fontSize: 26,
  },
  nativeName: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.text,
  },
  englishName: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
});
