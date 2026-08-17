import { View } from 'react-native';

import { ChevronRightIcon } from '@/assets/icons';
import { Text } from '@/components/ui';
import { useTheme } from '@/hooks';
import { radius, spacing } from '@/theme';

import { JourneyOptionCard } from './journey-option-card';

type WorkspacePathCardProps = {
  index: number;
  title: string;
  description: string;
  icon: React.ReactNode;
  emphasized?: boolean;
  onPress: () => void;
};

export function WorkspacePathCard({
  index,
  title,
  description,
  icon,
  emphasized = false,
  onPress,
}: WorkspacePathCardProps) {
  const { colors, tones } = useTheme();

  return (
    <JourneyOptionCard
      index={index}
      onPress={onPress}
      accessibilityLabel={`${title}. ${description}`}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing[3.5],
        paddingVertical: spacing[4],
        paddingHorizontal: spacing[4],
        borderRadius: radius['2xl'],
        borderWidth: 1,
        borderColor: emphasized ? tones.primary.border : colors.border,
        backgroundColor: emphasized ? tones.primary.bg : colors.card,
        minHeight: 88,
      }}
    >
      <View
        style={{
          width: 44,
          height: 44,
          borderRadius: radius.lg,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: emphasized ? colors.primary : colors.background,
          borderWidth: emphasized ? 0 : 1,
          borderColor: colors.border,
        }}
      >
        {icon}
      </View>
      <View style={{ flex: 1, gap: 4 }}>
        <Text
          variant="body"
          style={{
            fontWeight: '700',
            fontSize: 17,
            letterSpacing: -0.3,
            color: colors.foreground,
          }}
        >
          {title}
        </Text>
        <Text
          variant="caption"
          style={{
            fontSize: 14,
            lineHeight: 19,
            color: colors.mutedForeground,
          }}
        >
          {description}
        </Text>
      </View>
      <ChevronRightIcon
        size="sm"
        color={emphasized ? tones.primary.fg : colors.mutedForeground}
      />
    </JourneyOptionCard>
  );
}
