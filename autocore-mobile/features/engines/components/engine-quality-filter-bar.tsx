import { Pressable, ScrollView } from 'react-native';

import { Text } from '@/components/ui';
import { useTheme } from '@/hooks';
import { haptics } from '@/theme';
import type { MotorQualityGrade } from '@autocore/engine-intake';

import { eng, engFontCap, engType } from '../layout';
import {
  ENGINE_QUALITY_GRADE_MARKS,
  engineQualityGradeLabel,
} from '../lib/engine-quality';

export type EngineQualityFilterValue = MotorQualityGrade | 'all';

type EngineQualityFilterBarProps = {
  value: EngineQualityFilterValue;
  onChange: (next: EngineQualityFilterValue) => void;
};

type Segment = {
  value: EngineQualityFilterValue;
  label: string;
};

const SEGMENTS: Segment[] = [
  { value: 'all', label: 'All' },
  ...ENGINE_QUALITY_GRADE_MARKS.map((grade) => ({
    value: grade,
    label: engineQualityGradeLabel(grade),
  })),
];

/**
 * Yard quality — a row of document tabs.
 *
 * A unit has exactly one grade, so this is a picker, not a multi-select.
 * Selected ink is charcoal on the canvas; the rest stays muted. No sliding
 * thumb: a control that overshoots reads as a toy on a screen someone uses
 * two hundred times a day.
 */
export function EngineQualityFilterBar({ value, onChange }: EngineQualityFilterBarProps) {
  const { colors } = useTheme();

  return (
    <ScrollView
      horizontal
      accessibilityRole="tablist"
      accessibilityLabel="Filter by quality"
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: eng.stack,
      }}
    >
      {SEGMENTS.map((segment) => {
        const selected = segment.value === value;

        return (
          <Pressable
            key={segment.value}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            accessibilityLabel={
              segment.value === 'all'
                ? 'All qualities'
                : `Quality ${segment.value}, ${segment.label}`
            }
            hitSlop={{ top: 8, bottom: 8 }}
            onPress={() => {
              if (selected) return;
              haptics.selection();
              onChange(segment.value);
            }}
            style={{
              paddingBottom: 6,
              borderBottomWidth: eng.rule,
              borderBottomColor: selected ? colors.foreground : 'transparent',
            }}
          >
            <Text
              variant="caption1"
              numberOfLines={1}
              maxFontSizeMultiplier={engFontCap.control}
              style={{
                ...engType.control,
                fontWeight: selected ? '600' : '500',
                letterSpacing: 0.5,
                textTransform: 'uppercase',
                color: selected ? colors.foreground : colors.mutedForeground,
              }}
            >
              {segment.label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
