import { useCallback, useMemo, useState } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ArrowLeftIcon, BoxIcon } from '@/assets/icons';
import { Button, AutocompleteInput, IconButton, Input, KeyboardFormShell, Screen, StickyActionBar, Surface, Text, toast } from '@/components/ui';
import {
  useMobileCreateInventoryItem,
  useSession,
  useTheme,
} from '@/hooks';
import { scanContextStore } from '@/services/scan';
import { haptics, rhythm } from '@/theme';

import { ordersLayout } from '@/features/orders/layout';

function parseNumber(value: string): number | undefined {
  const normalized = value.replace(',', '.').trim();
  if (!normalized) return undefined;
  const next = Number(normalized);
  return Number.isFinite(next) ? next : undefined;
}

export function CreateInventoryItemScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { can } = useSession();
  const createItem = useMobileCreateInventoryItem();

  const params = useLocalSearchParams<{
    barcode?: string;
    context?: string;
    orderId?: string;
    orderLabel?: string;
  }>();

  const barcode = typeof params.barcode === 'string' ? params.barcode.trim() : '';
  const pendingContext = scanContextStore.peek();
  const orderContext =
    params.context === 'order' || pendingContext?.mode === 'order';
  const orderLabel =
    (typeof params.orderLabel === 'string' ? params.orderLabel.trim() : '') ||
    (pendingContext?.mode === 'order' ? pendingContext.orderLabel : undefined) ||
    'new work order';

  const [sku, setSku] = useState(barcode);
  const [name, setName] = useState('');
  const [brandName, setBrandName] = useState('');
  const [warehouseLocation, setWarehouseLocation] = useState('');
  const [sellPrice, setSellPrice] = useState('');
  const [purchasePrice, setPurchasePrice] = useState('');
  const [initialQuantity, setInitialQuantity] = useState('');

  const canEdit = can('inventory_edit');

  const submitLabel = useMemo(
    () => (orderContext ? 'Create and add to work order' : 'Create in warehouse'),
    [orderContext],
  );

  const handleClose = useCallback(() => {
    if (router.canGoBack()) router.back();
  }, [router]);

  const finishWithItem = useCallback(
    (itemId: string) => {
      const pending = scanContextStore.peek();
      if (orderContext && pending?.mode === 'order') {
        scanContextStore.complete({ type: 'added', itemId });
        requestAnimationFrame(() => {
          if (router.canGoBack()) router.back();
          requestAnimationFrame(() => {
            if (router.canGoBack()) router.back();
          });
        });
        return;
      }

      toast({
        title: 'Item created',
        description: 'The item will appear in the warehouse catalog',
        variant: 'success',
      });
      handleClose();
    },
    [handleClose, orderContext, router],
  );

  const handleSubmit = useCallback(async () => {
    if (!canEdit) {
      toast({
        title: 'No access',
        description: 'You need warehouse edit permission to create an item',
        variant: 'warning',
      });
      return;
    }

    const trimmedName = name.trim();
    if (!barcode) {
      toast({ title: 'No barcode provided', variant: 'warning' });
      return;
    }
    if (!trimmedName) {
      toast({ title: 'Enter an item name', variant: 'warning' });
      return;
    }

    try {
      haptics.light();
      const result = await createItem.mutateAsync({
        barcode,
        sku: sku.trim() || barcode,
        name: trimmedName,
        brandName: brandName.trim() || undefined,
        warehouseLocation: warehouseLocation.trim() || undefined,
        sellPrice: parseNumber(sellPrice),
        purchasePrice: parseNumber(purchasePrice),
        initialQuantity: parseNumber(initialQuantity),
      });

      haptics.success();
      finishWithItem(result.itemId);
    } catch (error) {
      haptics.warning();
      toast({
        title: 'Could not create item',
        description: error instanceof Error ? error.message : undefined,
        variant: 'destructive',
      });
    }
  }, [
    barcode,
    brandName,
    canEdit,
    createItem,
    finishWithItem,
    initialQuantity,
    name,
    purchasePrice,
    sellPrice,
    sku,
    warehouseLocation,
  ]);

  if (!barcode) {
    return (
      <Screen>
        <View style={{ flex: 1, justifyContent: 'center', padding: rhythm.pad, gap: rhythm.stack }}>
          <Text variant="body" color="muted" style={{ textAlign: 'center' }}>
            No barcode was passed in. Go back to the scanner and try again.
          </Text>
          <Button variant="secondary" onPress={handleClose}>
            Back
          </Button>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <KeyboardFormShell
        contentContainerStyle={{
          paddingHorizontal: ordersLayout.pad,
          paddingBottom: ordersLayout.section,
          gap: ordersLayout.section,
        }}
        header={
          <View
            style={{
              paddingTop: insets.top + 8,
              paddingHorizontal: ordersLayout.pad,
              paddingBottom: rhythm.tight,
              flexDirection: 'row',
              alignItems: 'center',
              gap: rhythm.inline,
            }}
          >
            <IconButton
              accessibilityLabel="Back"
              variant="ghost"
              size="sm"
              systemImage="chevron.left"
              onPress={handleClose}
            >
              <ArrowLeftIcon size="sm" color={colors.foreground} strokeWidth={1.85} />
            </IconButton>
            <View style={{ flex: 1, gap: 2 }}>
              <Text variant="bodyStrong" style={{ fontSize: 17, fontWeight: '700' }}>
                New item
              </Text>
              <Text variant="caption" color="muted" numberOfLines={1}>
                {orderContext
                  ? `Will be added to ${orderLabel}`
                  : 'Creating an item in the warehouse'}
              </Text>
            </View>
          </View>
        }
        footer={
          <StickyActionBar>
            <Button
              native={false}
              size="xl"
              style={{ flex: 1 }}
              onPress={() => void handleSubmit()}
              loading={createItem.isPending}
              disabled={!canEdit || createItem.isPending}
            >
              {submitLabel}
            </Button>
          </StickyActionBar>
        }
      >
          <Surface inset>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: `${colors.primary}14`,
                }}
              >
                <BoxIcon size="sm" color={colors.primary} strokeWidth={1.85} />
              </View>
              <View style={{ flex: 1, gap: 4 }}>
                <Text variant="caption" color="muted">
                  Barcode
                </Text>
                <Text variant="bodyStrong" style={{ fontVariant: ['tabular-nums'] }}>
                  {barcode}
                </Text>
              </View>
            </View>
          </Surface>

          <Surface inset style={{ gap: rhythm.stack }}>
            <Input
              label="Name"
              placeholder="Mann oil filter"
              value={name}
              onChangeText={setName}
              autoFocus
            />
            <Input
              label="SKU"
              placeholder={barcode}
              value={sku}
              onChangeText={setSku}
              helperText="Defaults to the barcode"
            />
            <View style={{ gap: 6 }}>
              <Text variant="caption" color="muted">
                Brand
              </Text>
              <AutocompleteInput
                source="manufacturer"
                context={{ field: 'brand' }}
                placeholder="Mann, Bosch…"
                value={brandName}
                onValueChange={setBrandName}
              />
            </View>
            <View style={{ gap: 6 }}>
              <Text variant="caption" color="muted">
                Warehouse location
              </Text>
              <AutocompleteInput
                source="previousValue"
                fieldKey="warehouseLocation"
                placeholder="A-12"
                value={warehouseLocation}
                onValueChange={setWarehouseLocation}
              />
            </View>
            <View style={{ flexDirection: 'row', gap: rhythm.inline }}>
              <View style={{ flex: 1 }}>
                <Input
                  label="Sell price"
                  placeholder="0"
                  value={sellPrice}
                  onChangeText={setSellPrice}
                  keyboardType="decimal-pad"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Input
                  label="Purchase price"
                  placeholder="0"
                  value={purchasePrice}
                  onChangeText={setPurchasePrice}
                  keyboardType="decimal-pad"
                />
              </View>
            </View>
            <Input
              label="Starting quantity"
              placeholder="0"
              value={initialQuantity}
              onChangeText={setInitialQuantity}
              keyboardType="number-pad"
              helperText="If you enter a quantity, the item is added to stock immediately"
            />
          </Surface>
      </KeyboardFormShell>
    </Screen>
  );
}
