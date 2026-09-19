import React from 'react';
import { TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';

interface VoiceButtonProps {
  isListening: boolean;
  onPress: () => void;
  size?: number;
}

export const VoiceButton: React.FC<VoiceButtonProps> = ({ isListening, onPress, size = 48 }) => {
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      style={[
        styles.button,
        { width: size, height: size, borderRadius: size / 2 },
        isListening && styles.listening,
      ]}
      onPress={onPress}
    >
      {isListening ? (
        <ActivityIndicator size="small" color="#ffffff" />
      ) : (
        <MaterialCommunityIcons name="microphone" size={size * 0.5} color="#ffffff" />
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  listening: {
    backgroundColor: Colors.danger,
  },
});
