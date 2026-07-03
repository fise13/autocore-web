import { useRouter } from 'expo-router';
import { useMemo, useState, type ReactNode } from 'react';
import { Keyboard, KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
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
  UserRoundIcon,
  WrenchIcon,
} from '@/assets/icons';
import { Button, AutocompleteInput, IconButton, Input, Text } from '@/components/ui';
import { ScreenActionFooter } from '@/components/navigation/screen-action-footer';
import {
  useClientsRealtime,
  useFloatingTabBarInset,
  useInventoryCatalog,
  useMotorsRealtime,
  useSession,
  useTheme,
  useVehiclesRealtime,
} from '@/hooks';
import { haptics } from '@/theme';
import { toneBackground } from '@/theme/color-utils';
import { formatPrice } from '@/features/search/lib/format';
import { formatMotorLineLabel } from '@/lib/motors/format-motor-display-name';
import { clientRepository } from '@/services/firestore/client-repository';
import { vehicleRepository } from '@/services/firestore/vehicle-repository';
import { workOrderRepository } from '@/services/firestore/work-order-repository';
import { calculateWorkOrderPricing } from '@/types/work-order';

import { useComposerTabState } from './animation/use-composer-tab-state';
import { ComposerTabBar } from './components/composer-tab-bar';
import { ComposerTabPanel } from './components/composer-tab-panel';
import {
  resolveInventoryUnitPrice,
  useWorkOrderComposerOptions,
} from './hooks/use-work-order-composer-options';
import { ordersLayout } from './layout';

type PartLineDraft = {
  name: string;
  price: number;
  sku?: string;
  itemId?: string;
  source: 'warehouse' | 'adhoc';
  unitCost: number;
};

type MotorLineDraft = {
  label: string;
  price: number;
  motorId: string;
  serialCode: string;
  brandName?: string;
  engineCode?: string;
  configuration?: string;
};

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

