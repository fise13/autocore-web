import { type ReactNode } from 'react';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { View } from 'react-native';

import { HorizontalFilterBar } from '@/components/ui';
import { useReducedMotion } from '@/hooks';

import { ACCOUNTING_TABS, type AccountingTab } from '../constants/tabs';
import { ac } from '../layout';

type AcTabBarProps = {
  value: AccountingTab;
  onChange: (tab: AccountingTab) => void;
};

export function AcTabBar({ value, onChange }: AcTabBarProps) {
  return (
    <HorizontalFilterBar
      options={ACCOUNTING_TABS}
      value={value}
      onChange={onChange}
    />
  );
}

type AcTabPanelProps = {
  tab: AccountingTab;
  children: ReactNode;
};

export function AcTabPanel({ tab, children }: AcTabPanelProps) {
  const reducedMotion = useReducedMotion();

  if (reducedMotion) {
    return <View key={tab}>{children}</View>;
  }

  return (
    <Animated.View
      key={tab}
      entering={FadeIn.duration(200)}
      exiting={FadeOut.duration(140)}
      style={{ gap: ac.section }}
    >
      {children}
    </Animated.View>
  );
}
