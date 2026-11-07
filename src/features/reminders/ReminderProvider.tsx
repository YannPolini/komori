import { router, useRootNavigationState } from 'expo-router';
import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';
import { records } from '../../storage/store';
import { useLibrary } from '../library/LibraryProvider';
import { clearNotificationResponse, deviceNotifications, watchNotificationResponses, type ReminderResponse } from './platform';
import { createReminders, reminderData, type Reminder } from './reminders';

interface RemindersValue {
  available: boolean;
  reminders: Reminder[];
  schedule(animeId: number, title: string, at: number): Promise<boolean>;
  cancel(animeId: number): Promise<void>;
  clear(): Promise<void>;
}

const ReminderContext = createContext<RemindersValue | null>(null);

export function ReminderProvider({ owner, children }: { owner: string; children: ReactNode }) {
  const library = useLibrary();
  const navigation = useRootNavigationState();
  const current = useRef(library.state);
  current.current = library.state;
  const loading = library.state.status === 'loading';
  const savedKey = library.state.status === 'ready' ? Object.keys(library.state.profile.statuses).join(',') : null;
  const service = useMemo(() => deviceNotifications ? createReminders(records, deviceNotifications, owner) : null, [owner]);
  const [items, setItems] = useState<Reminder[]>([]);
  const [response, setResponse] = useState<ReminderResponse | null>(null);
  const lastResponse = useRef<string | null>(null);

  useEffect(() => {
    if (!service) return;
    return watchNotificationResponses((incoming) => {
      if (reminderData(incoming.data)) setResponse(incoming);
    });
  }, [service]);

  useEffect(() => {
    if (!response || !navigation?.key || loading || lastResponse.current === response.id) return;
    lastResponse.current = response.id;
    const data = reminderData(response.data);
    const state = current.current;
    if (data?.owner === owner && state.status === 'ready' && state.profile.statuses[data.animeId]) {
      router.push({ pathname: '/anime/[id]', params: { id: String(data.animeId) } });
    } else router.navigate('/');
    clearNotificationResponse();
    setResponse(null);
  }, [response, navigation?.key, loading, savedKey, owner]);

  useEffect(() => {
    if (!service || savedKey === null) return;
    let active = true;
    const saved = new Set(savedKey ? savedKey.split(',').map(Number) : []);
    const refresh = () => {
      void service.reconcile(saved).then((next) => { if (active) setItems(next); }, () => {});
    };
    refresh();
    const listener = AppState.addEventListener('change', (status) => { if (status === 'active') refresh(); });
    return () => {
      active = false;
      listener.remove();
    };
  }, [savedKey, service]);

  const value: RemindersValue = {
    available: service !== null,
    reminders: items,
    async schedule(animeId, title, at) {
      const state = current.current;
      if (!service || state.status !== 'ready' || !state.profile.statuses[animeId]) {
        throw new Error('Save this title to a watch list before setting a reminder.');
      }
      const result = await service.schedule(animeId, title, at);
      if (result.status === 'denied') return false;
      setItems(result.reminders);
      return true;
    },
    async cancel(animeId) { if (service) setItems(await service.cancel(animeId)); },
    async clear() { await service?.clear(); },
  };

  return <ReminderContext.Provider value={value}>{children}</ReminderContext.Provider>;
}

export function useReminders() {
  const value = useContext(ReminderContext);
  if (!value) throw new Error('useReminders must be used inside ReminderProvider');
  return value;
}
