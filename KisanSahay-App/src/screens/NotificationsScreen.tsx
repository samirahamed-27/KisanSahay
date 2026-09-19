import React, { useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { Colors } from '../theme/colors';

interface NotificationItem {
  id: string;
  title: string;
  body: string;
  time: string;
  type: 'emi' | 'scheme' | 'system';
  isRead: boolean;
}

export const NotificationsScreen: React.FC = () => {
  const navigation = useNavigation();

  const [notifications, setNotifications] = useState<NotificationItem[]>([
    {
      id: 'notif_1',
      title: '🌾 Upcoming EMI Reminder',
      body: 'Your KCC loan monthly installment of ₹4,432 is due in 3 days (15th Oct). Please ensure sufficient balance.',
      time: '2 hours ago',
      type: 'emi',
      isRead: false,
    },
    {
      id: 'notif_2',
      title: '📢 New State Scheme: PM-KUSUM Component B',
      body: 'Subsidies up to 60% are now live for standalone solar agricultural irrigation pumps in Uttar Pradesh.',
      time: 'Yesterday',
      type: 'scheme',
      isRead: false,
    },
    {
      id: 'notif_3',
      title: '✅ Document Vault Encrypted',
      body: 'Your Aadhaar Card and Khasra documents are safely encrypted with your biometric PIN.',
      time: '3 days ago',
      type: 'system',
      isRead: true,
    },
  ]);

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  const markSingleRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
  };

  return (
    <View style={styles.container}>
      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        <TouchableOpacity onPress={markAllRead}>
          <Text style={styles.markReadText}>Mark all read</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <TouchableOpacity
            activeOpacity={0.8}
            style={[styles.card, !item.isRead && styles.cardUnread]}
            onPress={() => markSingleRead(item.id)}
          >
            <View style={styles.iconBox}>
              <MaterialCommunityIcons
                name={item.type === 'emi' ? 'clock-alert-outline' : item.type === 'scheme' ? 'bullhorn-outline' : 'shield-check'}
                size={22}
                color={item.type === 'emi' ? Colors.gold : Colors.primaryLight}
              />
            </View>
            <View style={{ flex: 1 }}>
              <View style={styles.cardHeader}>
                <Text style={[styles.cardTitle, !item.isRead && styles.titleUnread]}>
                  {item.title}
                </Text>
                <Text style={styles.timeText}>{item.time}</Text>
              </View>
              <Text style={styles.cardBody}>{item.body}</Text>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="bell-sleep-outline" size={48} color={Colors.textMuted} />
            <Text style={styles.emptyTitle}>No Notifications</Text>
            <Text style={styles.emptySub}>You are all caught up on your schemes and EMIs.</Text>
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
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
  },
  markReadText: {
    fontSize: 12,
    color: Colors.primaryLight,
    fontWeight: '600',
  },
  list: {
    padding: 16,
  },
  card: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 12,
  },
  cardUnread: {
    backgroundColor: 'rgba(22, 163, 74, 0.08)',
    borderColor: Colors.primary,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    flex: 1,
    marginRight: 6,
  },
  titleUnread: {
    fontWeight: '800',
    color: Colors.text,
  },
  timeText: {
    fontSize: 10,
    color: Colors.textMuted,
  },
  cardBody: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
    marginTop: 10,
  },
  emptySub: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 4,
  },
});
