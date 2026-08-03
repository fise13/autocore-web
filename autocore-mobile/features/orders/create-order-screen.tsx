import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

import {
  BoxIcon,
  PackageIcon,
  TagIcon,
  WrenchIcon,
} from '@/assets/icons';
import { Button, AutocompleteInput, Input, KeyboardFormShell, Text, toast } from '@/components/ui';
import {
  useClientsRealtime,
  useEmployeesRealtime,
  useInventoryCatalog,
  useMotorsRealtime,
  useSession,
  useTheme,
  useVehiclesRealtime,
  useCompanyAppConfig,
  useCompanyModuleEnabled,
  useWorkOrdersRealtime,
} from '@/hooks';
import { haptics, tokens } from '@/theme';
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

const STEPS = [
  { id: 1, label: 'Client' },
  { id: 2, label: 'Lines' },
  { id: 3, label: 'Review' },
] as const;

/** Nav-bar text control — primary tint, 44pt hit, no custom chrome. */
function SheetNavButton({
  label,
  onPress,
  disabled,
  loading,
  emphasis = false,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  emphasis?: boolean;
}) {
  const { colors } = useTheme();
  const muted = Boolean(disabled) || Boolean(loading);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: muted, busy: Boolean(loading) }}
      disabled={muted}
      hitSlop={{ top: 10, bottom: 10, left: 8, right: 8 }}
      onPress={onPress}
      style={{
        minHeight: tokens.control.hitTarget,
        minWidth: tokens.control.hitTarget,
        paddingHorizontal: tokens.space.inline,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: muted ? tokens.opacity.disabled : 1,
      }}
    >
      {loading ? (
        <ActivityIndicator size="small" color={colors.primary} />
      ) : (
        <Text
          variant="body"
          style={{
            fontSize: 17,
            lineHeight: 22,
            fontWeight: emphasis ? '600' : '400',
            color: colors.primary,
          }}
        >
          {label}
        </Text>
      )}
    </Pressable>
  );
}

/** Quiet section title over a fill-only island (DL v3 — no icon header bars). */
function FormSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={{ gap: tokens.space.inline }}>
      <Text variant="sectionLabel" color="muted" style={{ paddingHorizontal: tokens.space.micro }}>
        {title}
      </Text>
      {children}
    </View>
  );
}

