import { useState } from 'react';
import { Modal, Pressable, View, ScrollView } from 'react-native';

import { useTheme } from '@/hooks';
import { ChevronDownIcon, CheckIcon } from '@/assets/icons';
import { haptics, radius, spacing, zIndex } from '@/theme';
import { Text } from './text';

type DropdownOption = {
  value: string;
  label: string;
};

type DropdownProps = {
  value: string;
  onValueChange: (value: string) => void;
  options: DropdownOption[];
  placeholder?: string;
};

export function Dropdown({ value, onValueChange, options, placeholder = 'Select...' }: DropdownProps) {
  const { colors, shadows } = useTheme();
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);

  return (
    <>
      <Pressable
        onPress={() => {
          haptics.light();
          setOpen(true);
        }}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          height: 36,
          paddingHorizontal: spacing[2.5],
          borderRadius: radius.lg,
          borderWidth: 1,
          borderColor: colors.input,
          backgroundColor: colors.background,
        }}
      >
        <Text variant="body" color={selected ? 'primary' : 'muted'}>
          {selected?.label ?? placeholder}
        </Text>
        <ChevronDownIcon size="sm" color={colors.mutedForeground} />
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable
          style={{ flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end' }}
          onPress={() => setOpen(false)}
        >
          <View
            style={{
              backgroundColor: colors.card,
              borderTopLeftRadius: radius['2xl'],
              borderTopRightRadius: radius['2xl'],
              maxHeight: '50%',
              ...shadows.elevated,
            }}
          >
            <ScrollView>
              {options.map((option) => {
                const isSelected = option.value === value;
                return (
                  <Pressable
                    key={option.value}
                    onPress={() => {
                      haptics.selection();
                      onValueChange(option.value);
                      setOpen(false);
                    }}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      paddingHorizontal: spacing[4],
                      paddingVertical: spacing[3],
                      borderBottomWidth: 1,
                      borderBottomColor: colors.borderMuted,
                    }}
                  >
                    <Text variant="body">{option.label}</Text>
                    {isSelected ? <CheckIcon size="sm" color={colors.primary} /> : null}
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
    </>
  );
}