export function CreateOrderScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { scrollBottom } = useFloatingTabBarInset();
  const router = useRouter();
  const { companyId, uid, can } = useSession();
  const { clients } = useClientsRealtime(companyId);
  const { vehicles } = useVehiclesRealtime(companyId);
  const { items: inventoryItems } = useInventoryCatalog(companyId);
  const { availableMotors } = useMotorsRealtime(companyId, uid);

  const [step, setStep] = useState(1);
  const { tab, setTab, direction } = useComposerTabState('labor');
  const [saving, setSaving] = useState(false);

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

  const [laborTitle, setLaborTitle] = useState('');
  const [laborPrice, setLaborPrice] = useState('');
  const [partSku, setPartSku] = useState('');
  const [partName, setPartName] = useState('');
  const [partPrice, setPartPrice] = useState('');
  const [motorSerial, setMotorSerial] = useState('');
  const [motorPrice, setMotorPrice] = useState('');

  const [laborLines, setLaborLines] = useState<{ title: string; price: number }[]>([]);
  const [partLines, setPartLines] = useState<PartLineDraft[]>([]);
  const [motorLines, setMotorLines] = useState<MotorLineDraft[]>([]);

  const composerOptions = useWorkOrderComposerOptions({
    clients,
    vehicles,
    inventoryItems,
    availableMotors,
    form: { clientId, vehicleId, vehicleMake, vehicleModel, licensePlate, vin },
  });

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

  const detachVehicleLink = () => setVehicleId('');

  const fillPartFromInventory = (skuOrName: string, by: 'sku' | 'name') => {
    const item =
      by === 'sku'
        ? composerOptions.activeInventory.find((entry) => entry.sku === skuOrName)
        : composerOptions.activeInventory.find((entry) => entry.name === skuOrName);
    if (!item) return;
    setPartSku(item.sku);
    setPartName(item.name);
    setPartPrice(String(resolveInventoryUnitPrice(item)));
  };

  const stepOneValid =
    clientName.trim().length > 1 &&
    clientPhone.trim().length > 5 &&
    (vin.trim().length > 5 || licensePlate.trim().length > 2);

  const vehicleLabel = [vehicleMake.trim(), vehicleModel.trim()].filter(Boolean).join(' ') || '—';

  const grandTotal = useMemo(
    () =>
      [...laborLines, ...partLines, ...motorLines].reduce((sum, line) => sum + line.price, 0),
    [laborLines, motorLines, partLines],
  );

  const addLabor = () => {
    const price = Number.parseInt(laborPrice.replace(/\s/g, ''), 10);
    if (!laborTitle.trim() || !Number.isFinite(price)) return;
    setLaborLines((lines) => [...lines, { title: laborTitle.trim(), price }]);
    setLaborTitle('');
    setLaborPrice('');
    haptics.light();
  };

  const addPart = () => {
    const name = partName.trim();
    const sku = partSku.trim();
    const price = Number.parseInt(partPrice.replace(/\s/g, ''), 10);
    if (!name) return;

    const item =
      composerOptions.activeInventory.find((entry) => sku && entry.sku === sku) ??
      composerOptions.activeInventory.find((entry) => entry.name.toLowerCase() === name.toLowerCase());

    if (item) {
      const unitPrice = Number.isFinite(price) && price > 0 ? price : resolveInventoryUnitPrice(item);
      setPartLines((lines) => [
        ...lines,
        {
          name: item.name,
          price: unitPrice,
          sku: item.sku,
          itemId: item.id,
          source: 'warehouse',
          unitCost: item.purchasePrice ?? 0,
        },
      ]);
      setPartSku('');
      setPartName('');
      setPartPrice('');
      haptics.light();
      return;
    }

    if (!Number.isFinite(price) || price <= 0) return;
    setPartLines((lines) => [...lines, { name, price, source: 'adhoc', unitCost: 0 }]);
    setPartSku('');
    setPartName('');
    setPartPrice('');
    haptics.light();
  };

  const addMotor = () => {
    const serial = motorSerial.trim();
    const motor = composerOptions.availableMotors.find((entry) => entry.serialCode === serial);
    if (!motor) {
      haptics.warning();
      return;
    }
    const price = Number.parseInt(motorPrice.replace(/\s/g, ''), 10);
    if (!Number.isFinite(price) || price <= 0) return;
    setMotorLines((lines) => [
      ...lines,
      {
        label: formatMotorLineLabel(motor, { includeSerial: true }),
        price,
        motorId: motor.id,
        serialCode: motor.serialCode,
        brandName: motor.brandName,
        engineCode: motor.engineCode,
        configuration: motor.configuration,
      },
    ]);
    setMotorSerial('');
    setMotorPrice('');
    haptics.light();
  };

  const handleSave = async () => {
    if (!companyId || !uid || !can('work_orders_edit')) return;
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

      const mappedLaborLines = laborLines.map((line, index) => ({
        id: `labor-${index + 1}`,
        title: line.title,
        hours: 1,
        unitPrice: line.price,
        assigneeIds: [],
        assigneeRole: 'mechanic' as const,
        pricingMode: 'fixed' as const,
      }));
      const mappedPartLines = partLines.map((line, index) => ({
        id: `part-${index + 1}`,
        ...(line.itemId ? { itemId: line.itemId } : {}),
        ...(line.sku ? { sku: line.sku } : {}),
        name: line.name,
        quantity: 1,
        unitPrice: line.price,
        unitCost: line.unitCost,
        source: line.source,
      }));
      const mappedMotorLines = motorLines.map((line, index) => ({
        id: `motor-${index + 1}`,
        motorId: line.motorId,
        serialCode: line.serialCode,
        ...(line.brandName ? { brandName: line.brandName } : {}),
        ...(line.engineCode ? { engineCode: line.engineCode } : {}),
        ...(line.configuration ? { configuration: line.configuration } : {}),
        unitPrice: line.price,
        outcome: 'install' as const,
      }));

      const pricing = calculateWorkOrderPricing(mappedLaborLines, mappedPartLines, mappedMotorLines);

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
      router.replace(`/(tabs)/orders/${order.id}`);
    } catch {
      haptics.warning();
    } finally {
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
                onValueChange={(value) => {
                  setClientName(value);
                  setClientId('');
                  setVehicleId('');
                }}
                options={composerOptions.clientNameOptions}
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
                onValueChange={(value) => {
                  setClientPhone(value);
                  setClientId('');
                  setVehicleId('');
                }}
                options={composerOptions.clientPhoneOptions}
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
                    onValueChange={(value) => {
                      detachVehicleLink();
                      setVehicleMake(value);
                    }}
                    options={composerOptions.vehicleMakeOptionsList}
                  />
                </Field>
              </View>
              <View style={{ flex: 1 }}>
                <Field label="Модель">
                  <AutocompleteInput
                    placeholder={vehicleMake.trim() ? '320d F30' : 'Сначала марка'}
                    value={vehicleModel}
                    onValueChange={(value) => {
                      detachVehicleLink();
                      setVehicleModel(value);
                    }}
                    options={composerOptions.vehicleModelOptionsList}
                    editable={Boolean(vehicleMake.trim())}
                  />
                </Field>
              </View>
            </View>
            <Field label="Госномер">
              <AutocompleteInput
                placeholder="A 123 BC 02"
                value={licensePlate}
                onValueChange={(value) => {
                  detachVehicleLink();
                  setLicensePlate(value.toUpperCase());
                }}
                options={composerOptions.licensePlateOptions}
                matchMode="flexible"
                autoCapitalize="characters"
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
                onValueChange={(value) => {
                  detachVehicleLink();
                  setVin(value.toUpperCase());
                }}
                options={composerOptions.vinOptions}
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
        { id: 'labor' as const, label: 'Работы', icon: WrenchIcon },
        { id: 'parts' as const, label: 'Запчасти', icon: PackageIcon },
        { id: 'motors' as const, label: 'Двигатели', icon: BoxIcon },
      ];

      return (
        <Animated.View entering={FadeIn.duration(220)} exiting={FadeOut.duration(160)} style={{ gap: 14 }}>
          <ComposerTabBar tabs={tabs} activeTab={tab} onTabChange={setTab} />

          <ComposerTabPanel tab={tab} direction={direction}>
            {tab === 'labor' ? (
              <SectionCard title="Работы" icon={WrenchIcon}>
                <Field label="Наименование">
                  <Input placeholder="Снятие/установка двигателя" value={laborTitle} onChangeText={setLaborTitle} />
                </Field>
                <Field label="Сумма, ₸">
                  <Input placeholder="45 000" value={laborPrice} onChangeText={setLaborPrice} keyboardType="number-pad" />
                </Field>
                <Button variant="outline" onPress={addLabor}>
                  Добавить работу
                </Button>
                {laborLines.map((line, index) => (
                  <View key={`${line.title}-${index}`} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text variant="body" style={{ fontSize: 13, flex: 1 }}>{line.title}</Text>
                    <Text variant="body" style={{ fontSize: 13, fontWeight: '600' }}>{formatPrice(line.price)}</Text>
                  </View>
                ))}
              </SectionCard>
            ) : tab === 'parts' ? (
              <SectionCard title="Запчасти" icon={PackageIcon}>
                <Field label="Артикул">
                  <AutocompleteInput
                    placeholder="SKU-001"
                    value={partSku}
                    onValueChange={setPartSku}
                    options={composerOptions.partSkuOptions}
                    matchMode="flexible"
                    onOptionSelect={(value) => fillPartFromInventory(value, 'sku')}
                  />
                </Field>
                <Field label="Название">
                  <AutocompleteInput
                    placeholder="Фильтр масляный Mann"
                    value={partName}
                    onValueChange={setPartName}
                    options={composerOptions.partNameOptions}
                    matchMode="flexible"
                    onOptionSelect={(value) => fillPartFromInventory(value, 'name')}
                  />
                </Field>
                <Field label="Сумма, ₸">
                  <Input placeholder="12 500" value={partPrice} onChangeText={setPartPrice} keyboardType="number-pad" />
                </Field>
                <Button variant="outline" onPress={addPart}>
                  Добавить запчасть
                </Button>
                {partLines.map((line, index) => (
                  <View key={`${line.name}-${index}`} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text variant="body" style={{ fontSize: 13, flex: 1 }}>{line.name}</Text>
                    <Text variant="body" style={{ fontSize: 13, fontWeight: '600' }}>{formatPrice(line.price)}</Text>
                  </View>
                ))}
              </SectionCard>
            ) : (
              <SectionCard title="Двигатели" icon={BoxIcon}>
                <Field label="Серийный номер / код">
                  <AutocompleteInput
                    placeholder="Номер двигателя"
                    value={motorSerial}
                    onValueChange={setMotorSerial}
                    options={composerOptions.motorSerialOptions}
                    matchMode="flexible"
                  />
                </Field>
                <Field label="Сумма, ₸">
                  <Input placeholder="185 000" value={motorPrice} onChangeText={setMotorPrice} keyboardType="number-pad" />
                </Field>
                <Button variant="outline" onPress={addMotor}>
                  Добавить двигатель
                </Button>
                {motorLines.map((line, index) => (
                  <View key={`${line.serialCode}-${index}`} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text variant="body" style={{ fontSize: 13, flex: 1 }}>{line.label}</Text>
                    <Text variant="body" style={{ fontSize: 13, fontWeight: '600' }}>{formatPrice(line.price)}</Text>
                  </View>
                ))}
              </SectionCard>
            )}
          </ComposerTabPanel>
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
            <SummaryRow label="Работы" value={String(laborLines.length)} />
            <SummaryRow label="Запчасти" value={String(partLines.length)} />
            <SummaryRow label="Двигатели" value={String(motorLines.length)} />
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

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
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
              Новый заказ-наряд
            </Text>
            <Text variant="heading" style={{ fontSize: 20, fontWeight: '700', letterSpacing: -0.3 }}>
              Создание
            </Text>
          </View>
        </View>
        <StepIndicator step={step} />
      </View>

      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: ordersLayout.pad,
          paddingTop: 16,
          paddingBottom: scrollBottom,
          gap: 14,
        }}
        onScrollBeginDrag={Keyboard.dismiss}
      >
        {renderStep()}
      </ScrollView>

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
            Сохранить черновик
          </Button>
        )}
      </ScreenActionFooter>
    </KeyboardAvoidingView>
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