function FormCard({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const { colors } = useTheme();
  return (
    <View
      style={[
        {
          backgroundColor: colors.card,
          borderRadius: tokens.radius.group,
          overflow: 'hidden',
          padding: tokens.space.stack + 2,
          gap: tokens.space.stack,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: ReactNode }) {
  return (
    <View style={{ gap: tokens.space.micro + 2 }}>
      <Text variant="caption1" color="muted" style={{ fontWeight: '600' }}>
        {label}
        {required ? ' *' : ''}
      </Text>
      {children}
    </View>
  );
}

/** Sentence-case step trail — tappable back, no web wizard chrome. */
function StepTrail({
  step,
  onSelect,
}: {
  step: number;
  onSelect: (step: number) => void;
}) {
  const { colors } = useTheme();

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        flexWrap: 'wrap',
        gap: tokens.space.micro,
        paddingVertical: tokens.space.micro,
      }}
    >
      {STEPS.map((item, index) => {
        const active = step === item.id;
        const done = step > item.id;
        const canJump = item.id < step;

        return (
          <View key={item.id} style={{ flexDirection: 'row', alignItems: 'center', gap: tokens.space.micro }}>
            {index > 0 ? (
              <Text variant="caption1" color="muted" style={{ opacity: 0.55 }}>
                ·
              </Text>
            ) : null}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={item.label}
              accessibilityState={{ selected: active, disabled: !canJump && !active }}
              disabled={!canJump}
              hitSlop={8}
              onPress={() => {
                if (!canJump) return;
                haptics.selection();
                onSelect(item.id);
              }}
            >
              <Text
                variant="subheadline"
                style={{
                  fontWeight: active ? '600' : '500',
                  color: active
                    ? colors.foreground
                    : done
                      ? colors.primary
                      : colors.mutedForeground,
                }}
              >
                {item.label}
              </Text>
            </Pressable>
          </View>
        );
      })}
    </View>
  );
}

export function CreateOrderScreen({ orderId }: { orderId?: string } = {}) {
  const isEdit = Boolean(orderId?.trim());
  const { colors, isDark } = useTheme();
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
            title: 'Item not found',
            description: 'Refresh the catalog and try again',
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
          title: 'Part added',
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
          title: 'Custom part',
          description: 'Check the name and price before adding',
          variant: 'default',
        });
        return;
      }
    },
    [composition, inventoryItems, setTab],
  );

  const orderScanLabel = isEdit
    ? `work order #${existingOrder?.number ?? ''}`
    : 'new work order';

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
          title: 'Work order updated',
          description: existingOrder ? `#${existingOrder.number}` : undefined,
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
      toast({ title: 'Work order created', description: `#${order.number}`, variant: 'success' });
      router.replace(`/(tabs)/orders/${order.id}`);
    } catch (error) {
      haptics.warning();
      toast({
        title: 'Could not create work order',
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
        <Animated.View entering={FadeIn.duration(220)} exiting={FadeOut.duration(160)} style={{ gap: tokens.space.stack + 2 }}>
          <FormSection title="Client">
            <FormCard>
              <Field label="Name" required>
                <AutocompleteInput
                  placeholder="John Smith"
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
              <Field label="Phone" required>
                <AutocompleteInput
                  placeholder="+1 555 234 5678"
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
            </FormCard>
          </FormSection>

          <FormSection title="Vehicle">
            <FormCard>
              <View style={{ flexDirection: 'row', gap: tokens.space.stack }}>
                <View style={{ flex: 1 }}>
                  <Field label="Make">
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
                  <Field label="Model">
                    <AutocompleteInput
                      placeholder={vehicleMake.trim() ? '320d F30' : 'Select make first'}
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
              <Field label="License plate">
                <AutocompleteInput
                  placeholder="ABC 1234"
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
              <Field label="Mileage, mi">
                <Input placeholder="142,000" value={mileage} onChangeText={setMileage} keyboardType="number-pad" />
              </Field>
              <Field label="Comment">
                <Input
                  placeholder="Knocking noise on cold start…"
                  value={comment}
                  onChangeText={setComment}
                  multiline
                />
              </Field>
            </FormCard>
          </FormSection>
        </Animated.View>
      );
    }

    if (step === 2) {
      const tabs = [
        { id: 'labor' as const, label: 'Labor', icon: WrenchIcon, badge: composition.laborLines.length },
        {
          id: 'parts' as const,
          label: 'Parts',
          icon: PackageIcon,
          badge: composition.regularPartLines.length,
        },
        ...(motorsEnabled
          ? [
              {
                id: 'motors' as const,
                label: 'Motors',
                icon: BoxIcon,
                badge: composition.motorLines.length,
              },
            ]
          : []),
        ...(specificsEnabled && composition.quickSpecificCategories.length > 0
          ? [
              {
                id: 'specific' as const,
                label: 'Catalog',
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
      <Animated.View entering={FadeIn.duration(220)} exiting={FadeOut.duration(160)} style={{ gap: tokens.space.stack + 2 }}>
        <FormSection title="Summary">
          <FormCard style={{ gap: 0, paddingVertical: tokens.space.micro }}>
            <SummaryRow label="Client" value={clientName || '—'} />
            <SummaryRow label="Phone" value={clientPhone || '—'} />
            <SummaryRow label="Vehicle" value={vehicleLabel} />
            <SummaryRow label="Plate / VIN" value={licensePlate || vin || '—'} />
            <SummaryRow label="Labor" value={String(composition.laborLines.length)} />
            <SummaryRow label="Parts" value={String(composition.regularPartLines.length)} />
            <SummaryRow label="Catalog" value={String(composition.specificPartLines.length)} />
            <SummaryRow label="Motors" value={String(composition.motorLines.length)} last />
          </FormCard>
        </FormSection>

        <FormSection title="Total">
          <FormCard>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <Text variant="body" color="muted">
                Grand total
              </Text>
              <Text variant="metric" style={{ fontVariant: ['tabular-nums'] }}>
                {formatPrice(grandTotal)}
              </Text>
            </View>
          </FormCard>
        </FormSection>
      </Animated.View>
    );
  };

  const dismiss = useCallback(() => {
    haptics.selection();
    router.back();
  }, [router]);

  const goNext = useCallback(() => {
    haptics.selection();
    setStep((value) => Math.min(3, value + 1));
  }, []);

  const primaryDisabled = (step === 1 && !stepOneValid) || saving;
  const primaryLabel = step < 3 ? 'Next' : isEdit ? 'Save' : 'Create';
  const onPrimary = step < 3 ? goNext : () => void handleSave();

  const headerLeft = useCallback(
    () => <SheetNavButton label="Cancel" onPress={dismiss} />,
    [dismiss],
  );

  const headerRight = useCallback(
    () => (
      <SheetNavButton
        label={primaryLabel}
        emphasis
        disabled={primaryDisabled}
        loading={saving && step === 3}
        onPress={onPrimary}
      />
    ),
    [onPrimary, primaryDisabled, primaryLabel, saving, step],
  );

  const screenTitle = isEdit ? 'Edit Work Order' : 'New Work Order';

  const stackHeader = (
    <Stack.Screen
      options={{
        title: screenTitle,
        headerShown: true,
        headerTintColor: colors.primary,
        headerTitleStyle: { color: colors.foreground },
        headerStyle: { backgroundColor: colors.background },
        headerBlurEffect: isDark ? 'systemChromeMaterialDark' : 'systemChromeMaterialLight',
        headerLeft,
        headerRight,
      }}
    />
  );

  if (isEdit && !existingOrder) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }}>
        {stackHeader}
        <Text variant="body" color="muted">
          Work order not found
        </Text>
        <Button variant="outline" native={false} onPress={dismiss} style={{ marginTop: tokens.space.stack }}>
          Back
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
          padding: tokens.space.section,
        }}
      >
        {stackHeader}
        <Text variant="body" color="muted" style={{ textAlign: 'center' }}>
          Editing is only available for draft and confirmed work orders
        </Text>
        <Button variant="outline" native={false} onPress={dismiss} style={{ marginTop: tokens.space.stack }}>
          Back
        </Button>
      </View>
    );
  }

  return (
    <KeyboardFormShell
      backgroundColor={colors.background}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{
        paddingHorizontal: tokens.space.screenX,
        paddingTop: tokens.space.stack,
        paddingBottom: tokens.space.section,
        gap: tokens.space.stack + 2,
      }}
    >
      {stackHeader}

      <StepTrail step={step} onSelect={setStep} />
      {renderStep()}
    </KeyboardFormShell>
  );
}

function SummaryRow({ label, value, last }: { label: string; value: string; last?: boolean }) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: tokens.space.stack,
        paddingVertical: tokens.space.stack,
        borderBottomWidth: last ? 0 : StyleSheet.hairlineWidth,
        borderBottomColor: colors.border,
      }}
    >
      <Text variant="body" color="muted">
        {label}
      </Text>
      <Text variant="body" style={{ fontWeight: '600', flex: 1, textAlign: 'right' }}>
        {value}
      </Text>
    </View>
  );
}
