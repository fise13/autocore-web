import { memo } from 'react';
import { View, Pressable, Text } from 'react-native';

import { workOsColors } from '../tokens/colors';
import { workOsType } from '../tokens/typography';
import { workOsSpace, workOsRadius } from '../tokens/space';

export type RangeSegmentProps = {
  options: { id: string; label: string }[];
  value: string;
  onChange: (id: string) => void;
  scheme?: 'light' | 'dark';
};

export const RangeSegment = memo(function RangeSegment({
  options,
  value,
  onChange,
  scheme = 'light',
}: RangeSegmentProps) {
  const colors = workOsColors(scheme);
  return (
    <View style={{ flexDirection: 'row', backgroundColor: colors.chip, borderRadius: workOsRadius.md, padding: 3, marginHorizontal: workOsSpace.screenX }}>
      {options.map((opt) => {
        const active = opt.id === value;
        return (
          <Pressable
            key={opt.id}
            onPress={() => onChange(opt.id)}
            style={{
              flex: 1,
              paddingVertical: 8,
              borderRadius: workOsRadius.sm,
              backgroundColor: active ? colors.surface : 'transparent',
              alignItems: 'center',
            }}
          >
            <Text style={[workOsType.chip, { color: active ? colors.ink : colors.inkMuted }]}>{opt.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
});
