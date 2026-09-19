import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Colors } from '../theme/colors';

interface LoadingSkeletonProps {
  height?: number;
  width?: string | number;
  borderRadius?: number;
  style?: any;
}

export const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({
  height = 80,
  width = '100%',
  borderRadius = 12,
  style,
}) => {
  return (
    <View
      style={[
        styles.skeleton,
        { height, width: width as any, borderRadius },
        style,
      ]}
    />
  );
};

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: Colors.surfaceLight,
    marginBottom: 10,
    opacity: 0.6,
  },
});
