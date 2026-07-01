import { Platform, Pressable, View } from 'react-native';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useState } from 'react';

import { useTheme } from '@/hooks';
import { haptics, radius, spacing } from '@/theme';
import { Text } from './text';

type DatePickerProps = {
  value: Date;
  onChange: (date: Date) => void;
  mode?: 'date' | 'time' | 'datetime';
  label?: string;
};

export function DatePicker({ value, onChange, mode = 'date', label }: DatePickerProps) {
  const { colors } = useTheme();
  const [show, setShow] = useState(false);

  const formatted = value.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  const handleChange = (_: DateTimePickerEvent, date?: Date) => {
    setShow(Platform.OS === 'ios');
    if (date) {
      haptics.selection();
      onChange(date);
    }
  };

  return (
    <View style={{ gap: spacing[1] }}>
      {label ? <Text variant="label" color="muted">{label}</Text> : null}
      <Pressable
        onPress={() => {
          haptics.light();
          setShow(true);
        }}
        style={{
          height: 36,
          justifyContent: 'center',
          paddingHorizontal: spacing[2.5],
          borderRadius: radius.lg,
          borderWidth: 1,
          borderColor: colors.input,
          backgroundColor: colors.background,
        }}
      >
        <Text variant="body">{formatted}</Text>
      </Pressable>

      {show ? (
        <DateTimePicker value={value} mode={mode} display={Platform.OS === 'ios' ? 'spinner' : 'default'} onChange={handleChange} />
      ) : null}
    </View>
  );
}
