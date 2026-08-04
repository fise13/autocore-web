import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui';
import { useTheme } from '@/hooks';
import { tokens } from '@/theme';

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
  const { colors } = useTheme();

  return (
    <View style={{ gap: 6, flex: 1 }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
        }}
      >
        <Text variant="caption1" color="muted" style={{ fontSize: 13, fontWeight: '500' }}>
          {label}
          {required ? <Text style={{ color: colors.destructive }}> *</Text> : null}
        </Text>
        {hint ? (
          <Text variant="caption" color="muted" style={{ fontSize: 11 }}>
            {hint}
          </Text>
        ) : null}
      </View>
      {children}
    </View>
  );
}

/** Inset composer group — Music “+” card without dashed noise. */
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
        borderRadius: tokens.radius.sheet,
        backgroundColor: colors.card,
        padding: tokens.space.stack + 2,
        gap: tokens.space.stack,
      }}
    >
      <View style={{ gap: 4 }}>
        <Text
          variant="body"
          style={{ fontSize: 17, fontWeight: '600', letterSpacing: -0.3 }}
        >
          {title}
        </Text>
        {description ? (
          <Text
            variant="caption"
            color="muted"
            style={{ fontSize: 13, lineHeight: 18, letterSpacing: -0.08 }}
          >
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
      <Text
        variant="caption"
        color="muted"
        style={{ textAlign: 'center', paddingVertical: 24, fontSize: 14 }}
      >
        {empty}
      </Text>
    );
  }

  return (
    <View
      style={{
        borderRadius: tokens.radius.sheet,
        backgroundColor: colors.card,
        overflow: 'hidden',
      }}
    >
      {items.map((item, index) => (
        <View key={item.id}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
              paddingHorizontal: 16,
              paddingVertical: 14,
              minHeight: tokens.control.hitTarget,
            }}
          >
            <Text
              variant="body"
              style={{ flex: 1, fontSize: 15, lineHeight: 20, letterSpacing: -0.2 }}
              numberOfLines={2}
            >
              {item.label}
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Remove ${item.label}`}
              onPress={() => onRemove(item.id)}
              hitSlop={10}
              style={{
                minHeight: tokens.control.hitTarget,
                minWidth: tokens.control.hitTarget,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text
                variant="caption"
                style={{
                  fontSize: 15,
                  fontWeight: '500',
                  color: colors.destructive,
                }}
              >
                Remove
              </Text>
            </Pressable>
          </View>
          {index < items.length - 1 ? (
            <View
              style={{
                height: StyleSheet.hairlineWidth,
                backgroundColor: colors.border,
                marginLeft: 16,
              }}
            />
          ) : null}
        </View>
      ))}
    </View>
  );
}

export function CompositionRow({ children }: { children: ReactNode }) {
  return <View style={{ flexDirection: 'row', gap: 10 }}>{children}</View>;
}
