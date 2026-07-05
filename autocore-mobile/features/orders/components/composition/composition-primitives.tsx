import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';

import { Text } from '@/components/ui';
import { useTheme } from '@/hooks';
import { ordersLayout } from '../../layout';

export function CompositionField({
  label,
  required,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <View style={{ gap: 6, flex: 1 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <Text variant="caption" color="muted" style={{ fontSize: 12, fontWeight: '500' }}>
          {label}
          {required ? ' *' : ''}
        </Text>
        {hint ? (
          <Text variant="caption" color="muted" style={{ fontSize: 10 }}>
            {hint}
          </Text>
        ) : null}
      </View>
      {children}
    </View>
  );
}

export function CompositionAddCard({
  title,
  description,
  children,
  footer,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const { colors } = useTheme();

  return (
    <View
      style={{
        borderRadius: ordersLayout.radius,
        borderWidth: 1,
        borderStyle: 'dashed',
        borderColor: colors.border,
        padding: 16,
        gap: 12,
      }}
    >
      <View style={{ gap: 4 }}>
        <Text variant="bodyStrong" style={{ fontSize: 14, fontWeight: '600' }}>
          {title}
        </Text>
        {description ? (
          <Text variant="caption" color="muted" style={{ fontSize: 12, lineHeight: 16 }}>
            {description}
          </Text>
        ) : null}
      </View>
      {children}
      {footer}
    </View>
  );
}

export function CompositionLineList({
  empty,
  items,
  onRemove,
}: {
  empty: string;
  items: Array<{ id: string; label: string }>;
  onRemove: (id: string) => void;
}) {
  const { colors } = useTheme();

  if (items.length === 0) {
    return (
      <Text variant="caption" color="muted" style={{ textAlign: 'center', paddingVertical: 20, fontSize: 13 }}>
        {empty}
      </Text>
    );
  }

  return (
    <View
      style={{
        borderRadius: ordersLayout.radius,
        borderWidth: ordersLayout.hairline,
        borderColor: colors.border,
        overflow: 'hidden',
      }}
    >
      {items.map((item, index) => (
        <View key={item.id}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 10,
              paddingHorizontal: 14,
              paddingVertical: 12,
            }}
          >
            <Text variant="body" style={{ flex: 1, fontSize: 13, lineHeight: 18 }}>
              {item.label}
            </Text>
            <Pressable accessibilityRole="button" onPress={() => onRemove(item.id)} hitSlop={8}>
              <Text variant="caption" style={{ fontSize: 12, fontWeight: '600', color: colors.destructive }}>
                Удалить
              </Text>
            </Pressable>
          </View>
          {index < items.length - 1 ? (
            <View style={{ height: ordersLayout.hairline, backgroundColor: colors.border, marginLeft: 14 }} />
          ) : null}
        </View>
      ))}
    </View>
  );
}

export function CompositionRow({ children }: { children: ReactNode }) {
  return <View style={{ flexDirection: 'row', gap: 10 }}>{children}</View>;
}
