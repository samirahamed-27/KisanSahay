import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';

interface TTSButtonProps {
  isSpeaking: boolean;
  onPress: () => void;
  label?: string;
}

export const TTSButton: React.FC<TTSButtonProps> = ({
  isSpeaking,
  onPress,
  label = 'Read Aloud',
}) => {
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      style={[styles.button, isSpeaking && styles.speaking]}
      onPress={onPress}
    >
      <MaterialCommunityIcons
        name={isSpeaking ? 'stop-circle-outline' : 'volume-high'}
        size={18}
        color={isSpeaking ? '#ffffff' : Colors.primaryLight}
      />
      <Text style={[styles.label, isSpeaking && styles.labelSpeaking]}>
        {isSpeaking ? 'Stop Audio' : label}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(22, 163, 74, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(22, 163, 74, 0.3)',
  },
  speaking: {
    backgroundColor: Colors.danger,
    borderColor: Colors.danger,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.primaryLight,
  },
  labelSpeaking: {
    color: '#ffffff',
  },
});
