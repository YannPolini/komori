import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { LogBox, Platform } from 'react-native';
import { REMINDER_KIND, type NotificationPort } from './reminders';

const channelId = 'watch-reminders';

// Expo Go warns about remote push when the library loads. Komori only uses
// local notifications, so that particular development warning is irrelevant.
if (__DEV__ && Platform.OS === 'android' && Constants.executionEnvironment === ExecutionEnvironment.StoreClient) {
  LogBox.ignoreLogs(['expo-notifications: Android Push notifications']);
}

Notifications.setNotificationHandler({
  handleNotification: async ({ request }) => {
    const isWatchReminder = request.content.data?.kind === REMINDER_KIND;
    return {
      shouldShowBanner: isWatchReminder,
      shouldShowList: isWatchReminder,
      shouldPlaySound: isWatchReminder,
      shouldSetBadge: false,
    };
  },
});

export const deviceNotifications: NotificationPort | null = {
  async permission() {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync(channelId, {
        name: 'Watch reminders',
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }
    const current = await Notifications.getPermissionsAsync();
    const allowed = (value: Notifications.NotificationPermissionsStatus) => value.granted ||
      value.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;
    const granted = allowed(current) || (current.canAskAgain && allowed(await Notifications.requestPermissionsAsync()));
    if (!granted) return false;
    if (Platform.OS === 'android') {
      const channel = await Notifications.getNotificationChannelAsync(channelId);
      if (channel?.importance === Notifications.AndroidImportance.NONE) return false;
    }
    return true;
  },
  schedule: (title, at, data) => Notifications.scheduleNotificationAsync({
    content: { title: 'Komori watch reminder', body: title, data: { ...data }, sound: 'default' },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: at, channelId },
  }),
  scheduled: async () => (await Notifications.getAllScheduledNotificationsAsync())
    .map((request) => ({ id: request.identifier, data: request.content.data })),
  presented: async () => (await Notifications.getPresentedNotificationsAsync())
    .map(({ request }) => ({ id: request.identifier, data: request.content.data })),
  cancel: Notifications.cancelScheduledNotificationAsync,
  dismiss: Notifications.dismissNotificationAsync,
};

export type ReminderResponse = { id: string; data: unknown };

export function watchNotificationResponses(listener: (response: ReminderResponse) => void) {
  const notify = (response: Notifications.NotificationResponse) => {
    const { request } = response.notification;
    listener({ id: request.identifier, data: request.content.data });
  };
  const subscription = Notifications.addNotificationResponseReceivedListener(notify);
  const last = Notifications.getLastNotificationResponse();
  if (last) notify(last);
  return () => subscription.remove();
}

export const clearNotificationResponse = Notifications.clearLastNotificationResponse;
