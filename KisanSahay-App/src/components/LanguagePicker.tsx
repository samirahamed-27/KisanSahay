import React from 'react';
import { View, Text, TouchableOpacity, Modal, FlatList, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';
import { SUPPORTED_LANGUAGES, LanguageItem } from '../i18n';

interface LanguagePickerProps {
  visible: boolean;
  selectedCode: string;
  onSelectLanguage: (code: string) => void;
  onClose: () => void;
}

export const LanguagePicker: React.FC<LanguagePickerProps> = ({
  visible,
  selectedCode,
  onSelectLanguage,
  onClose,
}) => {
  const renderItem = ({ item }: { item: LanguageItem }) => {
    const isSelected = item.code === selectedCode;
    return (
      <TouchableOpacity
        activeOpacity={0.8}
        style={[styles.langRow, isSelected && styles.langRowSelected]}
        onPress={() => {
          onSelectLanguage(item.code);
          onClose();
        }}
      >
        <View style={styles.leftInfo}>
          <Text style={styles.flagText}>{item.flag}</Text>
          <View>
            <Text style={styles.nativeText}>{item.native}</Text>
            <Text style={styles.englishText}>{item.name}</Text>
          </View>
        </View>

        {isSelected && (
          <MaterialCommunityIcons name="check-circle" size={20} color={Colors.primary} />
        )}
      </TouchableOpacity>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modalContent}>
          <View style={styles.header}>
            <Text style={styles.title}>Select Language / भाषा चुनें</Text>
            <TouchableOpacity onPress={onClose}>
              <MaterialCommunityIcons name="close" size={24} color={Colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <FlatList
            data={SUPPORTED_LANGUAGES}
            keyExtractor={(item) => item.code}
            renderItem={renderItem}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
          />
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 32,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
  },
  list: {
    paddingVertical: 10,
  },
  langRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 6,
  },
  langRowSelected: {
    backgroundColor: 'rgba(22, 163, 74, 0.15)',
  },
  leftInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  flagText: {
    fontSize: 22,
  },
  nativeText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  englishText: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
});
