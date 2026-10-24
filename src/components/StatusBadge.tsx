import { StyleSheet, Text, View } from 'react-native';
import { WATCH_STATUS_LABEL, type WatchStatus } from '../features/catalog/types';
import { radius, statusColors } from '../theme';

export function StatusBadge({ status }: { status: WatchStatus }) {
  const { text, background } = statusColors[status];
  return (
    <View style={[styles.badge, { backgroundColor: background }]}>
      <Text style={[styles.text, { color: text }]}>{WATCH_STATUS_LABEL[status]}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { alignSelf: 'flex-start', borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 2 },
  text: { fontSize: 11, fontWeight: '600' },
});
