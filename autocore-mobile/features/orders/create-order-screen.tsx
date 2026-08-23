import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

import {
  BoxIcon,
  PackageIcon,
  TagIcon,
  WrenchIcon,
  XIcon,
} from '@/assets/icons';
import {
  AutocompleteInput,
  Button,
  CatalogAddButton,
  Input,
  KeyboardFormShell,
  Text,
  toast,
} from '@/components/ui';
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
import {
  FormListRow,
  FormListSplitRow,
  GroupedList,
  GroupedSection,
} from './components/create-order/grouped-form';
import {
  WizardStepHeader,
  WizardStepTrail,
} from './components/create-order/wizard-chrome';
import { OrderCompositionStep } from './components/composition/order-composition-step';
import { useOrderCompositionForm } from './hooks/use-order-composition-form';
import {
  resolveInventoryUnitPrice,
  useWorkOrderComposerOptions,
} from './hooks/use-work-order-composer-options';

/** Stable Reanimated layouts — fresh instances each render restart entering. */
const STEP_ENTERING = FadeIn.duration(220);
const STEP_EXITING = FadeOut.duration(160);

/** Nav-bar text control — primary tint, 44pt hit, no custom chrome. */
/**
 * Composer dismiss — a neutral round glyph, not a word.
 *
 * It shares the accent Add pill's height so the header reads as one pair:
 * a quiet circle on the left, the only coloured thing on the screen on the
 * right. A text "Cancel" at 17pt competed with that pill for attention and
 * won, which is the wrong way round for a button whose whole job is to be
 * available without being suggested.
 */
function ComposerCancelButton({ onPress }: { onPress: () => void }) {
  const { colors } = useTheme();
  const [pressed, setPressed] = useState(false);
  const size = tokens.control.hitTarget;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Cancel"
      accessibilityHint="Closes the composer without saving"
      hitSlop={6}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      onPress={onPress}
      // Static object, not the `({ pressed }) => …` form — this RN version
      // silently drops the function style.
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.secondary,
        opacity: pressed ? 0.7 : 1,
      }}
    >
      <XIcon size={18} color={colors.foreground} strokeWidth={2.4} />
    </Pressable>
  );
}

