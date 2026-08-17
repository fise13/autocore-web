import { useCallback, useDeferredValue, useMemo, useState } from 'react';
import { useRouter, type Href } from 'expo-router';

import { CarIcon } from '@/assets/icons';
import {
  CatalogRow,
  CatalogScreenHeader,
  CatalogSectionHeader,
  ContentState,
  FlashList,
  Screen,
  ScreenGate,
  SearchInput,
  Text,
  catalogRowPosition,
  type CatalogRowPosition,
} from '@/components/ui';
import { useFloatingTabBarInset, useSession, useTheme } from '@/hooks';
import { useSessionQueryData } from '@/hooks/use-session-query-data';
import { useCompanyModuleEnabled } from '@/hooks/use-module-enabled';
import { useRbacPolicy } from '@/hooks/use-rbac-policy';
import { goBackOrReplace } from '@/lib/navigation/stack-back';
import { isRealtimeReady } from '@/lib/realtime/subscription-registry';
import { rhythm, spacing } from '@/theme';
import type { MotorEntity } from '@/types/motor';

import { EngineExcelAddGrid } from './components/engine-excel-add-grid';
import { ENGINE_THUMB_SIZE, EngineThumbnail } from './components/engine-thumbnail';
import {
  engineMatchesQuery,
  engineStatusLabel,
  engineStatusTone,
  engineThumbnailUrl,
  engineUnitLabel,
  engineUnitLocation,
  groupEnginesByVariant,
  variantSubtitle,
  type EngineStatusTone,
  type EngineVariant,
} from './lib/engine-variants';

type EngineRow =
  | { type: 'variant'; key: string; variant: EngineVariant }
  | { type: 'unit'; key: string; motor: MotorEntity; position: CatalogRowPosition };

function flattenVariants(variants: EngineVariant[]): EngineRow[] {
  const rows: EngineRow[] = [];
  for (const variant of variants) {
    rows.push({ type: 'variant', key: `v:${variant.id}`, variant });
    variant.units.forEach((motor, index) => {
      rows.push({
        type: 'unit',
        key: `u:${variant.id}:${motor.id}`,
        motor,
        position: catalogRowPosition(index, variant.units.length),
      });
    });
  }
  return rows;
}

/** Location first, then a status word tinted by what that status means. */
function UnitSubtitle({ motor }: { motor: MotorEntity }) {
  const { colors } = useTheme();
  const location = engineUnitLocation(motor);
  const tone = engineStatusTone(motor);

  const toneColor: Record<EngineStatusTone, string> = {
    success: colors.successOnSubtle,
    warning: colors.warningOnSubtle,
    danger: colors.dangerOnSubtle,
    progress: colors.primary,
    muted: colors.mutedForeground,
  };

  return (
    <Text variant="footnote" numberOfLines={1} style={{ color: colors.mutedForeground }}>
      <Text
        variant="footnote"
        style={{ color: location ? colors.mutedForeground : colors.warningOnSubtle }}
      >
        {location ?? 'No location'}
      </Text>
      {'  ·  '}
      <Text variant="footnote" style={{ color: toneColor[tone] }}>
        {engineStatusLabel(motor)}
      </Text>
    </Text>
  );
}

/**
 * Engines — the serialized motor catalog.
 *
 * Folded by variant so a yard with depth reads as "Toyota 2AZ-FE · 12 units"
 * rather than twelve near-identical rows: the heading carries the name and
 * code, the card underneath carries the units. Tapping a unit opens its card.
 */
export function EnginesScreen() {
  const router = useRouter();
  const { scrollBottom } = useFloatingTabBarInset();
  const { companyId, uid } = useSession();
  const rbac = useRbacPolicy();
  const motorsEnabled = useCompanyModuleEnabled('motors');
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query.trim());

  const canView = motorsEnabled && rbac.can('inventory_view') && rbac.scopes.motors !== 'none';
  const canEdit = motorsEnabled && rbac.can('inventory_edit');

  const motorsKey = useMemo(
    () => ['realtime', 'motors', companyId, uid] as const,
    [companyId, uid],
  );
  // Mirror SessionRealtimeHead — never open a second motors listener here.
  const motors = useSessionQueryData<MotorEntity[]>(
    motorsKey,
    Boolean(companyId && uid) && canView,
    [],
  );
  const loading = canView && motors.length === 0 && !isRealtimeReady(motorsKey);

  const { rows, unitCount, variantCount } = useMemo(() => {
    const matched = deferredQuery
      ? motors.filter((motor) => engineMatchesQuery(motor, deferredQuery))
      : motors;
    const variants = groupEnginesByVariant(matched);
    return {
      rows: flattenVariants(variants),
      unitCount: matched.length,
      variantCount: variants.length,
    };
  }, [deferredQuery, motors]);

  const openEngine = useCallback(
    (motorId: string) => {
      router.push(`/objects/engine/${motorId}` as Href);
    },
    [router],
  );

  if (!canView) {
    return (
      <ScreenGate
        variant="no-permission"
        title="Engines"
        description="Your role cannot browse the serialized engine catalog."
      />
    );
  }

  const subtitle = loading
    ? 'Loading catalog…'
    : `${unitCount} ${unitCount === 1 ? 'engine' : 'engines'} · ${variantCount} ${
        variantCount === 1 ? 'variant' : 'variants'
      }`;

  return (
    <Screen>
      <CatalogScreenHeader
        title="Engines"
        subtitle={subtitle}
        onBack={() => goBackOrReplace(router, '/(tabs)/work' as Href)}
        search={
          <SearchInput
            value={query}
            onChangeText={setQuery}
            onClear={() => setQuery('')}
            placeholder="Serial, brand, code, or shelf"
            accessibilityLabel="Search engines"
          />
        }
      />

      {canEdit && uid && companyId ? (
        <EngineExcelAddGrid uid={uid} companyId={companyId} motors={motors} />
      ) : null}

      {loading ? (
        <ContentState state="loading">{null}</ContentState>
      ) : rows.length === 0 ? (
        <ContentState
          state="empty"
          emptyIcon={CarIcon}
          emptyTitle={deferredQuery ? 'No engines match' : 'No engines yet'}
          emptyDescription={
            deferredQuery
              ? 'Try the serial, the engine code, or the shelf.'
              : canEdit
                ? 'Type a serial in the spreadsheet above. It shows up here and in the web excel grid.'
                : 'Serialized motors show up here once they are received.'
          }
        >
          {null}
        </ContentState>
      ) : (
        <FlashList
          data={rows}
          keyExtractor={(row) => row.key}
          getItemType={(row) => row.type}
          contentContainerStyle={{
            paddingTop: spacing[1],
            paddingBottom: scrollBottom + rhythm.tabBarBreathing,
          }}
          renderItem={({ item }) =>
            item.type === 'variant' ? (
              <CatalogSectionHeader
                title={item.variant.title}
                meta={variantSubtitle(item.variant)}
              />
            ) : (
              <CatalogRow
                position={item.position}
                title={engineUnitLabel(item.motor)}
                monoTitle
                subtitle={<UnitSubtitle motor={item.motor} />}
                leading={<EngineThumbnail url={engineThumbnailUrl(item.motor)} />}
                leadingWidth={ENGINE_THUMB_SIZE}
                accessibilityLabel={`${engineUnitLabel(item.motor)}, ${
                  engineUnitLocation(item.motor) ?? 'no location'
                }, ${engineStatusLabel(item.motor)}`}
                onPress={() => openEngine(item.motor.id)}
              />
            )
          }
        />
      )}
    </Screen>
  );
}
