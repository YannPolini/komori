import { useRef, useState } from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';
import { Button } from '../../components/Button';
import { colors, spacing } from '../../theme';
import { DateTimeFields } from './DateTimeFields';
import { useReminders } from './ReminderProvider';

const format = (date: Date) => date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });

export function ReminderControls({ animeId, title }: { animeId: number; title: string }) {
  const reminders = useReminders();
  const active = reminders.reminders.find((item) => item.animeId === animeId);
  const [draft, setDraft] = useState<Date | null>(null);
  const [busy, setBusy] = useState(false);
  const working = useRef(false);
  const [error, setError] = useState('');
  const [denied, setDenied] = useState(false);

  function edit() {
    const initial = new Date(active?.at ?? Date.now() + 60 * 60 * 1000);
    initial.setSeconds(0, 0);
    setDraft(initial);
    setDenied(false);
    setError('');
  }

  async function save() {
    if (!draft || working.current) return;
    if (draft.getTime() <= Date.now()) {
      setError('Choose a time in the future.');
      return;
    }
    working.current = true;
    setBusy(true);
    setError('');
    setDenied(false);
    try {
      const scheduled = await reminders.schedule(animeId, title, draft.getTime());
      if (scheduled) setDraft(null);
      else {
        setDenied(true);
        setError('Notifications are off. You can still track this title.');
      }
    } catch {
      setError('The reminder could not be scheduled. Try again.');
    } finally {
      working.current = false;
      setBusy(false);
    }
  }

  async function cancel() {
    if (working.current) return;
    working.current = true;
    setBusy(true);
    setError('');
    try {
      await reminders.cancel(animeId);
      setDraft(null);
    } catch {
      setError('The reminder could not be cancelled. Try again.');
    } finally {
      working.current = false;
      setBusy(false);
    }
  }

  return (
    <View style={styles.group}>
      <Text style={styles.heading} accessibilityRole="header">Watch reminder</Text>
      {!reminders.available ? <Text style={styles.meta}>Reminders are available in the mobile app.</Text> : (
        <>
          <Text style={styles.meta} accessibilityLiveRegion="polite">
            {active ? `Scheduled for ${format(new Date(active.at))}` : 'Not scheduled'}
          </Text>
          {draft ? (
            <>
              <Text style={styles.meta}>{format(draft)}</Text>
              <DateTimeFields value={draft} onChange={setDraft} disabled={busy} />
              <Button label="Save reminder" onPress={() => void save()} disabled={busy} />
              <Button label="Cancel edit" variant="outline" disabled={busy} onPress={() => { setDraft(null); setError(''); setDenied(false); }} />
            </>
          ) : (
            <Button label={active ? 'Edit reminder' : 'Set reminder'} variant="outline" disabled={busy} onPress={edit} />
          )}
          {active && <Button label="Cancel reminder" variant="outline" disabled={busy} onPress={() => void cancel()} />}
          {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
          {denied && <Button label="Open system settings" variant="outline"
            onPress={() => void Linking.openSettings().catch(() => setError('Open notification settings from your device.'))} />}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  group: { gap: spacing.sm, marginTop: spacing.sm },
  heading: { fontSize: 20, fontWeight: '700', color: colors.text },
  meta: { fontSize: 14, color: colors.textMuted },
  error: { fontSize: 14, color: colors.danger },
});
