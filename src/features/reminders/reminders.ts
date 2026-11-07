import type { RecordStore } from '../../storage/records';

export const REMINDER_KIND = 'komori-watch-reminder';

export interface Reminder {
  animeId: number;
  at: number;
  notificationId: string;
}

export interface ReminderData {
  kind: typeof REMINDER_KIND;
  owner: string;
  animeId: number;
}

export interface Scheduled {
  id: string;
  data: unknown;
}

export interface NotificationPort {
  permission(): Promise<boolean>;
  schedule(title: string, at: number, data: ReminderData): Promise<string>;
  scheduled(): Promise<Scheduled[]>;
  presented(): Promise<Scheduled[]>;
  cancel(id: string): Promise<void>;
  dismiss(id: string): Promise<void>;
}

export function reminderData(value: unknown): ReminderData | null {
  if (!value || typeof value !== 'object' || !('kind' in value) || value.kind !== REMINDER_KIND ||
      !('owner' in value) || typeof value.owner !== 'string' ||
      !('animeId' in value) || typeof value.animeId !== 'number' ||
      !Number.isSafeInteger(value.animeId) || value.animeId <= 0) return null;
  return { kind: REMINDER_KIND, owner: value.owner, animeId: value.animeId };
}

export function createReminders(store: RecordStore, platform: NotificationPort, owner: string, now = Date.now) {
  const scope = 'watch-reminders';
  let retired = false;
  let tail: Promise<unknown> = Promise.resolve();
  function serial<T>(operation: () => Promise<T>): Promise<T> {
    const next = tail.then(operation);
    tail = next.catch(() => {});
    return next;
  }
  const read = async () => (await store.get<Reminder[]>(scope, owner))?.value ?? [];
  const write = (items: Reminder[]) => store.put(scope, owner, items);
  const mine = (item: Scheduled) => reminderData(item.data)?.owner === owner;
  async function removeNotifications(id: string) {
    await platform.cancel(id);
    await platform.dismiss(id);
  }

  return {
    schedule: (animeId: number, title: string, at: number) => serial(async () => {
      if (retired) throw new Error('This library has been signed out');
      if (!Number.isFinite(at) || at <= now()) throw new Error('Choose a time in the future.');
      if (!await platform.permission()) return { status: 'denied' } as const;
      if (at <= now()) throw new Error('Choose a time in the future.');
      const original = await read();
      const previous = original.find((entry) => entry.animeId === animeId);
      const notificationId = await platform.schedule(title, at, { kind: REMINDER_KIND, owner, animeId });
      const next = [...original.filter((entry) => entry.animeId !== animeId), { animeId, at, notificationId }];
      try {
        await write(next);
      } catch (error) {
        await removeNotifications(notificationId).catch(() => {});
        throw error;
      }
      if (previous) {
        try {
          await platform.cancel(previous.notificationId);
        } catch (error) {
          // Preserve the previous schedule if replacing it did not finish.
          await removeNotifications(notificationId).catch(() => {});
          await write(original);
          throw error;
        }
        await platform.dismiss(previous.notificationId).catch(() => {});
      }
      return { status: 'scheduled', reminders: next } as const;
    }),

    cancel: (animeId: number) => serial(async () => {
      if (retired) return [];
      const items = await read();
      const matched = (item: Scheduled) => {
        const data = reminderData(item.data);
        return data?.owner === owner && data.animeId === animeId;
      };
      const [scheduled, presented] = await Promise.all([platform.scheduled(), platform.presented()]);
      for (const id of new Set([
        ...items.filter((item) => item.animeId === animeId).map((item) => item.notificationId),
        ...scheduled.filter(matched).map((item) => item.id),
      ])) await removeNotifications(id);
      for (const item of presented.filter(matched)) await platform.dismiss(item.id);
      const next = items.filter((item) => item.animeId !== animeId);
      await write(next);
      return next;
    }),

    reconcile: (saved: ReadonlySet<number>) => serial(async () => {
      if (retired) return [];
      const [items, scheduled, presented] = await Promise.all([read(), platform.scheduled(), platform.presented()]);
      const live = new Map(scheduled.filter(mine).map((item) => [item.id, reminderData(item.data)?.animeId]));
      const next = items.filter((item) => live.get(item.notificationId) === item.animeId && saved.has(item.animeId));
      const kept = new Set(next.map((item) => item.notificationId));
      for (const id of live.keys()) if (!kept.has(id)) await platform.cancel(id);
      for (const item of presented.filter(mine)) {
        const data = reminderData(item.data);
        if (data && !saved.has(data.animeId)) await platform.dismiss(item.id);
      }
      if (next.length !== items.length) await write(next);
      return next;
    }),

    clear: () => serial(async () => {
      retired = true;
      const [items, scheduled, presented] = await Promise.all([read(), platform.scheduled(), platform.presented()]);
      for (const id of new Set([...items.map((item) => item.notificationId), ...scheduled.filter(mine).map((item) => item.id)])) {
        await removeNotifications(id);
      }
      for (const item of presented.filter(mine)) await platform.dismiss(item.id);
      await store.remove(scope, owner);
    }),
  };
}
