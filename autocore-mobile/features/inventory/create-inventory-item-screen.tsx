import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';

import { AutocompleteInput, Button, InputField, KeyboardFormShell, Text, toast } from '@/components/ui';
import { CoSheetHeader, type CoSubmitPhase } from '@/features/accounting/components/co-sheet-header';
import {
  FormListRow,
  FormListSplitRow,
  GroupedList,
  GroupedSection,
} from '@/features/orders/components/create-order/grouped-form';
import { useMobileCreateInventoryItem, useSession, useTheme } from '@/hooks';
import { scanContextStore } from '@/services/scan';
import { haptics, tokens } from '@/theme';

const SUCCESS_HOLD_MS = 420;

function parseNumber(value: string): number | undefined {
  const normalized = value.replace(',', '.').trim();
  if (!normalized) return undefined;
  const next = Number(normalized);
  return Number.isFinite(next) ? next : undefined;
}

function pickParam(value: string | string[] | undefined): string {
  if (typeof value === 'string') return value.trim();
  if (Array.isArray(value) && typeof value[0] === 'string') return value[0].trim();
  return '';
}

function makePartCode() {
  return `P-${Date.now().toString(36).toUpperCase()}`;
}

/**
 * Add-part composer opened from the dock +. Name is enough to save.
 */
