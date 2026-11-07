import type { RecordStore } from '../../../storage/records';
import { createReminders, REMINDER_KIND, type NotificationPort, type Scheduled } from '../reminders';

function fixture() {
  const rows = new Map<string, unknown>();
  const scheduled = new Map<string, Scheduled>();
  const presented = new Map<string, Scheduled>();
  let id = 0;
  let allowed = true;
  let fail = false;
  const store: RecordStore = {
    async get<T>(scope: string, owner: string) {
      const row = rows.get(scope + owner);
      return row ? { value: structuredClone(row) as T, updatedAt: 0 } : null;
    },
    put: async (scope, owner, value) => {
      if (fail) throw new Error('Disk full');
      rows.set(scope + owner, structuredClone(value));
    },
    remove: async (scope, owner) => { rows.delete(scope + owner); },
    prune: async () => {},
  };
  const notifications: NotificationPort = {
    permission: async () => allowed,
    schedule: async (_title, _at, data) => {
      const key = String(++id);
      scheduled.set(key, { id: key, data });
      return key;
    },
    scheduled: async () => [...scheduled.values()],
    presented: async () => [...presented.values()],
    cancel: async (key) => { scheduled.delete(key); },
    dismiss: async (key) => { presented.delete(key); },
  };
  const service = (owner: string) => createReminders(store, notifications, owner, () => 1000);
  return { service, scheduled, presented, deny: () => { allowed = false; }, fail: () => { fail = true; } };
}

test('denied permission and past times leave no scheduled reminder', async () => {
  const testDevice = fixture();
  const reminders = testDevice.service('owner');
  testDevice.deny();
  expect(await reminders.schedule(7, 'A title', 2000)).toEqual({ status: 'denied' });
  await expect(reminders.schedule(7, 'A title', 900)).rejects.toThrow('future');
  expect(testDevice.scheduled.size).toBe(0);
});

test('editing replaces one reminder and removing the watch status cancels it', async () => {
  const testDevice = fixture();
  const reminders = testDevice.service('owner');
  await reminders.schedule(7, 'A title', 2000);
  await reminders.schedule(7, 'A title', 3000);
  expect([...testDevice.scheduled.keys()]).toEqual(['2']);
  expect(await reminders.reconcile(new Set([7]))).toEqual([{ animeId: 7, at: 3000, notificationId: '2' }]);
  expect(await reminders.reconcile(new Set())).toEqual([]);
  expect(testDevice.scheduled.size).toBe(0);
});

test('failed disk writes cancel the new alarm and keep the previous reminder', async () => {
  const testDevice = fixture();
  const reminders = testDevice.service('owner');
  await reminders.schedule(7, 'A title', 2000);
  testDevice.fail();
  await expect(reminders.schedule(7, 'A title', 3000)).rejects.toThrow('Disk full');
  expect([...testDevice.scheduled.keys()]).toEqual(['1']);
  expect(await reminders.reconcile(new Set([7]))).toEqual([{ animeId: 7, at: 2000, notificationId: '1' }]);
});

test('sign-out cancels and dismisses only reminders for that account', async () => {
  const testDevice = fixture();
  const alice = testDevice.service('alice');
  const bob = testDevice.service('bob');
  await alice.schedule(7, 'A title', 2000);
  await bob.schedule(7, 'A title', 3000);
  testDevice.presented.set('delivered-a', { id: 'delivered-a', data: { kind: REMINDER_KIND, owner: 'alice', animeId: 7 } });
  testDevice.presented.set('delivered-b', { id: 'delivered-b', data: { kind: REMINDER_KIND, owner: 'bob', animeId: 7 } });
  await alice.clear();
  expect([...testDevice.scheduled.keys()]).toEqual(['2']);
  expect([...testDevice.presented.keys()]).toEqual(['delivered-b']);
  expect(await alice.reconcile(new Set([7]))).toEqual([]);
  await expect(alice.schedule(7, 'A title', 4000)).rejects.toThrow('signed out');
});
