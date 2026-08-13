import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';

import { ChevronRightIcon } from '@/assets/icons';
import { Text } from '@/components/ui';
import { useTheme } from '@/hooks';
import { haptics, rhythm, spacing, tokens } from '@/theme';
import { withAlpha } from '@/theme/color-utils';

import type { DocumentationLine, EngineFact } from '../lib/engine-facts';

export function EngineSectionLabel({ children }: { children: string }) {
  return (
    <Text
      variant="sectionLabel"
      color="muted"
      style={{ marginHorizontal: rhythm.pad + spacing[1], marginBottom: spacing[2] }}
    >
      {children}
    </Text>
  );
}

/**
 * Three facts side by side instead of three sections stacked. Location leads
 * and turns amber when nothing has placed the engine — an unplaced unit is a
 * problem, not a blank field.
 */
export function EngineFactStrip({ facts }: { facts: EngineFact[] }) {
  const { colors } = useTheme();

  return (
    <View
      style={{
        flexDirection: 'row',
        marginHorizontal: rhythm.pad,
        borderRadius: tokens.radius.modal,
        backgroundColor: colors.card,
        overflow: 'hidden',
      }}
    >
      {facts.map((fact, index) => (
        <View
          key={fact.id}
          style={{
            flex: 1,
            paddingVertical: spacing[3],
            paddingHorizontal: spacing[3],
            gap: 3,
            borderLeftWidth: index > 0 ? 1 : 0,
            borderLeftColor: colors.border,
          }}
        >
          <Text
            variant="callout"
            numberOfLines={1}
            style={{
              fontWeight: '600',
              color: fact.tone === 'warning' ? colors.warningOnSubtle : colors.foreground,
            }}
          >
            {fact.value}
          </Text>
          <Text variant="caption1" color="muted" numberOfLines={1}>
            {fact.label}
          </Text>
        </View>
      ))}
    </View>
  );
}

/**
 * Intake documentation state, surfaced on the engine for the first time.
 *
 * The checklist already lives on the intake job — 21 items with sale gates —
 * and until now nothing rendered it. Whether an engine can actually be sold is
 * exactly what someone opening this card wants to know.
 */
export function EngineDocumentationCard({
  line,
  onPress,
}: {
  line: DocumentationLine;
  onPress?: () => void;
}) {
  const { colors, isDark } = useTheme();

  const toneColor =
    line.tone === 'danger'
      ? colors.dangerOnSubtle
      : line.tone === 'warning'
        ? colors.warningOnSubtle
        : colors.successOnSubtle;

  const body = (
    <View
      style={{
        marginHorizontal: rhythm.pad,
        padding: spacing[4],
        borderRadius: tokens.radius.modal,
        backgroundColor: colors.card,
        gap: spacing[3],
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[3] }}>
        <View style={{ flex: 1, gap: 3 }}>
          <Text variant="headline" style={{ color: colors.foreground }}>
            {line.headline}
          </Text>
          <Text variant="footnote" style={{ color: toneColor }}>
            {line.detail}
          </Text>
        </View>
        {onPress ? (
          <ChevronRightIcon
            size="sm"
            color={withAlpha(colors.mutedForeground, isDark ? 0.4 : 0.45)}
            strokeWidth={1.75}
          />
        ) : null}
      </View>

      <View
        style={{
          height: 6,
          borderRadius: 3,
          overflow: 'hidden',
          backgroundColor: withAlpha(colors.mutedForeground, 0.18),
        }}
      >
        <View
          style={{
            width: `${Math.round(Math.min(1, Math.max(0, line.ratio)) * 100)}%`,
            height: 6,
            borderRadius: 3,
            backgroundColor: toneColor,
          }}
        />
      </View>
    </View>
  );

  if (!onPress) return body;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Documentation, ${line.headline}, ${line.detail}`}
      onPress={() => {
        haptics.selection();
        onPress();
      }}
    >
      {body}
    </Pressable>
  );
}

/** Free text (condition notes) — only rendered when there is something to say. */
export function EngineNoteCard({ children }: { children: ReactNode }) {
  const { colors } = useTheme();

  return (
    <View
      style={{
        marginHorizontal: rhythm.pad,
        padding: spacing[4],
        borderRadius: tokens.radius.modal,
        backgroundColor: colors.card,
      }}
    >
      {children}
    </View>
  );
}
