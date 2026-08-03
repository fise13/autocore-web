import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DetailSkeleton, Button, Text, toast } from '@/components/ui';
import { relocatePendingStore } from '@/features/scan/lib/relocate-pending-store';
import { useFloatingTabBarInset, useSession, useTheme } from '@/hooks';
import { MobileApiError } from '@/services/api/mobile-client';
import { mobileApi } from '@/services/api/endpoints';
import { mobileGet } from '@/services/api/mobile-client';
import { fetchLocationContentsFromFirestore } from '@/services/firestore/location-contents';
import { haptics, rhythm } from '@/theme';

export type LocationContentsResponse = {
  location: {
    id: string;
    warehouseId: string;
    displayCode: string;
    code: string;
    label?: string;
    type: string;
    barcode: string;
    isSystem?: boolean;
  };
  occupancy: {
    lineCount: number;
    totalOnHand: number;
    totalAvailable: number;
    engineCount: number;
  };
  items: Array<{
    kind: 'part' | 'motor' | 'specific';
    id: string;
    title: string;
    subtitle?: string;
    quantity: number;
    available?: number;
    sku?: string;
    serialCode?: string;
  }>;
};

function kindLabel(kind: LocationContentsResponse['items'][number]['kind']): string {
  switch (kind) {
    case 'motor':
      return 'Engine';
    case 'specific':
      return 'Item';
    default:
      return 'Part';
  }
}

