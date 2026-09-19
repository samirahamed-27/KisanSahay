import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Configure notification behavior when app is foregrounded
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export const NotificationService = {
  async registerForPushNotifications(): Promise<string | null> {
    try {
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'KisanSahay Updates',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#16a34a',
        });
      }

      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.log('[Notifications] Permission not granted');
        return null;
      }

      const tokenData = await Notifications.getExpoPushTokenAsync();
      return tokenData.data;
    } catch (e) {
      console.warn('[Notifications] Failed to get push token:', e);
      return null;
    }
  },

  async scheduleEmiReminder(loanName: string, emiAmount: number, dueDate: string): Promise<string | null> {
    try {
      const targetDate = new Date(dueDate);
      const reminderDate = new Date(targetDate.getTime() - 3 * 24 * 60 * 60 * 1000); // 3 days before
      const now = new Date();

      if (reminderDate > now) {
        const secondsUntil = Math.max(5, Math.floor((reminderDate.getTime() - now.getTime()) / 1000));
        const identifier = await Notifications.scheduleNotificationAsync({
          content: {
            title: `🌾 EMI Reminder: ${loanName}`,
            body: `Your monthly EMI of ₹${emiAmount.toLocaleString('en-IN')} is due on ${dueDate}. Tap to view details.`,
            data: { type: 'emi_reminder', loanName, emiAmount },
          },
          trigger: { seconds: secondsUntil },
        });
        return identifier;
      }
    } catch (e) {
      console.warn('[Notifications] Failed to schedule reminder:', e);
    }
    return null;
  },

  async sendLocalAlert(title: string, body: string): Promise<void> {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          sound: true,
        },
        trigger: null, // send immediately
      });
    } catch (e) {
      console.warn('[Notifications] Failed to trigger local alert:', e);
    }
  },
};
