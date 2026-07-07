import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Keyboard, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  ArrowLeftIcon,
  ArrowRightIcon,
  BoxIcon,
  CarIcon,
  CheckCircle2Icon,
  ClipboardListIcon,
  PackageIcon,
  TagIcon,
  UserRoundIcon,
  WrenchIcon,
} from '@/assets/icons';
import { Button, AutocompleteInput, IconButton, Input, KeyboardFormShell, Text, toast } from '@/components/ui';
import { ScreenActionFooter } from '@/components/navigation/screen-action-footer';
import {
  useClientsRealtime,
  useEmployeesRealtime,
  useFloatingTabBarInset,
  useInventoryCatalog,
  useMotorsRealtime,
  useSession,
  useTheme,
  useVehiclesRealtime,
  useCompanyAppConfig,
  useCompanyModuleEnabled,
  useWorkOrdersRealtime,
} from '@/hooks';
import { haptics } from '@/theme';
import { toneBackground } from '@/theme/color-utils';
import { formatPrice } from '@/features/search/lib/format';
import { nextComposerLineId } from '@/lib/work-order/composer-utils';
import { formatMotorLineLabel } from '@/lib/motors/format-motor-display-name';
import { clientRepository } from '@/services/firestore/client-repository';
import { vehicleRepository } from '@/services/firestore/vehicle-repository';
import { workOrderRepository } from '@/services/firestore/work-order-repository';
import { calculateWorkOrderPricing } from '@/types/work-order';
import {
  compositionGrandTotal,
  isSellOnlyComposition,
  mapCompositionToWorkOrderLines,
  mapOrderToCompositionDrafts,
} from './lib/composition-mappers';
import type { ScanOrderResult } from '@/services/scan';
import { useComposerTabState } from './animation/use-composer-tab-state';
import { OrderCompositionStep } from './components/composition/order-composition-step';
import { useOrderCompositionForm } from './hooks/use-order-composition-form';
import {
  resolveInventoryUnitPrice,
  useWorkOrderComposerOptions,
} from './hooks/use-work-order-composer-options';
import { ordersLayout } from './layout';

const STEPS = [
  { id: 1, label: 'Клиент и авто', icon: UserRoundIcon },
  { id: 2, label: 'Состав', icon: WrenchIcon },
  { id: 3, label: 'Проверка', icon: ClipboardListIcon },
] as const;

function SectionCard({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: typeof UserRoundIcon;
  children: ReactNode;
}) {
  const { colors } = useTheme();

  return (
    <View
      style={{
        borderRadius: ordersLayout.radius,
        borderWidth: ordersLayout.hairline,
        borderColor: colors.border,
        backgroundColor: colors.card,
        overflow: 'hidden',
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          paddingHorizontal: 14,
          paddingVertical: 12,
          borderBottomWidth: ordersLayout.hairline,
          borderBottomColor: colors.border,
        }}
      >
        <View
          style={{
            width: 28,
            height: 28,
            borderRadius: 8,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: toneBackground(colors.primary, 0.1),
          }}
        >
          <Icon size="sm" color={colors.primary} strokeWidth={1.85} />
        </View>
        <Text variant="body" style={{ fontSize: 14, fontWeight: '600' }}>
          {title}
        </Text>
      </View>
      <View style={{ padding: 14, gap: 14 }}>{children}</View>
    </View>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: ReactNode }) {
  return (
    <View style={{ gap: 6 }}>
      <Text variant="caption" color="muted" style={{ fontSize: 12, fontWeight: '500' }}>
        {label}
        {required ? ' *' : ''}
      </Text>
      {children}
    </View>
  );
}

