import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';
import { Scheme } from '../store/schemeStore';

interface SchemeCardProps {
  scheme: Scheme;
  onPress: () => void;
  isBookmarked?: boolean;
  onBookmarkToggle?: () => void;
}

export const SchemeCard: React.FC<SchemeCardProps> = ({
  scheme,
  onPress,
  isBookmarked = false,
  onBookmarkToggle,
}) => {
  return (
    <TouchableOpacity activeOpacity={0.85} style={styles.card} onPress={onPress}>
      <View style={styles.headerRow}>
        <View style={styles.badgeContainer}>
          <Text style={styles.badgeText}>{scheme.state || 'All India'}</Text>
          {scheme.category && (
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryText}>{scheme.category.replace(/_/g, ' ')}</Text>
            </View>
          )}
        </View>

        {onBookmarkToggle && (
          <TouchableOpacity onPress={onBookmarkToggle} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <MaterialCommunityIcons
              name={isBookmarked ? 'bookmark' : 'bookmark-outline'}
              size={22}
              color={isBookmarked ? Colors.gold : Colors.textMuted}
            />
          </TouchableOpacity>
        )}
      </View>

      <Text style={styles.title} numberOfLines={2}>
        {scheme.name}
      </Text>

      {scheme.fullName && (
        <Text style={styles.subTitle} numberOfLines={1}>
          {scheme.fullName}
        </Text>
      )}

      <View style={styles.benefitBox}>
        <MaterialCommunityIcons name="gift-outline" size={16} color={Colors.primaryLight} style={styles.benefitIcon} />
        <Text style={styles.benefitText} numberOfLines={2}>
          {scheme.benefit}
        </Text>
      </View>

      <View style={styles.footerRow}>
        <Text style={styles.ministryText} numberOfLines={1}>
          {scheme.ministry || 'Government of India'}
        </Text>
        <View style={styles.actionPill}>
          <Text style={styles.actionText}>View Details</Text>
          <MaterialCommunityIcons name="chevron-right" size={16} color={Colors.primary} />
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  badgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.primaryLight,
    backgroundColor: 'rgba(22, 163, 74, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    textTransform: 'uppercase',
  },
  categoryBadge: {
    backgroundColor: Colors.surfaceLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  categoryText: {
    fontSize: 11,
    color: Colors.textSecondary,
    textTransform: 'capitalize',
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
    lineHeight: 22,
    marginBottom: 4,
  },
  subTitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 10,
  },
  benefitBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(17, 24, 39, 0.9)',
    borderLeftWidth: 3,
    borderLeftColor: Colors.primary,
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
  },
  benefitIcon: {
    marginTop: 2,
    marginRight: 6,
  },
  benefitText: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.text,
    flex: 1,
    lineHeight: 18,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.surfaceLight,
  },
  ministryText: {
    fontSize: 11,
    color: Colors.textMuted,
    flex: 1,
    marginRight: 8,
  },
  actionPill: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.primary,
  },
});
