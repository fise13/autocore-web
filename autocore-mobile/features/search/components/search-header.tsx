import Reanimated from 'react-native-reanimated';

import { SettingsIcon } from '@/assets/icons';
import { IconButton, PageHeader } from '@/components/ui';
import { useTheme } from '@/hooks';
import { haptics } from '@/theme';

import { searchTimeline, useSearchEnter } from '../animation';

type SearchHeaderProps = {
  onSettingsPress?: () => void;
};

export function SearchHeader({ onSettingsPress }: SearchHeaderProps) {
  const { colors } = useTheme();
  const enterStyle = useSearchEnter({ delay: searchTimeline.header, translateY: 8, duration: 320 });

  return (
    <Reanimated.View style={enterStyle}>
      <PageHeader
        title="Search"
        subtitle="Quick access to inventory, motors, and orders"
        trailing={
          <IconButton
            accessibilityLabel="Settings"
            variant="ghost"
            size="sm"
            systemImage="gearshape"
            onPress={() => {
              haptics.light();
              onSettingsPress?.();
            }}
          >
            <SettingsIcon size="sm" color={colors.mutedForeground} strokeWidth={1.5} />
          </IconButton>
        }
      />
    </Reanimated.View>
  );
}
