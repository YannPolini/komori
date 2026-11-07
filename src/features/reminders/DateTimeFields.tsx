import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { Platform } from 'react-native';
import { Button } from '../../components/Button';

interface Props {
  value: Date;
  onChange(value: Date): void;
  disabled: boolean;
}

export function DateTimeFields({ value, onChange, disabled }: Props) {
  const choose = (mode: 'date' | 'time') => DateTimePickerAndroid.open({
    value,
    mode,
    ...(mode === 'date' ? { minimumDate: new Date() } : { is24Hour: true }),
    onChange(event, selected) {
      if (event.type !== 'set' || !selected) return;
      const next = new Date(value);
      if (mode === 'date') next.setFullYear(selected.getFullYear(), selected.getMonth(), selected.getDate());
      else next.setHours(selected.getHours(), selected.getMinutes(), 0, 0);
      onChange(next);
    },
  });

  if (Platform.OS === 'android') {
    return (
      <>
        <Button label="Choose date" variant="outline" disabled={disabled} onPress={() => choose('date')} />
        <Button label="Choose time" variant="outline" disabled={disabled} onPress={() => choose('time')} />
      </>
    );
  }
  return <DateTimePicker value={value} mode="datetime" minimumDate={new Date()} disabled={disabled}
    onChange={(_event, next) => { if (next) onChange(next); }} />;
}
