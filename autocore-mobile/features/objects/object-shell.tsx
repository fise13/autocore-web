import type { ReactNode } from 'react';
import { View } from 'react-native';
import type { Href } from 'expo-router';

import { StackScreen } from '@/components/ui';
import { Text } from '@/components/ui/text';
import { tokens } from '@/theme/tokens';

export type ObjectSection = {
  id: string;
  title: string;
  children: ReactNode;
};

type ObjectShellProps = {
  title: string;
  identifier?: string;
  status?: string;
  subtitle?: string;
  sections: ObjectSection[];
  actions?: ReactNode;
  backFallbackHref?: Href;
};

/**
 * Canonical object detail chrome — same engine/order/location shape from
 * Home, Work, Search, AI, and Warehouse.
 */
export function ObjectShell({
  title,
  identifier,
  status,
  subtitle,
  sections,
  actions,
  backFallbackHref,
}: ObjectShellProps) {
  return (
    <StackScreen
      title={title}
      subtitle={subtitle}
      backFallbackHref={backFallbackHref ?? ('/(tabs)/work' as Href)}
    >
      <View
        style={{
          paddingHorizontal: tokens.space.screenX,
          gap: tokens.space.micro,
        }}
      >
        {identifier ? (
          <Text variant="identifier" color="muted">
            {identifier}
          </Text>
        ) : null}
        {status ? (
          <Text variant="subheadline" color="muted">
            {status}
          </Text>
        ) : null}
      </View>

      {sections.map((section) => (
        <View
          key={section.id}
          style={{
            paddingHorizontal: tokens.space.screenX,
            gap: tokens.space.inline,
          }}
        >
          <Text variant="sectionLabel" color="muted">
            {section.title}
          </Text>
          {section.children}
        </View>
      ))}

      {actions ? (
        <View
          style={{
            paddingHorizontal: tokens.space.screenX,
            gap: tokens.space.inline,
          }}
        >
          {actions}
        </View>
      ) : null}
    </StackScreen>
  );
}
