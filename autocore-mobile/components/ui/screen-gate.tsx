import type { ComponentType } from 'react';
import { View } from 'react-native';

import type { IconProps } from '@/assets/icons';
import { LockIcon, StoreIcon } from '@/assets/icons';
import { layout, rhythm } from '@/theme';

import { EmptyState } from './empty-state';
import { Screen, ScreenScroll } from './screen';

type GateAction = {
  label: string;
  onPress: () => void;
};

type ScreenGateProps = {
  variant?: 'no-company' | 'no-permission' | 'custom';
  icon?: ComponentType<IconProps>;
  title: string;
  description: string;
  primaryAction?: GateAction;
  secondaryAction?: GateAction;
  tabBarInset?: boolean;
};

const VARIANT_ICON: Record<'no-company' | 'no-permission', ComponentType<IconProps>> = {
  'no-company': StoreIcon,
  'no-permission': LockIcon,
};

/**
 * Shared empty/permission gate — same EmptyState quality as Accounting.
 */
export function ScreenGate({
  variant = 'custom',
  icon,
  title,
  description,
  primaryAction,
  secondaryAction,
  tabBarInset = true,
}: ScreenGateProps) {
  const Icon =
    icon ??
    (variant === 'custom' ? LockIcon : VARIANT_ICON[variant]);

  return (
    <Screen>
      <ScreenScroll tabBarInset={tabBarInset} padded>
        <View
          style={{
            flexGrow: 1,
            justifyContent: 'center',
            paddingVertical: rhythm.section * 2,
            maxWidth: layout.contentMaxWidth,
            alignSelf: 'center',
            width: '100%',
          }}
        >
          <EmptyState
            icon={Icon}
            title={title}
            description={description}
            primaryAction={primaryAction}
            secondaryAction={secondaryAction}
          />
        </View>
      </ScreenScroll>
    </Screen>
  );
}