export function CreateInventoryItemScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { can } = useSession();
  const createItem = useMobileCreateInventoryItem();
  const params = useLocalSearchParams<{
    barcode?: string;
    context?: string;
    orderLabel?: string;
  }>();

  const scannedBarcode = pickParam(params.barcode);
  const pendingContext = scanContextStore.peek();
  const orderContext = params.context === 'order' || pendingContext?.mode === 'order';
  const orderLabel =
    pickParam(params.orderLabel) ||
    (pendingContext?.mode === 'order' ? pendingContext.orderLabel : '') ||
    'the work order';

  const [name, setName] = useState('');
  const [barcode, setBarcode] = useState(scannedBarcode);
  const [sku, setSku] = useState(scannedBarcode);
  const [brandName, setBrandName] = useState('');
  const [warehouseLocation, setWarehouseLocation] = useState('');
  const [sellPrice, setSellPrice] = useState('');
  const [purchasePrice, setPurchasePrice] = useState('');
  const [initialQuantity, setInitialQuantity] = useState('');
  const [phase, setPhase] = useState<CoSubmitPhase>('idle');
  const [scrolled, setScrolled] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const canEdit = can('inventory_edit');
  const canSubmit = canEdit && Boolean(name.trim()) && phase === 'idle';
  const submitLabel = useMemo(
    () => (orderContext ? 'Add to order' : 'Add'),
    [orderContext],
  );

  useEffect(
    () => () => {
      if (dismissTimer.current) clearTimeout(dismissTimer.current);
    },
    [],
  );

  const onScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const next = event.nativeEvent.contentOffset.y > 6;
    setScrolled((current) => (current === next ? current : next));
  }, []);

  const dismiss = useCallback(() => {
    haptics.selection();
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
        title: 'Part added',
        description: 'It will show up in the warehouse catalog',
        variant: 'success',
      });
      dismiss();
    },
    [dismiss, orderContext, router],
  );

  const onSubmit = useCallback(async () => {
    const trimmedName = name.trim();
    if (!canEdit || !trimmedName) return;

    const code = barcode.trim() || sku.trim() || makePartCode();
    setError(null);
    setPhase('submitting');
    haptics.light();

    try {
      const result = await createItem.mutateAsync({
        barcode: code,
        sku: sku.trim() || code,
        name: trimmedName,
        brandName: brandName.trim() || undefined,
        warehouseLocation: warehouseLocation.trim() || undefined,
        sellPrice: parseNumber(sellPrice),
        purchasePrice: parseNumber(purchasePrice),
        initialQuantity: parseNumber(initialQuantity),
      });
      haptics.success();
      setPhase('success');
      dismissTimer.current = setTimeout(() => finishWithItem(result.itemId), SUCCESS_HOLD_MS);
    } catch (caught) {
      haptics.warning();
      setPhase('idle');
      setError(caught instanceof Error ? caught.message : 'Could not add this part');
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

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Stack.Screen options={{ headerShown: false, title: 'Add part' }} />
      <KeyboardFormShell
        backgroundColor={colors.background}
        contentInsetAdjustmentBehavior="never"
        onScroll={onScroll}
        scrollEventThrottle={16}
        header={
          <CoSheetHeader
            title="Add part"
            onCancel={dismiss}
            onSubmit={canEdit ? () => void onSubmit() : undefined}
            submitLabel={submitLabel}
            successLabel="Added"
            canSubmit={canSubmit}
            phase={phase}
            scrolled={scrolled}
          />
        }
        contentContainerStyle={{
          paddingHorizontal: tokens.space.screenX,
          paddingTop: tokens.space.stack,
          paddingBottom: tokens.space.section,
          gap: tokens.space.section - 4,
        }}
      >
        <Text
          variant="footnote"
          color="muted"
          style={{ paddingHorizontal: tokens.space.micro, letterSpacing: -0.08 }}
        >
          {orderContext
            ? `Goes onto ${orderLabel}. Name is enough — barcode is optional.`
            : 'Warehouse card. Name is enough — barcode is optional.'}
        </Text>

        <GroupedSection title="Identity">
          <GroupedList>
            <FormListRow label="Name" required>
              <InputField
                variant="plain"
                placeholder="Oil filter"
                value={name}
                onChangeText={setName}
                autoFocus
                returnKeyType="next"
              />
            </FormListRow>
            <FormListRow label="Barcode">
              <InputField
                variant="plain"
                placeholder="Type or leave empty"
                value={barcode}
                onChangeText={setBarcode}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="next"
              />
            </FormListRow>
            <FormListRow label="SKU">
              <InputField
                variant="plain"
                placeholder="Defaults to barcode"
                value={sku}
                onChangeText={setSku}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="next"
              />
            </FormListRow>
            <FormListRow label="Brand" last>
              <AutocompleteInput
                source="manufacturer"
                context={{ field: 'brand' }}
                placeholder="Mann, Bosch"
                value={brandName}
                onValueChange={setBrandName}
              />
            </FormListRow>
          </GroupedList>
        </GroupedSection>

        <GroupedSection title="Stock">
          <GroupedList>
            <FormListRow label="Location">
              <AutocompleteInput
                source="previousValue"
                fieldKey="warehouseLocation"
                placeholder="A-12"
                value={warehouseLocation}
                onValueChange={setWarehouseLocation}
              />
            </FormListRow>
            <FormListRow label="Starting quantity" last hint="Empty = card only">
              <InputField
                variant="plain"
                placeholder="0"
                value={initialQuantity}
                onChangeText={setInitialQuantity}
                keyboardType="number-pad"
              />
            </FormListRow>
          </GroupedList>
        </GroupedSection>

        <GroupedSection title="Price">
          <GroupedList>
            <FormListSplitRow
              leftLabel="Sell"
              rightLabel="Cost"
              last
              left={
                <InputField
                  variant="plain"
                    placeholder="0"
                  value={sellPrice}
                  onChangeText={setSellPrice}
                  keyboardType="decimal-pad"
                />
              }
              right={
                <InputField
                  variant="plain"
                    placeholder="0"
                  value={purchasePrice}
                  onChangeText={setPurchasePrice}
                  keyboardType="decimal-pad"
                />
              }
            />
          </GroupedList>
        </GroupedSection>

        {error ? (
          <Text variant="caption" color="destructive">
            {error}
          </Text>
        ) : null}

        {!canEdit ? (
          <View style={{ gap: tokens.space.stack }}>
            <Text variant="body" color="muted">
              You don’t have permission to add parts.
            </Text>
            <Button variant="outline" native={false} onPress={dismiss}>
              Close
            </Button>
          </View>
        ) : null}
      </KeyboardFormShell>
    </View>
  );
}