export function LocationScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { companyId } = useSession();
  const insets = useSafeAreaInsets();
  const { footerBottom } = useFloatingTabBarInset();
  const params = useLocalSearchParams<{ id?: string }>();
  const locationId = typeof params.id === 'string' ? params.id : '';
  const [counting, setCounting] = useState(false);
  const [verifiedIds, setVerifiedIds] = useState<Set<string>>(new Set());

  const query = useQuery({
    queryKey: ['mobile', 'locationContents', companyId, locationId],
    enabled: Boolean(locationId && companyId),
    queryFn: async () => {
      try {
        return await mobileGet<LocationContentsResponse>(mobileApi.inventoryLocation(locationId));
      } catch (error) {
        // Production may not have the route yet — fall back to Firestore.
        if (
          error instanceof MobileApiError &&
          (error.status === 404 || error.message.includes('HTML') || error.message.includes('deploy'))
        ) {
          return fetchLocationContentsFromFirestore({ companyId: companyId!, locationId });
        }
        try {
          return await fetchLocationContentsFromFirestore({ companyId: companyId!, locationId });
        } catch {
          throw error;
        }
      }
    },
  });

  const data = query.data;
  const variance = useMemo(() => {
    if (!data || !counting) return null;
    const expected = data.items.length;
    const found = data.items.filter((item) => verifiedIds.has(`${item.kind}:${item.id}`)).length;
    return { expected, found, missing: expected - found };
  }, [counting, data, verifiedIds]);

  function startReceiveHere() {
    if (!data) return;
    relocatePendingStore.setFillLocation({
      locationId: data.location.id,
      displayCode: data.location.displayCode,
      warehouseId: data.location.warehouseId,
    });
    haptics.success();
    toast({
      title: 'Scan the engine',
      description: `We'll place it at ${data.location.displayCode}`,
      variant: 'success',
    });
    router.push('/(tabs)/scan' as Href);
  }

  function toggleVerified(key: string) {
    haptics.selection();
    setVerifiedIds((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function startCount() {
    setCounting(true);
    setVerifiedIds(new Set());
    haptics.selection();
  }

  function finishCount() {
    if (!variance) return;
    haptics.success();
    toast({
      title: variance.missing === 0 ? 'Count matches' : 'Discrepancy found',
      description:
        variance.missing === 0
          ? `All ${variance.expected} items confirmed`
          : `Found ${variance.found} of ${variance.expected}`,
      variant: variance.missing === 0 ? 'success' : 'warning',
    });
    setCounting(false);
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: rhythm.pad,
          paddingVertical: 12,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        }}
      >
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            haptics.selection();
            if (router.canGoBack()) router.back();
            else router.replace('/(tabs)/scan' as Href);
          }}
          hitSlop={10}
        >
          <Text variant="body" style={{ fontWeight: '600', color: colors.primary }}>
            Back
          </Text>
        </Pressable>
        <Text variant="caption" color="muted" style={{ fontWeight: '600' }}>
          {counting ? 'Count' : 'Location'}
        </Text>
        <View style={{ width: 56 }} />
      </View>

      {query.isLoading ? (
        <View style={{ flex: 1, padding: rhythm.pad }}>
          <DetailSkeleton />
        </View>
      ) : query.isError || !data ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: rhythm.pad }}>
          <Text variant="body" style={{ fontWeight: '600', textAlign: 'center' }}>
            Location not found
          </Text>
          <Text variant="caption" color="muted" style={{ marginTop: 8, textAlign: 'center' }}>
            {query.error instanceof Error ? query.error.message : 'Try scanning the QR code again'}
          </Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: rhythm.pad,
            paddingTop: 18,
            paddingBottom: footerBottom + 24,
            gap: 16,
          }}
        >
          <View style={{ gap: 6 }}>
            <Text variant="largeTitle">{data.location.displayCode}</Text>
            {data.location.label && data.location.label !== data.location.displayCode ? (
              <Text variant="caption" color="muted">
                {data.location.label}
              </Text>
            ) : null}
          </View>

          {!counting ? (
            <View style={{ gap: 8 }}>
              <Button
                native={false}
                size="xl"
                systemImage="tray.and.arrow.down.fill"
                onPress={startReceiveHere}
              >
                Receive here
              </Button>
              <Button
                native={false}
                variant="secondary"
                size="lg"
                onPress={startCount}
              >
                Count
              </Button>
            </View>
          ) : (
            <View style={{ gap: 8 }}>
              <Text variant="caption" color="muted">
                Mark the items you find. Discrepancies are highlighted.
              </Text>
              <Button native={false} size="lg" onPress={finishCount}>
                {`Finish (${variance?.found ?? 0}/${variance?.expected ?? 0})`}
              </Button>
            </View>
          )}

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            <StatPill label="Items" value={String(data.occupancy.lineCount)} />
            <StatPill label="Engines" value={String(data.occupancy.engineCount)} />
            <StatPill label="On hand" value={String(data.occupancy.totalOnHand)} />
            <StatPill label="Available" value={String(data.occupancy.totalAvailable)} />
          </View>

          <View style={{ gap: 8 }}>
            <Text variant="body" style={{ fontSize: 15, fontWeight: '700' }}>
              {counting ? 'Expected here' : 'Contents'}
            </Text>
            {data.items.length === 0 ? (
              <Text variant="caption" color="muted">
                Empty — tap "Receive here" and scan an engine.
              </Text>
            ) : (
              data.items.map((item) => {
                const key = `${item.kind}:${item.id}`;
                const verified = verifiedIds.has(key);
                const missing = counting && !verified;
                return (
                  <Pressable
                    key={key}
                    accessibilityRole={counting ? 'checkbox' : 'none'}
                    disabled={!counting}
                    onPress={() => counting && toggleVerified(key)}
                    style={{
                      borderRadius: 14,
                      borderWidth: 1,
                      borderColor: missing ? colors.destructive : colors.border,
                      backgroundColor: verified ? `${colors.success}18` : colors.card,
                      paddingHorizontal: 14,
                      paddingVertical: 12,
                      gap: 4,
                      opacity: counting && verified ? 0.85 : 1,
                    }}
                  >
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
                      <Text variant="body" style={{ flex: 1, fontWeight: '600' }} numberOfLines={2}>
                        {counting ? `${verified ? '✓ ' : '○ '}` : ''}
                        {item.title}
                      </Text>
                      <Text variant="caption" style={{ fontVariant: ['tabular-nums'], fontWeight: '700' }}>
                        ×{item.quantity}
                      </Text>
                    </View>
                    <Text variant="caption" color="muted">
                      {kindLabel(item.kind)}
                      {item.subtitle ? ` · ${item.subtitle}` : ''}
                    </Text>
                  </Pressable>
                );
              })
            )}
          </View>
        </ScrollView>
      )}
    </View>
  );
}

function StatPill({ label, value }: { label: string; value: string }) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 12,
        backgroundColor: colors.secondary,
        borderWidth: 1,
        borderColor: colors.border,
        gap: 2,
        minWidth: 88,
      }}
    >
      <Text variant="caption" color="muted" style={{ fontSize: 10, fontWeight: '500' }}>
        {label}
      </Text>
      <Text variant="caption" style={{ fontSize: 16, fontWeight: '700', fontVariant: ['tabular-nums'] }}>
        {value}
      </Text>
    </View>
  );
}