export function CreateOrderScreen({ orderId }: { orderId?: string } = {}) {
  const isEdit = Boolean(orderId?.trim());
  const { colors } = useTheme();
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

  const {
    setLaborLines,
    setPartLines,
    setMotorLines,
    setMotorOutcome,
    setPartSku,
    setPartName,
  } = composition;

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
        setPartLines((lines) => {
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
        setPartSku(result.barcode);
        if (result.name) setPartName(result.name);
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
    [inventoryItems, setPartLines, setPartName, setPartSku, setTab],
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
    setLaborLines(drafts.laborLines);
    setPartLines(drafts.partLines);
    setMotorLines(drafts.motorLines);
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
  }, [
    existingOrder,
    hydrated,
    isEdit,
    setLaborLines,
    setMotorLines,
    setPartLines,
    vehicles,
  ]);

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

  // Prefill params once per id — setters are stable; do not depend on the whole
  // composition object (new reference every render → effect thrash).
  const prefilledItemIdRef = useRef<string | null>(null);
  useEffect(() => {
    const itemId = typeof params.itemId === 'string' ? params.itemId.trim() : '';
    if (!itemId || prefilledItemIdRef.current === itemId) return;
    const item = inventoryItems.find((entry) => entry.id === itemId);
    if (!item) return;
    prefilledItemIdRef.current = itemId;
    setPartLines((lines) => {
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
  }, [inventoryItems, params.itemId, setPartLines, setTab]);

  const prefilledMotorIdRef = useRef<string | null>(null);
  useEffect(() => {
    const motorId = typeof params.motorId === 'string' ? params.motorId.trim() : '';
    if (!motorId || prefilledMotorIdRef.current === motorId) return;
    const motor = availableMotors.find((entry) => entry.id === motorId);
    if (!motor) return;
    prefilledMotorIdRef.current = motorId;
    const outcome =
      params.outcome === 'sell' ? ('sell' as const) : ('install' as const);
    setMotorLines((lines) => {
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
    setMotorOutcome(outcome);
    setTab('motors');
    setStep(2);
  }, [availableMotors, params.motorId, params.outcome, setMotorLines, setMotorOutcome, setTab]);

  const detachVehicleLink = () => setVehicleId('');

  /** One vehicle identifier is required; the form has to say which. */
  const vehicleIdentifierMissing =
    !isSellOnlyComposition(composition.partLines, composition.motorLines) &&
    vin.trim().length <= 5 &&
    licensePlate.trim().length <= 2;

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
    // The step trail is freely navigable, so reaching Review no longer proves
    // the Client step was ever filled in. Without this the composer would
    // happily create a client record with an empty name.
    if (!stepOneValid) {
      haptics.warning();
      setStep(1);
      toast({
        title: 'Add the customer first',
        description: 'Name, phone, and either a VIN or a plate.',
        variant: 'warning',
      });
      return;
    }
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
      router.replace(`/orders/${order.id}`);
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

  const linkedHint =
    clientId.trim().length > 0
      ? 'Linked customer'
      : vehicleId.trim().length > 0
        ? 'Linked vehicle'
        : undefined;

  const renderStep = () => {
    if (step === 1) {
      return (
        <Animated.View
          entering={STEP_ENTERING}
          exiting={STEP_EXITING}
          style={{ gap: tokens.space.section }}
        >
          <GroupedSection title="Customer">
            <GroupedList>
              <FormListRow label="Name" required>
                <AutocompleteInput
                  placeholder="John Smith"
                  value={clientName}
                  type="customer"
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
              </FormListRow>
              <FormListRow label="Phone" required last hint={linkedHint}>
                <AutocompleteInput
                  placeholder="+1 555 234 5678"
                  value={clientPhone}
                  type="customer"
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
              </FormListRow>
            </GroupedList>
          </GroupedSection>

          <GroupedSection title="Vehicle">
            <GroupedList>
              <FormListSplitRow
                leftLabel="Make"
                rightLabel="Model"
                left={
                  <AutocompleteInput
                    placeholder="BMW"
                    value={vehicleMake}
                    type="vehicle"
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
                }
                right={
                  <AutocompleteInput
                    placeholder={vehicleMake.trim() ? '320d F30' : 'Make first'}
                    value={vehicleModel}
                    type="vehicle"
                    context={{ field: 'model', make: vehicleMake }}
                    onValueChange={(value) => {
                      detachVehicleLink();
                      setVehicleModel(value);
                    }}
                    editable={Boolean(vehicleMake.trim())}
                  />
                }
              />
              {/*
                `stepOneValid` accepts a plate OR a VIN, so neither field is
                marked with a required star — but one of them genuinely is, and
                without saying so the Add button sat dimmed with the form
                claiming only Name and Phone were outstanding.
              */}
              <FormListRow
                label="License plate"
                hint={vehicleIdentifierMissing ? 'Plate or VIN — one of the two is required' : undefined}
              >
                <AutocompleteInput
                  placeholder="ABC 1234"
                  value={licensePlate}
                  type="vehicle"
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
              </FormListRow>
              <FormListRow label="VIN">
                <AutocompleteInput
                  placeholder="WBA3B1C50EK123456"
                  value={vin}
                  type="vehicle"
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
              </FormListRow>
              <FormListRow label="Mileage, mi">
                <Input
                  placeholder="142,000"
                  value={mileage}
                  onChangeText={setMileage}
                  keyboardType="number-pad"
                />
              </FormListRow>
              <FormListRow label="Comment" last>
                <Input
                  placeholder="Knocking noise on cold start…"
                  value={comment}
                  onChangeText={setComment}
                  multiline
                />
              </FormListRow>
            </GroupedList>
          </GroupedSection>
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
        <Animated.View entering={STEP_ENTERING} exiting={STEP_EXITING}>
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
      <Animated.View
        entering={STEP_ENTERING}
        exiting={STEP_EXITING}
        style={{ gap: tokens.space.section }}
      >
        <GroupedSection title="Summary">
          <GroupedList>
            <SummaryRow label="Client" value={clientName || '—'} />
            <SummaryRow label="Phone" value={clientPhone || '—'} />
            <SummaryRow label="Vehicle" value={vehicleLabel} />
            <SummaryRow label="Plate / VIN" value={licensePlate || vin || '—'} />
            <SummaryRow label="Labor" value={String(composition.laborLines.length)} />
            <SummaryRow label="Parts" value={String(composition.regularPartLines.length)} />
            <SummaryRow label="Catalog" value={String(composition.specificPartLines.length)} />
            <SummaryRow label="Motors" value={String(composition.motorLines.length)} last />
          </GroupedList>
        </GroupedSection>

        <GroupedSection title="Total">
          <GroupedList>
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'baseline',
                paddingHorizontal: tokens.space.stack + 2,
                paddingVertical: tokens.space.stack + 4,
                minHeight: 64,
              }}
            >
              <Text variant="body" color="muted" style={{ fontSize: 17 }}>
                Grand total
              </Text>
              <Text
                variant="metric"
                style={{
                  fontSize: 28,
                  fontWeight: '700',
                  letterSpacing: -0.6,
                  fontVariant: ['tabular-nums'],
                }}
              >
                {formatPrice(grandTotal)}
              </Text>
            </View>
          </GroupedList>
        </GroupedSection>
      </Animated.View>
    );
  };

  const dismiss = useCallback(() => {
    haptics.selection();
    router.back();
  }, [router]);

  /**
   * There is no Next any more — the step trail moves between Client, Lines and
   * Review, so the header keeps exactly one action: commit.
   *
   * It stays dimmed until the order has the customer data it cannot be saved
   * without, and from then on it works from whichever step the reader is on.
   * "Add" is the design-language label for bringing a new record into being;
   * editing an order that already exists is a Save, so the word follows.
   */
  const primaryLabel = isEdit ? 'Save' : 'Add';
  const primaryDisabled = !stepOneValid || saving;

  const headerLeft = useCallback(() => <ComposerCancelButton onPress={dismiss} />, [dismiss]);

  const headerRight = useCallback(
    () => (
      <CatalogAddButton
        label={primaryLabel}
        accessibilityLabel={isEdit ? 'Save work order' : 'Add work order'}
        disabled={primaryDisabled}
        loading={saving}
        onPress={() => void handleSave()}
      />
    ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isEdit, primaryDisabled, primaryLabel, saving],
  );

  const screenTitle = isEdit ? 'Edit Work Order' : 'New Work Order';

  /**
   * Composer owns the chrome row. Native stack header stays off via the route
   * layout (`headerShown: false`) — never re-declare Stack.Screen options here;
   * a fresh `options` object each render made React Navigation remount the
   * form sheet and restart FadeIn on every frame.
   */
  const composerHeader = (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: tokens.space.screenX,
        paddingTop: tokens.space.stack,
        paddingBottom: tokens.space.inline,
      }}
    >
      {headerLeft()}
      {headerRight()}
    </View>
  );

  if (isEdit && !existingOrder) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }}>
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
      header={composerHeader}
      contentInsetAdjustmentBehavior="never"
      contentContainerStyle={styles.formContent}
    >
      <WizardStepHeader title={screenTitle} step={step} />
      <WizardStepTrail step={step} onSelect={setStep} />
      {renderStep()}
    </KeyboardFormShell>
  );
}

const styles = StyleSheet.create({
  formContent: {
    paddingHorizontal: tokens.space.screenX,
    paddingTop: tokens.space.micro,
    paddingBottom: tokens.space.section + 24,
    gap: tokens.space.section,
  },
});

function SummaryRow({ label, value, last }: { label: string; value: string; last?: boolean }) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: tokens.space.stack,
        paddingHorizontal: tokens.space.stack + 2,
        paddingVertical: 14,
        minHeight: tokens.control.hitTarget,
        borderBottomWidth: last ? 0 : StyleSheet.hairlineWidth,
        borderBottomColor: colors.border,
      }}
    >
      <Text variant="body" color="muted" style={{ fontSize: 16 }}>
        {label}
      </Text>
      <Text
        variant="body"
        style={{
          fontWeight: '500',
          flex: 1,
          textAlign: 'right',
          fontSize: 16,
          letterSpacing: -0.2,
        }}
        numberOfLines={2}
      >
        {value}
      </Text>
    </View>
  );
}
