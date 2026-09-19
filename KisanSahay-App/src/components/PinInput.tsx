import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';

interface PinInputProps {
  onPinComplete: (pin: string) => void;
  title?: string;
}

export const PinInput: React.FC<PinInputProps> = ({ onPinComplete, title = 'Enter 4-Digit Security PIN' }) => {
  const [pin, setPin] = useState('');

  const handleDigit = (digit: string) => {
    if (pin.length < 4) {
      const next = pin + digit;
      setPin(next);
      if (next.length === 4) {
        onPinComplete(next);
      }
    }
  };

  const handleDelete = () => {
    setPin((prev) => prev.slice(0, -1));
  };

  const digits = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'];

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>

      {/* Dots Display */}
      <View style={styles.dotsRow}>
        {[0, 1, 2, 3].map((idx) => {
          const filled = pin.length > idx;
          return <View key={idx} style={[styles.pinDot, filled && styles.pinDotFilled]} />;
        })}
      </View>

      {/* Keypad */}
      <View style={styles.keypad}>
        {digits.map((item, index) => {
          if (item === '') {
            return <View key={index} style={styles.keyEmpty} />;
          }

          if (item === 'del') {
            return (
              <TouchableOpacity key={index} style={styles.key} onPress={handleDelete}>
                <MaterialCommunityIcons name="backspace-outline" size={24} color={Colors.text} />
              </TouchableOpacity>
            );
          }

          return (
            <TouchableOpacity key={index} style={styles.key} onPress={() => handleDigit(item)}>
              <Text style={styles.keyText}>{item}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginVertical: 16,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 20,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 30,
  },
  pinDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: Colors.border,
    backgroundColor: 'transparent',
  },
  pinDotFilled: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  keypad: {
    width: 260,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  key: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: Colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyEmpty: {
    width: 70,
    height: 70,
  },
  keyText: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.text,
  },
});
