import type { ReactNode } from 'react';
import { View } from 'react-native';

import { MetaRow, SettingsSectionCard } from '@/components/ui';
import { rhythm } from '@/theme';

type ProfileMetaCardProps = {
  title?: string;
  description?: string;
  children: ReactNode;
  delay?: number;
  tone?: 'default' | 'danger';
};

/** Settings section card — web/Stripe preferences pattern. */
export function ProfileMetaCard({ title, description, children, tone }: ProfileMetaCardProps) {
  return (
    <SettingsSectionCard title={title} description={description} tone={tone}>
      <View
        style={{
          paddingHorizontal: rhythm.cardPadX,
          paddingBottom: 10,
          gap: rhythm.tight,
        }}
      >
        {children}
      </View>
    </SettingsSectionCard>
  );
}

export { MetaRow as ProfileMetaRow };
