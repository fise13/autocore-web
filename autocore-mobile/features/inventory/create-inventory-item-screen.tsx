import { useCallback, useMemo, useState } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ArrowLeftIcon, BoxIcon } from '@/assets/icons';
import { ScreenActionFooter } from '@/components/navigation/screen-action-footer';
import { Button, AutocompleteInput, IconButton, Input, KeyboardFormShell, Screen, Surface, Text, toast } from '@/components/ui';
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
    'новый заказ-наряд';

  const [sku, setSku] = useState(barcode);
  const [name, setName] = useState('');
  const [brandName, setBrandName] = useState('');
  const [warehouseLocation, setWarehouseLocation] = useState('');
  const [sellPrice, setSellPrice] = useState('');
  const [purchasePrice, setPurchasePrice] = useState('');
  const [initialQuantity, setInitialQuantity] = useState('');

  const canEdit = can('inventory_edit');

  const submitLabel = useMemo(
    () => (orderContext ? 'Создать и добавить в наряд' : 'Создать на склад'),
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
        title: 'Товар создан',
        description: 'Позиция появится в каталоге склада',
        variant: 'success',
      });
      handleClose();
    },
    [handleClose, orderContext, router],
  );

  const handleSubmit = useCallback(async () => {
    if (!canEdit) {
      toast({
        title: 'Нет доступа',
        description: 'Для создания товара нужно право редактирования склада',
        variant: 'warning',
      });
      return;
    }

    const trimmedName = name.trim();
    if (!barcode) {
      toast({ title: 'Штрихкод не указан', variant: 'warning' });
      return;
    }
    if (!trimmedName) {
      toast({ title: 'Укажите название товара', variant: 'warning' });
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
        title: 'Не удалось создать товар',
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
            Штрихкод не передан. Вернитесь к сканеру и попробуйте снова.
          </Text>
          <Button variant="secondary" onPress={handleClose}>
            Назад
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
          paddingBottom: 120 + insets.bottom,
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
            <IconButton accessibilityLabel="Назад" variant="ghost" onPress={handleClose}>
              <ArrowLeftIcon size="sm" color={colors.foreground} strokeWidth={1.85} />
            </IconButton>
            <View style={{ flex: 1, gap: 2 }}>
              <Text variant="bodyStrong" style={{ fontSize: 17, fontWeight: '700' }}>
                Новый товар
              </Text>
              <Text variant="caption" color="muted" numberOfLines={1}>
                {orderContext
                  ? `Будет добавлен в ${orderLabel}`
                  : 'Создание позиции на складе'}
              </Text>
            </View>
          </View>
        }
        footer={
          <ScreenActionFooter>
            <Button
              onPress={() => void handleSubmit()}
              loading={createItem.isPending}
              disabled={!canEdit || createItem.isPending}
            >
              {submitLabel}
            </Button>
          </ScreenActionFooter>
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
                  Штрихкод
                </Text>
                <Text variant="bodyStrong" style={{ fontVariant: ['tabular-nums'] }}>
                  {barcode}
                </Text>
              </View>
            </View>
          </Surface>

          <Surface inset style={{ gap: rhythm.stack }}>
            <Input
              label="Название"
              placeholder="Фильтр масляный Mann"
              value={name}
              onChangeText={setName}
              autoFocus
            />
            <Input
              label="Артикул (SKU)"
              placeholder={barcode}
              value={sku}
              onChangeText={setSku}
              helperText="По умолчанию совпадает со штрихкодом"
            />
            <View style={{ gap: 6 }}>
              <Text variant="caption" color="muted">
                Бренд
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
                Ячейка склада
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
                  label="Цена продажи"
                  placeholder="0"
                  value={sellPrice}
                  onChangeText={setSellPrice}
                  keyboardType="decimal-pad"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Input
                  label="Закупка"
                  placeholder="0"
                  value={purchasePrice}
                  onChangeText={setPurchasePrice}
                  keyboardType="decimal-pad"
                />
              </View>
            </View>
            <Input
              label="Начальный остаток"
              placeholder="0"
              value={initialQuantity}
              onChangeText={setInitialQuantity}
              keyboardType="number-pad"
              helperText="Если указать количество, товар сразу оприходуется на склад"
            />
          </Surface>
      </KeyboardFormShell>
    </Screen>
  );
}
