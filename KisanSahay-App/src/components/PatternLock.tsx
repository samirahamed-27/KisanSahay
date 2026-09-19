import React, { useState } from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Colors } from '../theme/colors';

interface PatternLockProps {
  onPatternComplete: (patternString: string) => void;
  title?: string;
}

export const PatternLock: React.FC<PatternLockProps> = ({
  onPatternComplete,
  title = 'Connect at least 4 dots to unlock',
}) => {
  const [sequence, setSequence] = useState<number[]>([]);

  const handleDotPress = (dotId: number) => {
    if (sequence.includes(dotId)) return;
    const next = [...sequence, dotId];
    setSequence(next);

    if (next.length >= 4) {
      onPatternComplete(next.join('-'));
    }
  };

  const handleReset = () => {
    setSequence([]);
  };

  const dots = [1, 2, 3, 4, 5, 6, 7, 8, 9];

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtext}>Connected: {sequence.length} dots</Text>

      <View style={styles.grid}>
        {dots.map((dot) => {
          const isSelected = sequence.includes(dot);
          return (
            <TouchableOpacity
              key={dot}
              activeOpacity={0.7}
              style={[styles.dotWrapper, isSelected && styles.dotWrapperSelected]}
              onPress={() => handleDotPress(dot)}
            >
              <View style={[styles.dot, isSelected && styles.dotSelected]} />
            </TouchableOpacity>
          );
        })}
      </View>

      <TouchableOpacity style={styles.resetButton} onPress={handleReset}>
        <Text style={styles.resetText}>Clear Pattern</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginVertical: 20,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  subtext: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 20,
  },
  grid: {
    width: 240,
    height: 240,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignContent: 'space-between',
  },
  dotWrapper: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  dotWrapperSelected: {
    borderColor: Colors.primary,
    backgroundColor: 'rgba(22, 163, 74, 0.2)',
  },
  dot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: Colors.textMuted,
  },
  dotSelected: {
    backgroundColor: Colors.primary,
    transform: [{ scale: 1.3 }],
  },
  resetButton: {
    marginTop: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: Colors.surfaceLight,
  },
  resetText: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
});
