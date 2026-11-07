import type { NotificationPort } from './reminders';

export const deviceNotifications: NotificationPort | null = null;
export type ReminderResponse = { id: string; data: unknown };
export function watchNotificationResponses(_listener: (response: ReminderResponse) => void) { return () => {}; }
export function clearNotificationResponse() {}
