import type { ReactNode } from 'react';
import { View } from 'react-native';

import { MetaRow, Surface, Text } from '@/components/ui';
import { rhythm } from '@/theme';

type SettingsCardProps = {
  title?: string;
  subtitle?: string;
  children: ReactNode;
  delay?: number;
};

export function SettingsCard({ title, subtitle, children }: SettingsCardProps) {
  return (
    <Surface inset>
      {title ? (
        <View style={{ gap: rhythm.micro }}>
          <Text variant="bodyStrong">{title}</Text>
          {subtitle ? (
            <Text variant="caption" color="muted">
              {subtitle}
            </Text>
          ) : null}
        </View>
      ) : null}
      {children}
    </Surface>
  );
}

export { MetaRow as SettingsValueRow };
