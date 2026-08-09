import { Pressable, View } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import { SymbolView } from 'expo-symbols';

import { Text } from '@/components/ui/text';
import { useTheme } from '@/hooks/use-theme';
import { haptics } from '@/theme/haptics';
import { tokens } from '@/theme/tokens';

import { home } from '../../layout';
import type { HomeAttentionRow } from '../../types-home';
import { HomeSectionTitle } from './home-primitives';

/**
 * Attention — Health notification card for the lead item,
 * then compact rows for the rest.
 */
export function HomeAttention({ rows }: { rows: HomeAttentionRow[] }) {
  const { colors } = useTheme();
  const router = useRouter();

  if (rows.length === 0) return null;

  const [lead, ...rest] = rows;
  const leadBanner =
    lead.tone === 'critical' ? colors.danger : lead.tone === 'warning' ? colors.warning : colors.primary;
  const leadInk =
    lead.tone === 'critical'
      ? colors.dangerForeground
      : lead.tone === 'warning'
        ? colors.warningForeground
        : colors.primaryForeground;

  const open = (href: string) => {
    haptics.selection();
    router.push(href as Href);
  };

  return (
    <View>
      <HomeSectionTitle
        title="Needs attention"
        trailing={
          <Text
            style={{
              fontSize: 22,
              fontWeight: '700',
              color: colors.mutedForeground,
              fontVariant: ['tabular-nums'],
            }}
          >
            {rows.length}
          </Text>
        }
      />

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${lead.title}, ${lead.actionLabel}`}
        onPress={() => open(lead.href)}
        style={{
          borderRadius: home.cardRadius,
          overflow: 'hidden',
          backgroundColor: colors.card,
        }}
      >
        <View
          style={{
            backgroundColor: leadBanner,
            paddingHorizontal: home.cardPad,
            paddingVertical: tokens.space[1.5],
            flexDirection: 'row',
            alignItems: 'center',
            gap: tokens.space[1.5],
          }}
        >
          <SymbolView
            name={lead.tone === 'critical' ? 'exclamationmark.triangle.fill' : 'exclamationmark.circle.fill'}
            size={12}
            tintColor={leadInk}
            weight="bold"
          />
          <Text
            variant="caption1"
            numberOfLines={1}
            style={{ flex: 1, fontWeight: '700', color: leadInk, letterSpacing: 0.2 }}
          >
            {lead.tone === 'critical' ? 'Needs action' : 'Needs review'}
          </Text>
        </View>

        <View style={{ padding: home.cardPad, gap: tokens.space[2] }}>
          <Text variant="headline">{lead.title}</Text>
          <Text variant="identifier" color="muted">
            {lead.subtitle}
          </Text>
          <View
            style={{
              alignSelf: 'flex-start',
              backgroundColor: colors.primary,
              borderRadius: tokens.radius.full,
              paddingHorizontal: tokens.space[3.5],
              paddingVertical: tokens.space[1.5],
              marginTop: tokens.space[1],
            }}
          >
            <Text variant="footnote" style={{ color: colors.primaryForeground, fontWeight: '600' }}>
              {lead.actionLabel}
            </Text>
          </View>
        </View>
      </Pressable>

      {rest.length > 0 ? (
        <View style={{ marginTop: tokens.space[1] }}>
          {rest.map((row, index) => {
            const indicator =
              row.tone === 'critical'
                ? colors.danger
                : row.tone === 'warning'
                  ? colors.warning
                  : colors.mutedForeground;
            return (
              <Pressable
                key={row.id}
                accessibilityRole="button"
                accessibilityLabel={`${row.title}, ${row.actionLabel}`}
                onPress={() => open(row.href)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: tokens.space[3],
                  paddingVertical: tokens.space[3],
                  borderTopWidth: index === 0 ? tokens.control.hairline : tokens.control.hairline,
                  borderTopColor: colors.border,
                }}
              >
                <View
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: 3.5,
                    backgroundColor: indicator,
                  }}
                />
                <View style={{ flex: 1, gap: 1, minWidth: 0 }}>
                  <Text variant="subheadline" style={{ fontWeight: '600' }} numberOfLines={1}>
                    {row.title}
                  </Text>
                  <Text variant="identifier" color="muted" numberOfLines={1}>
                    {row.subtitle}
                  </Text>
                </View>
                <Text variant="footnote" style={{ color: colors.primary, fontWeight: '600' }}>
                  {row.actionLabel}
                </Text>
                <SymbolView
                  name="chevron.right"
                  size={11}
                  tintColor={colors.primary}
                  weight="semibold"
                />
              </Pressable>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}