function StepIndicator({ step }: { step: number }) {
  const { colors } = useTheme();

  return (
    <View style={{ flexDirection: 'row', gap: 8 }}>
      {STEPS.map((item) => {
        const Icon = item.icon;
        const active = step === item.id;
        const done = step > item.id;

        return (
          <View key={item.id} style={{ flex: 1, alignItems: 'center', gap: 6 }}>
            <View
              style={{
                width: 32,
                height: 32,
                borderRadius: 16,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: done || active ? colors.primary : colors.secondary,
              }}
            >
              {done ? (
                <CheckCircle2Icon size="sm" color={colors.primaryForeground} strokeWidth={2} />
              ) : (
                <Icon size="sm" color={active ? colors.primaryForeground : colors.mutedForeground} strokeWidth={1.85} />
              )}
            </View>
            <Text
              variant="caption"
              style={{
                fontSize: 10,
                fontWeight: active ? '600' : '500',
                color: active ? colors.foreground : colors.mutedForeground,
                textAlign: 'center',
              }}
              numberOfLines={2}
            >
              {item.label}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

export function CreateOrderScreen({ orderId }: { orderId?: string } = {}) {
  const isEdit = Boolean(orderId?.trim());
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { scrollBottom } = useFloatingTabBarInset();
  const router = useRouter();
  const { companyId, uid, can } = useSession();
  const params = useLocalSearchParams<{ vin?: string; itemId?: string; motorId?: string; outcome?: string }>();
  const specificsEnabled = useCompanyModuleEnabled('specifics');
  const motorsEnabled = useCompanyModuleEnabled('motors');
  const { config: companyConfig } = useCompanyAppConfig(companyId);
  const { clients } = useClientsRealtime(companyId);
  const { vehicles } = useVehiclesRealtime(companyId);
  const { employees } = useEmployeesRealtime(companyId);
  const { items: inventoryItems } = useInventoryCatalog(companyId);
  const { availableMotors } = useMotorsRealtime(companyId, uid);
  const { domainOrders } = useWorkOrdersRealtime(companyId);
  const existingOrder = isEdit ? domainOrders.find((entry) => entry.id === orderId) : undefined;
  const orderEditable =
    !isEdit || existingOrder?.status === 'draft' || existingOrder?.status === 'confirmed';

  const [step, setStep] = useState(1);
  const { tab, setTab, direction } = useComposerTabState('labor');
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const [hydrated, setHydrated] = useState(!isEdit);

  const [clientId, setClientId] = useState('');
  const [vehicleId, setVehicleId] = useState('');
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [vehicleMake, setVehicleMake] = useState('');
  const [vehicleModel, setVehicleModel] = useState('');
  const [licensePlate, setLicensePlate] = useState('');
  const [vin, setVin] = useState('');
  const [mileage, setMileage] = useState('');
  const [comment, setComment] = useState('');

  const composition = useOrderCompositionForm({
    employees,
    inventoryItems,
    availableMotors,
    companyConfig,
    currentUserId: uid ?? undefined,
  });

  const composerOptions = useWorkOrderComposerOptions({
    clients,
    vehicles,
    inventoryItems,
    availableMotors,
    form: { clientId, vehicleId, vehicleMake, vehicleModel, licensePlate, vin },
  });

  const handleScanResult = useCallback(
    (result: ScanOrderResult) => {
      if (result.type === 'added') {
        const item = inventoryItems.find((entry) => entry.id === result.itemId);
        if (!item) {
          toast({
            title: 'Позиция не найдена',
            description: 'Обновите каталог и попробуйте снова',
            variant: 'warning',
          });
          return;
        }
        composition.setPartLines((lines) => {
          if (lines.some((line) => line.itemId === item.id)) return lines;
          return [
            ...lines,
            {
              id: nextComposerLineId('part'),
              name: item.name,
              quantity: 1,
              unitPrice: resolveInventoryUnitPrice(item),
              sku: item.sku,
              itemId: item.id,
              source: 'warehouse',
              unitCost: item.purchasePrice ?? 0,
            },
          ];
        });
        setTab('parts');
        setStep(2);
        toast({
          title: 'Запчасть добавлена',
          description: item.name,
          variant: 'success',
        });
        return;
      }
      if (result.type === 'adhoc') {
        composition.setPartSku(result.barcode);
        if (result.name) composition.setPartName(result.name);
        setTab('parts');
        setStep(2);
        toast({
          title: 'Произвольная запчасть',
          description: 'Проверьте название и цену перед добавлением',
          variant: 'default',
        });
        return;
      }
    },
    [composition, inventoryItems, setTab],
  );

  const orderScanLabel = isEdit
    ? `наряд №${existingOrder?.number ?? ''}`
    : 'новый заказ-наряд';

  useEffect(() => {
    if (!isEdit || !existingOrder || hydrated) return;
    const drafts = mapOrderToCompositionDrafts(existingOrder);
    setClientId(existingOrder.clientId);
    setClientName(existingOrder.clientName ?? '');
    setClientPhone(existingOrder.clientPhone ?? '');
    setVehicleId(existingOrder.vehicleId);
    setVin(existingOrder.vin ?? '');
    setLicensePlate(existingOrder.licensePlate ?? '');
    setMileage(existingOrder.mileage ? String(existingOrder.mileage) : '');
    setComment(existingOrder.comment ?? '');
    composition.setLaborLines(drafts.laborLines);
    composition.setPartLines(drafts.partLines);
    composition.setMotorLines(drafts.motorLines);
    const vehicle = vehicles.find((entry) => entry.id === existingOrder.vehicleId);
    if (vehicle) {
      setVehicleMake(vehicle.make);
      setVehicleModel(vehicle.model);
    } else if (existingOrder.vehicleLabel) {
      const [make, ...rest] = existingOrder.vehicleLabel.split(' ');
      setVehicleMake(make ?? '');
      setVehicleModel(rest.join(' '));
    }
    setHydrated(true);
  }, [composition, existingOrder, hydrated, isEdit, vehicles]);

  const selectClient = (nextClientId: string) => {
    const client = clients.find((entry) => entry.id === nextClientId);
    if (!client) return;
    setClientId(client.id);
    setClientName(client.fullName);
    setClientPhone(client.phone);
    setVehicleId('');
  };

  const selectVehicle = (nextVehicleId: string) => {
    const vehicle = vehicles.find((entry) => entry.id === nextVehicleId);
    if (!vehicle) return;
    setVehicleId(vehicle.id);
    setClientId(vehicle.clientId);
    const client = clients.find((entry) => entry.id === vehicle.clientId);
    if (client) {
      setClientName(client.fullName);
      setClientPhone(client.phone);
    }
    setVehicleMake(vehicle.make);
    setVehicleModel(vehicle.model);
    setLicensePlate(vehicle.licensePlate);
    setVin(vehicle.vin);
    if (vehicle.currentMileage > 0) setMileage(String(vehicle.currentMileage));
  };

  // Prefill from scanner VIN — match existing vehicle or leave VIN for a new one.
  useEffect(() => {
    const incoming = typeof params.vin === 'string' ? params.vin.trim().toUpperCase() : '';
    if (!incoming) return;

    const match = vehicles.find((entry) => entry.vin.trim().toUpperCase() === incoming);
    if (match) {
      if (vehicleId !== match.id) {
        setVehicleId(match.id);
        setClientId(match.clientId);
        setVehicleMake(match.make);
        setVehicleModel(match.model);
        setLicensePlate(match.licensePlate);
        setVin(match.vin);
        if (match.currentMileage > 0) setMileage(String(match.currentMileage));
      }
      const client = clients.find((entry) => entry.id === match.clientId);
      if (client && clientId !== client.id) {
        setClientId(client.id);
        setClientName(client.fullName);
        setClientPhone(client.phone);
      }
      return;
    }

    if (vin.toUpperCase() !== incoming) setVin(incoming);
  }, [clientId, clients, params.vin, vehicleId, vehicles, vin]);

  useEffect(() => {
    const itemId = typeof params.itemId === 'string' ? params.itemId.trim() : '';
    if (!itemId) return;
    const item = inventoryItems.find((entry) => entry.id === itemId);
    if (!item) return;
    composition.setPartLines((lines) => {
      if (lines.some((line) => line.itemId === item.id)) return lines;
      return [
        ...lines,
        {
          id: nextComposerLineId('part'),
          name: item.name,
          quantity: 1,
          unitPrice: resolveInventoryUnitPrice(item),
          sku: item.sku,
          itemId: item.id,
          source: 'warehouse',
          unitCost: item.purchasePrice ?? 0,
        },
      ];
    });
    setTab('parts');
    setStep(2);
  }, [composition, inventoryItems, params.itemId, setTab]);

  useEffect(() => {
    const motorId = typeof params.motorId === 'string' ? params.motorId.trim() : '';
    if (!motorId) return;
    const motor = availableMotors.find((entry) => entry.id === motorId);
    if (!motor) return;
    const outcome =
      params.outcome === 'sell' ? ('sell' as const) : ('install' as const);
    composition.setMotorLines((lines) => {
      if (lines.some((line) => line.motorId === motor.id)) return lines;
      return [
        ...lines,
        {
          id: nextComposerLineId('motor'),
          label: formatMotorLineLabel(motor, { includeSerial: true }),
          unitPrice: 0,
          motorId: motor.id,
          serialCode: motor.serialCode,
          brandName: motor.brandName,
          engineCode: motor.engineCode,
          configuration: motor.configuration,
          outcome,
        },
      ];
    });
    composition.setMotorOutcome(outcome);
    setTab('motors');
    setStep(2);
  }, [availableMotors, composition, params.motorId, params.outcome, setTab]);

  const detachVehicleLink = () => setVehicleId('');

  const stepOneValid =
    clientName.trim().length > 1 &&
    clientPhone.trim().length > 5 &&
    (isSellOnlyComposition(composition.partLines, composition.motorLines) ||
      vin.trim().length > 5 ||
      licensePlate.trim().length > 2);

  const vehicleLabel = [vehicleMake.trim(), vehicleModel.trim()].filter(Boolean).join(' ') || '—';

  const grandTotal = useMemo(
    () => compositionGrandTotal(composition.laborLines, composition.partLines, composition.motorLines),
    [composition.laborLines, composition.motorLines, composition.partLines],
  );

  const handleSave = async () => {
    if (!companyId || !uid || !can('work_orders_edit') || !orderEditable) return;
    if (savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    try {
      let client = clientId ? clients.find((entry) => entry.id === clientId) : undefined;
      if (!client) {
        client = await clientRepository.create({
          companyId,
          fullName: clientName.trim(),
          phone: clientPhone.trim(),
          createdByUserId: uid,
        });
      }

      let vehicle = vehicleId ? vehicles.find((entry) => entry.id === vehicleId) : undefined;
      if (!vehicle) {
        vehicle = await vehicleRepository.create({
          companyId,
          clientId: client.id,
          make: vehicleMake.trim(),
          model: vehicleModel.trim(),
          vin: vin.trim(),
          licensePlate: licensePlate.trim(),
          currentMileage: Number.parseInt(mileage.replace(/\s/g, ''), 10) || 0,
          createdByUserId: uid,
        });
      }

      const parsedMileage = Number.parseInt(mileage.replace(/\s/g, ''), 10) || vehicle.currentMileage || 0;

      const { mappedLaborLines, mappedPartLines, mappedMotorLines } = mapCompositionToWorkOrderLines(
        composition.laborLines,
        composition.partLines,
        composition.motorLines,
      );
      const pricing = calculateWorkOrderPricing(mappedLaborLines, mappedPartLines, mappedMotorLines);

      if (isEdit && orderId) {
        await workOrderRepository.update(companyId, orderId, {
          clientId: client.id,
          clientName: client.fullName,
          clientPhone: client.phone,
          vehicleId: vehicle.id,
          vehicleLabel,
          vin: vin.trim(),
          licensePlate: licensePlate.trim(),
          mileage: parsedMileage,
          comment: comment.trim() || undefined,
          laborLines: mappedLaborLines,
          partLines: mappedPartLines,
          motorLines: mappedMotorLines,
          pricing,
          updatedByUserId: uid,
        });
        haptics.success();
        toast({
          title: 'Наряд обновлён',
          description: existingOrder ? `№${existingOrder.number}` : undefined,
          variant: 'success',
        });
        router.back();
        return;
      }

      const order = await workOrderRepository.create({
        companyId,
        status: 'draft',
        clientId: client.id,
        clientName: client.fullName,
        clientPhone: client.phone,
        vehicleId: vehicle.id,
        vehicleLabel,
        vin: vin.trim(),
        licensePlate: licensePlate.trim(),
        mileage: parsedMileage,
        comment: comment.trim() || undefined,
        laborLines: mappedLaborLines,
        partLines: mappedPartLines,
        motorLines: mappedMotorLines,
        pricing,
        createdByUserId: uid,
      });

      haptics.success();
      toast({ title: 'Наряд создан', description: `№${order.number}`, variant: 'success' });
      router.replace(`/(tabs)/orders/${order.id}`);
    } catch (error) {
      haptics.warning();
      toast({
        title: 'Не удалось создать наряд',
        description: error instanceof Error ? error.message : undefined,
        variant: 'destructive',
      });
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  const renderStep = () => {
    if (step === 1) {
      return (
        <Animated.View entering={FadeIn.duration(220)} exiting={FadeOut.duration(160)} style={{ gap: 14 }}>
          <SectionCard title="Клиент" icon={UserRoundIcon}>
            <Field label="ФИО клиента" required>
              <AutocompleteInput
                placeholder="Алексей Смирнов"
                value={clientName}
                source="customer"
                context={{ field: 'name' }}
                onValueChange={(value) => {
                  setClientName(value);
                  setClientId('');
                  setVehicleId('');
                }}
                onOptionSelect={(value) => {
                  const client = clients.find((entry) => entry.fullName === value);
                  if (client) selectClient(client.id);
                }}
              />
            </Field>
            <Field label="Телефон" required>
              <AutocompleteInput
                placeholder="+7 701 234 56 78"
                value={clientPhone}
                source="customer"
                context={{ field: 'phone' }}
                onValueChange={(value) => {
                  setClientPhone(value);
                  setClientId('');
                  setVehicleId('');
                }}
                matchMode="flexible"
                keyboardType="phone-pad"
                onOptionSelect={(value) => {
                  const client = clients.find((entry) => entry.phone === value);
                  if (client) selectClient(client.id);
                }}
              />
            </Field>
          </SectionCard>

          <SectionCard title="Автомобиль" icon={CarIcon}>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Field label="Марка">
                  <AutocompleteInput
                    placeholder="BMW"
                    value={vehicleMake}
                    source="manufacturer"
                    context={{ field: 'make' }}
                    onValueChange={(value) => {
                      detachVehicleLink();
                      const previousMake = vehicleMake.trim();
                      const nextMake = value.trim();
                      setVehicleMake(value);
                      if (!nextMake) {
                        if (vehicleModel.trim()) setVehicleModel('');
                        return;
                      }
                      if (previousMake.toLowerCase() === nextMake.toLowerCase()) return;
                      const known = composerOptions.vehicleMakeOptionsList.some(
                        (option) => option.value.toLowerCase() === nextMake.toLowerCase(),
                      );
                      if (known && vehicleModel.trim()) setVehicleModel('');
                    }}
                  />
                </Field>
              </View>
              <View style={{ flex: 1 }}>
                <Field label="Модель">
                  <AutocompleteInput
                    placeholder={vehicleMake.trim() ? '320d F30' : 'Сначала марка'}
                    value={vehicleModel}
                    source="manufacturer"
                    context={{ field: 'model', make: vehicleMake }}
                    onValueChange={(value) => {
                      detachVehicleLink();
                      setVehicleModel(value);
                    }}
                    editable={Boolean(vehicleMake.trim())}
                  />
                </Field>
              </View>
            </View>
            <Field label="Госномер">
              <AutocompleteInput
                placeholder="A 123 BC 02"
                value={licensePlate}
                source="previousValue"
                fieldKey="licensePlate"
                onValueChange={(value) => {
                  detachVehicleLink();
                  setLicensePlate(value.toUpperCase());
                }}
                matchMode="flexible"
                autoCapitalize="characters"
                context={{ field: 'licensePlate' }}
                onOptionSelect={(value) => {
                  const vehicle = composerOptions.clientVehicles.find(
                    (entry) => entry.licensePlate.toLowerCase() === value.trim().toLowerCase(),
                  );
                  if (vehicle) selectVehicle(vehicle.id);
                }}
              />
            </Field>
            <Field label="VIN">
              <AutocompleteInput
                placeholder="WBA3B1C50EK123456"
                value={vin}
                source="previousValue"
                fieldKey="vin"
                onValueChange={(value) => {
                  detachVehicleLink();
                  setVin(value.toUpperCase());
                }}
                context={{ field: 'vin' }}
                matchMode="flexible"
                autoCapitalize="characters"
                onOptionSelect={(value) => {
                  const vehicle = composerOptions.clientVehicles.find(
                    (entry) => entry.vin.toLowerCase() === value.trim().toLowerCase(),
                  );
                  if (vehicle) selectVehicle(vehicle.id);
                }}
              />
            </Field>
            <Field label="Пробег, км">
              <Input placeholder="142 000" value={mileage} onChangeText={setMileage} keyboardType="number-pad" />
            </Field>
            <Field label="Комментарий / жалобы клиента">
              <Input placeholder="Стук при холодном пуске…" value={comment} onChangeText={setComment} multiline />
            </Field>
          </SectionCard>
        </Animated.View>
      );
    }

    if (step === 2) {
      const tabs = [
        { id: 'labor' as const, label: 'Работы', icon: WrenchIcon, badge: composition.laborLines.length },
        {
          id: 'parts' as const,
          label: 'Запчасти',
          icon: PackageIcon,
          badge: composition.regularPartLines.length,
        },
        ...(motorsEnabled
          ? [
              {
                id: 'motors' as const,
                label: 'Двигатели',
                icon: BoxIcon,
                badge: composition.motorLines.length,
              },
            ]
          : []),
        ...(specificsEnabled && composition.quickSpecificCategories.length > 0
          ? [
              {
                id: 'specific' as const,
                label: 'Каталог',
                icon: TagIcon,
                badge: composition.specificPartLines.length,
              },
            ]
          : []),
      ];

      return (
        <Animated.View entering={FadeIn.duration(220)} exiting={FadeOut.duration(160)}>
          <OrderCompositionStep
            tab={tab}
            direction={direction}
            tabs={tabs}
            onTabChange={setTab}
            composition={composition}
            composerOptions={composerOptions}
            currentUserId={uid ?? undefined}
            specificsEnabled={specificsEnabled}
            motorsEnabled={motorsEnabled}
            orderId={orderId}
            orderLabel={orderScanLabel}
            onScanResult={handleScanResult}
          />
        </Animated.View>
      );
    }

    return (
      <Animated.View entering={FadeIn.duration(220)} exiting={FadeOut.duration(160)} style={{ gap: 14 }}>
        <SectionCard title="Проверка" icon={CheckCircle2Icon}>
          <View style={{ gap: 10 }}>
            <SummaryRow label="Клиент" value={clientName || '—'} />
            <SummaryRow label="Телефон" value={clientPhone || '—'} />
            <SummaryRow label="Авто" value={vehicleLabel} />
            <SummaryRow label="Госномер / VIN" value={licensePlate || vin || '—'} />
            <SummaryRow label="Работы" value={String(composition.laborLines.length)} />
            <SummaryRow label="Запчасти" value={String(composition.regularPartLines.length)} />
            <SummaryRow label="Каталог" value={String(composition.specificPartLines.length)} />
            <SummaryRow label="Двигатели" value={String(composition.motorLines.length)} />
          </View>
        </SectionCard>

        <View
          style={{
            borderRadius: ordersLayout.radius,
            borderWidth: ordersLayout.hairline,
            borderColor: colors.border,
            backgroundColor: colors.card,
            padding: 16,
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <Text variant="body" style={{ fontSize: 14, fontWeight: '600' }}>
            Итого
          </Text>
          <Text variant="heading" style={{ fontSize: 22, fontWeight: '700', fontVariant: ['tabular-nums'] }}>
            {formatPrice(grandTotal)}
          </Text>
        </View>
      </Animated.View>
    );
  };

  if (isEdit && !existingOrder) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }}>
        <Text variant="body" color="muted">
          Наряд не найден
        </Text>
        <Button variant="outline" onPress={() => router.back()} style={{ marginTop: 16 }}>
          Назад
        </Button>
      </View>
    );
  }

  if (isEdit && existingOrder && !orderEditable) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: colors.background,
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
        }}
      >
        <Text variant="body" color="muted" style={{ textAlign: 'center' }}>
          Редактирование доступно только для черновиков и подтверждённых нарядов
        </Text>
        <Button variant="outline" onPress={() => router.back()} style={{ marginTop: 16 }}>
          Назад
        </Button>
      </View>
    );
  }

  return (
    <KeyboardFormShell
      backgroundColor={colors.background}
      onScrollBeginDrag={Keyboard.dismiss}
      contentContainerStyle={{
        paddingHorizontal: ordersLayout.pad,
        paddingTop: 16,
        paddingBottom: scrollBottom,
        gap: 14,
      }}
      header={
        <View
          style={{
            paddingTop: insets.top + 6,
            paddingHorizontal: ordersLayout.pad,
            paddingBottom: 12,
            gap: 14,
            borderBottomWidth: ordersLayout.hairline,
            borderBottomColor: colors.border,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <IconButton accessibilityLabel="Назад" variant="ghost" size="sm" onPress={() => router.back()}>
              <ArrowLeftIcon size="sm" color={colors.foreground} strokeWidth={2} />
            </IconButton>
            <View style={{ flex: 1 }}>
              <Text variant="caption" color="muted" style={{ fontSize: 11 }}>
                {isEdit ? `Редактирование №${existingOrder?.number ?? ''}` : 'Новый заказ-наряд'}
              </Text>
              <Text variant="heading" style={{ fontSize: 20, fontWeight: '700', letterSpacing: -0.3 }}>
                {isEdit ? 'Редактирование' : 'Создание'}
              </Text>
            </View>
          </View>
          <StepIndicator step={step} />
        </View>
      }
      footer={
        <ScreenActionFooter horizontalPadding={ordersLayout.pad}>
          {step > 1 ? (
            <Button variant="outline" onPress={() => setStep((value) => value - 1)} style={{ flex: 1 }}>
              Назад
            </Button>
          ) : null}
          {step < 3 ? (
            <Button
              onPress={() => setStep((value) => value + 1)}
              disabled={step === 1 && !stepOneValid}
              style={{ flex: 1 }}
              rightIcon={<ArrowRightIcon size="sm" color="#fff" strokeWidth={2} />}
            >
              Далее
            </Button>
          ) : (
            <Button onPress={handleSave} loading={saving} style={{ flex: 1 }} leftIcon={<ClipboardListIcon size="sm" color="#fff" strokeWidth={2} />}>
              {isEdit ? 'Сохранить изменения' : 'Сохранить черновик'}
            </Button>
          )}
        </ScreenActionFooter>
      }
    >
      {renderStep()}
    </KeyboardFormShell>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
      <Text variant="caption" color="muted" style={{ fontSize: 12 }}>
        {label}
      </Text>
      <Text variant="body" style={{ fontSize: 13, fontWeight: '600', flex: 1, textAlign: 'right' }}>
        {value}
      </Text>
    </View>
  );
}
