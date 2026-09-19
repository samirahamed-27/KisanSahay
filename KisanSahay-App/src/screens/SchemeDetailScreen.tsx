import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Linking, Share } from 'react-native';
import { RouteProp, useRoute, useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { RootStackParamList } from '../navigation/types';
import { Colors } from '../theme/colors';
import { TTSButton } from '../components/TTSButton';
import { useTTS } from '../hooks/useTTS';
import { useSchemeStore } from '../store/schemeStore';

type DetailRouteProp = RouteProp<RootStackParamList, 'SchemeDetail'>;

export const SchemeDetailScreen: React.FC = () => {
  const route = useRoute<DetailRouteProp>();
  const navigation = useNavigation();
  const { scheme } = route.params;

  const { bookmarkedIds, toggleBookmark } = useSchemeStore();
  const isBookmarked = bookmarkedIds.includes(scheme.id);

  const { isSpeaking, speak, stop } = useTTS();
  const [checkedDocs, setCheckedDocs] = useState<string[]>([]);

  const toggleDocCheck = (doc: string) => {
    setCheckedDocs((prev) =>
      prev.includes(doc) ? prev.filter((d) => d !== doc) : [...prev, doc]
    );
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `🌾 ${scheme.name} - ${scheme.benefit}\nApply or learn more: ${scheme.applicationUrl || 'https://kisansahay.vercel.app'}`,
      });
    } catch (e) {
      // ignore
    }
  };

  const handleApply = () => {
    const url = scheme.applicationUrl || 'https://pmkisan.gov.in';
    Linking.openURL(url);
  };

  const speechText = `${scheme.name}. ${scheme.fullName || ''}. Benefit: ${scheme.benefit}. State: ${scheme.state}. Ministry: ${scheme.ministry || 'Government of India'}`;

  const defaultDocuments = scheme.documents && scheme.documents.length > 0
    ? scheme.documents
    : [
        'Aadhaar Card (Linked with Mobile)',
        'Land Ownership Record / Khatoni / Khasra',
        'Bank Passbook / Cancelled Cheque',
        'Active Kisan Credit Card (if applicable)',
        'Passport Size Photograph',
      ];

  return (
    <View style={styles.container}>
      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={Colors.text} />
        </TouchableOpacity>

        <View style={styles.headerActions}>
          <TouchableOpacity onPress={handleShare} style={styles.iconAction}>
            <MaterialCommunityIcons name="share-variant-outline" size={22} color={Colors.text} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => toggleBookmark(scheme.id)} style={styles.iconAction}>
            <MaterialCommunityIcons
              name={isBookmarked ? 'bookmark' : 'bookmark-outline'}
              size={24}
              color={isBookmarked ? Colors.gold : Colors.text}
            />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Badges */}
        <View style={styles.badgeRow}>
          <View style={styles.stateBadge}>
            <Text style={styles.stateText}>{scheme.state || 'All India'}</Text>
          </View>
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryText}>{scheme.category?.replace(/_/g, ' ') || 'Agriculture'}</Text>
          </View>
        </View>

        <Text style={styles.title}>{scheme.name}</Text>
        {scheme.fullName && <Text style={styles.subTitle}>{scheme.fullName}</Text>}

        {/* TTS Audio Bar */}
        <View style={styles.audioBar}>
          <TTSButton
            isSpeaking={isSpeaking}
            onPress={() => (isSpeaking ? stop() : speak(speechText, 'hi'))}
            label="Listen Details (Hindi/English)"
          />
        </View>

        {/* Benefit Highlight Box */}
        <View style={styles.benefitCard}>
          <View style={styles.cardHeaderRow}>
            <MaterialCommunityIcons name="gift-outline" size={20} color={Colors.primaryLight} />
            <Text style={styles.cardHeaderTitle}>Scheme Benefits</Text>
          </View>
          <Text style={styles.benefitText}>{scheme.benefit}</Text>
          {scheme.interestRate !== undefined && (
            <View style={styles.rateHighlight}>
              <Text style={styles.rateLabel}>Effective Subsidized Rate:</Text>
              <Text style={styles.rateValue}>{scheme.interestRate}% p.a.</Text>
            </View>
          )}
        </View>

        {/* Eligibility Overview */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Eligibility Criteria</Text>
          <View style={styles.eligibilityCard}>
            <View style={styles.eligItem}>
              <MaterialCommunityIcons name="check-circle" size={18} color={Colors.success} />
              <Text style={styles.eligText}>Small & Marginal Landholder Farmers</Text>
            </View>
            <View style={styles.eligItem}>
              <MaterialCommunityIcons name="check-circle" size={18} color={Colors.success} />
              <Text style={styles.eligText}>Valid Aadhaar-linked Bank Account</Text>
            </View>
            <View style={styles.eligItem}>
              <MaterialCommunityIcons name="check-circle" size={18} color={Colors.success} />
              <Text style={styles.eligText}>Resident of {scheme.state || 'India'}</Text>
            </View>
          </View>
        </View>

        {/* Required Documents Checklist */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Required Documents Checklist</Text>
          <Text style={styles.sectionSub}>Check off the papers you have ready in your Document Vault</Text>

          {defaultDocuments.map((doc, idx) => {
            const isChecked = checkedDocs.includes(doc);
            return (
              <TouchableOpacity
                key={idx}
                activeOpacity={0.8}
                style={[styles.docItem, isChecked && styles.docItemChecked]}
                onPress={() => toggleDocCheck(doc)}
              >
                <MaterialCommunityIcons
                  name={isChecked ? 'checkbox-marked' : 'checkbox-blank-outline'}
                  size={20}
                  color={isChecked ? Colors.primary : Colors.textMuted}
                />
                <Text style={[styles.docText, isChecked && styles.docTextChecked]}>{doc}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Ministry Information */}
        <View style={styles.infoCard}>
          <Text style={styles.infoLabel}>Sponsoring Ministry / Department</Text>
          <Text style={styles.infoValue}>{scheme.ministry || 'Ministry of Agriculture & Farmers Welfare'}</Text>
        </View>
      </ScrollView>

      {/* Bottom Sticky Apply Bar */}
      <View style={styles.bottomBar}>
        <TouchableOpacity style={styles.applyButton} onPress={handleApply}>
          <Text style={styles.applyButtonText}>Apply on Official Portal</Text>
          <MaterialCommunityIcons name="open-in-new" size={18} color="#ffffff" style={{ marginLeft: 6 }} />
        </TouchableOpacity>
      </View>
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
  backButton: {
    padding: 4,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  iconAction: {
    padding: 4,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  stateBadge: {
    backgroundColor: 'rgba(22, 163, 74, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  stateText: {
    color: Colors.primaryLight,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  categoryBadge: {
    backgroundColor: Colors.surfaceLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  categoryText: {
    color: Colors.textSecondary,
    fontSize: 12,
    textTransform: 'capitalize',
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.text,
    lineHeight: 28,
  },
  subTitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 4,
    marginBottom: 12,
  },
  audioBar: {
    marginBottom: 16,
  },
  benefitCard: {
    backgroundColor: Colors.surface,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    borderLeftWidth: 4,
    borderLeftColor: Colors.primary,
    marginBottom: 16,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  cardHeaderTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.primaryLight,
  },
  benefitText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
    lineHeight: 22,
  },
  rateHighlight: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: Colors.surfaceLight,
    padding: 10,
    borderRadius: 8,
    marginTop: 12,
  },
  rateLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  rateValue: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.gold,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 6,
  },
  sectionSub: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 12,
  },
  eligibilityCard: {
    backgroundColor: Colors.surface,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 10,
  },
  eligItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  eligText: {
    fontSize: 13,
    color: Colors.text,
    flex: 1,
  },
  docItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 10,
  },
  docItemChecked: {
    backgroundColor: 'rgba(22, 163, 74, 0.08)',
    borderColor: Colors.primary,
  },
  docText: {
    fontSize: 13,
    color: Colors.text,
    flex: 1,
  },
  docTextChecked: {
    textDecorationLine: 'line-through',
    color: Colors.textSecondary,
  },
  infoCard: {
    backgroundColor: Colors.surface,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 20,
  },
  infoLabel: {
    fontSize: 11,
    color: Colors.textMuted,
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.surface,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  applyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
  },
  applyButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff',
  },
});
