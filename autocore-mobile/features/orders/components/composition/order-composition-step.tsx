import { View } from 'react-native';

import {
  AutocompleteInput,
  Button,
  Dropdown,
  Input,
  SegmentedControl,
  Text,
} from '@/components/ui';
import { useTheme } from '@/hooks';
import { toneBackground } from '@/theme/color-utils';
import { warrantyTemplateLabel, warrantyTemplateOptions } from '@/lib/work-order/warranty-templates';
import type { WorkOrderMotorOutcome } from '@/types/work-order';

import { ScanLauncherRow } from '@/features/scan/components/scan-launcher-button';
import type { ScanOrderResult } from '@/services/scan';
import { ComposerTabBar } from '../composer-tab-bar';
import { ComposerTabPanel } from '../composer-tab-panel';
import type { ComposerTab } from '../../animation/use-composer-tab-state';
import type { useOrderCompositionForm } from '../../hooks/use-order-composition-form';
import type { useWorkOrderComposerOptions } from '../../hooks/use-work-order-composer-options';
import {
  CompositionAddCard,
  CompositionField,
  CompositionLineList,
  CompositionRow,
} from './composition-primitives';

type OrderCompositionStepProps = {
  tab: ComposerTab;
  direction: number;
  tabs: Array<{ id: ComposerTab; label: string; icon: typeof import('@/assets/icons').WrenchIcon }>;
  onTabChange: (tab: ComposerTab) => void;
  composition: ReturnType<typeof useOrderCompositionForm>;
  composerOptions: ReturnType<typeof useWorkOrderComposerOptions>;
  currentUserId?: string;
  specificsEnabled: boolean;
  motorsEnabled: boolean;
  orderId?: string;
  orderLabel?: string;
  onScanResult?: (result: ScanOrderResult) => void;
};

const PAYMENT_TYPE_OPTIONS = [
  { value: 'fixed', label: 'Фикс. сумма → зарплата' },
  { value: 'hourly', label: 'Почасовая → зарплата' },
];

const MOTOR_OUTCOME_OPTIONS = [
  { value: 'install', label: 'Установка' },
  { value: 'sell', label: 'Продажа' },
];

export function OrderCompositionStep({
  tab,
  direction,
  tabs,
  onTabChange,
  composition,
  composerOptions,
  currentUserId,
  specificsEnabled,
  motorsEnabled,
  orderId,
  orderLabel,
  onScanResult,
}: OrderCompositionStepProps) {
  const { colors } = useTheme();
  const isHourly = composition.laborDraft.pricingMode === 'hourly';
  const motorWarrantyOptions = [
    { value: '', label: 'По умолчанию компании' },
    ...warrantyTemplateOptions(true).map((option) => ({ value: option.value, label: option.label })),
  ];
  const catalogWarrantyOptions = [
    { value: 'none', label: 'Без гарантии' },
    ...warrantyTemplateOptions(false).map((option) => ({ value: option.value, label: option.label })),
  ];
  const categoryOptions = composition.quickSpecificCategories.map((category) => ({
    value: category.id,
    label: category.name,
  }));

  return (
    <View style={{ gap: 14 }}>
      <ComposerTabBar tabs={tabs} activeTab={tab} onTabChange={onTabChange} />

      {composition.error ? (
        <Text variant="caption" color="destructive">
          {composition.error}
        </Text>
      ) : null}

      <ComposerTabPanel tab={tab} direction={direction}>
        {tab === 'labor' ? (
          <View style={{ gap: 14 }}>
            <CompositionAddCard title="Добавить работу">
              <CompositionField label="Наименование" required>
                <Input
                  placeholder="Замена двигателя"
                  value={composition.laborDraft.title}
                  onChangeText={(value) => composition.patchLaborDraft({ title: value })}
                />
              </CompositionField>

              <CompositionField label="Тип оплаты">
                <Dropdown
                  value={composition.laborDraft.pricingMode}
                  onValueChange={(value) =>
                    composition.patchLaborDraft({
                      pricingMode: value as 'fixed' | 'hourly',
                    })
                  }
                  options={PAYMENT_TYPE_OPTIONS}
                />
              </CompositionField>

              <CompositionRow>
                {isHourly ? (
                  <CompositionField label="Нормо-часы">
                    <Input
                      placeholder="2,5"
                      value={composition.laborDraft.hours}
                      onChangeText={(value) => composition.patchLaborDraft({ hours: value })}
                      keyboardType="decimal-pad"
                    />
                  </CompositionField>
                ) : null}
                <CompositionField label={isHourly ? 'Ставка, ₸/час' : 'Сумма работы, ₸'}>
                  <Input
                    placeholder={isHourly ? '5 000' : '90 000'}
                    value={composition.laborDraft.unitPrice}
                    onChangeText={(value) => composition.patchLaborDraft({ unitPrice: value })}
                    keyboardType="number-pad"
                  />
                </CompositionField>
              </CompositionRow>

              <CompositionField label="Исполнитель" required hint="Tab ↹ или своё имя">
                <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                  <View style={{ flex: 1 }}>
                    <AutocompleteInput
                      placeholder="Сотрудник или ФИО"
                      value={composition.laborDraft.assigneeName}
                      onValueChange={(value) =>
                        composition.patchLaborDraft({ assigneeName: value, assigneeId: '' })
                      }
                      options={composition.assigneeOptions}
                      onOptionSelect={composition.commitAssignee}
                    />
                  </View>
                  {currentUserId ? (
                    <Button size="sm" variant="outline" onPress={composition.assignSelf}>
                      Я
                    </Button>
                  ) : null}
                </View>
              </CompositionField>

              <Text variant="caption" color="muted" style={{ fontSize: 11, lineHeight: 15 }}>
                {composition.laborDraft.assigneeId
                  ? 'Сотрудник компании · начисление в зарплату при закрытии наряда'
                  : composition.laborDraft.assigneeName.trim()
                    ? 'Внешний исполнитель — без начисления в зарплату'
                    : 'Сотрудник из списка, кнопка «Я» или произвольное имя'}
              </Text>

              <Button variant="secondary" onPress={composition.addLabor}>
                Добавить
              </Button>
            </CompositionAddCard>

            <CompositionLineList
              empty="Работы не добавлены"
              items={composition.laborLineItems}
              onRemove={composition.removeLabor}
            />
          </View>
        ) : null}

        {tab === 'parts' ? (
          <View style={{ gap: 14 }}>
            <CompositionAddCard
              title="Добавить запчасть"
              description="Со склада или разово — цена попадёт в накладную и бухгалтерию"
              footer={
                <ScanLauncherRow
                  orderId={orderId}
                  orderLabel={orderLabel}
                  onScanResult={onScanResult}
                />
              }
            >
              <CompositionField label="Артикул (необяз.)">
                <AutocompleteInput
                  placeholder="SKU-001"
                  value={composition.partSku}
                  onValueChange={composition.setPartSku}
                  options={composerOptions.partSkuOptions}
                  matchMode="flexible"
                  onOptionSelect={(value) => composition.fillPartFromInventory(value, 'sku')}
                />
              </CompositionField>

              <CompositionRow>
                <CompositionField label="Название">
                  <AutocompleteInput
                    placeholder="Фильтр масляный Mann"
                    value={composition.partName}
                    onValueChange={composition.setPartName}
                    options={composerOptions.partNameOptions}
                    matchMode="flexible"
                    onOptionSelect={(value) => composition.fillPartFromInventory(value, 'name')}
                  />
                </CompositionField>
                <CompositionField label="Кол-во">
                  <Input
                    placeholder="1"
                    value={composition.partQuantity}
                    onChangeText={composition.setPartQuantity}
                    keyboardType="number-pad"
                  />
                </CompositionField>
              </CompositionRow>

              <CompositionRow>
                <CompositionField label="Цена, ₸">
                  <Input
                    placeholder="12 500"
                    value={composition.partUnitPrice}
                    onChangeText={composition.setPartUnitPrice}
                    keyboardType="number-pad"
                  />
                </CompositionField>
                <View style={{ justifyContent: 'flex-end' }}>
                  <Button variant="secondary" onPress={composition.addPart}>
                    Добавить
                  </Button>
                </View>
              </CompositionRow>

              <Text variant="caption" color="muted" style={{ fontSize: 11, lineHeight: 15 }}>
                Нет на складе — введите название и цену вручную. Со склада подставятся артикул и цена продажи.
              </Text>
            </CompositionAddCard>

            <CompositionLineList
              empty="Запчасти не выбраны"
              items={composition.regularPartLineItems}
              onRemove={composition.removePart}
            />
          </View>
        ) : null}

        {tab === 'motors' && motorsEnabled ? (
          <View style={{ gap: 14 }}>
            <CompositionAddCard title="Добавить двигатель">
              <CompositionField label="Номер двигателя">
                <AutocompleteInput
                  placeholder="Номер двигателя · Tab ↹"
                  value={composition.motorSerial}
                  onValueChange={composition.setMotorSerial}
                  options={composerOptions.motorSerialOptions}
                  matchMode="flexible"
                />
              </CompositionField>

              <CompositionRow>
                <CompositionField label="Операция">
                  <Dropdown
                    value={composition.motorOutcome}
                    onValueChange={(value) =>
                      composition.setMotorOutcome(value as WorkOrderMotorOutcome)
                    }
                    options={MOTOR_OUTCOME_OPTIONS}
                  />
                </CompositionField>
                <CompositionField label="Цена">
                  <Input
                    placeholder="Цена"
                    value={composition.motorPrice}
                    onChangeText={composition.setMotorPrice}
                    keyboardType="number-pad"
                  />
                </CompositionField>
              </CompositionRow>

              <CompositionField label="Гарантия на двигатель">
                <Dropdown
                  value={composition.motorWarrantyTemplateId}
                  onValueChange={composition.setMotorWarrantyTemplateId}
                  options={motorWarrantyOptions}
                  placeholder="По умолчанию компании"
                />
              </CompositionField>

              <Button variant="secondary" onPress={composition.addMotor}>
                Добавить
              </Button>
            </CompositionAddCard>

            <CompositionLineList
              empty="Двигатели не добавлены"
              items={composition.motorLineItems}
              onRemove={composition.removeMotor}
            />
          </View>
        ) : null}

        {tab === 'specific' && specificsEnabled && composition.quickSpecificCategories.length > 0 ? (
          <View style={{ gap: 14 }}>
            <CompositionAddCard
              title="Быстрая позиция"
              description="Генератор, стартер, кузовные — без учёта на складе"
            >
              <CompositionField label="Категория">
                <Dropdown
                  value={composition.specificCategoryId}
                  onValueChange={composition.setSpecificCategoryId}
                  options={categoryOptions}
                  placeholder="Выберите…"
                />
              </CompositionField>

              <CompositionField label="Название">
                <Input
                  placeholder="Генератор Toyota 1NZ"
                  value={composition.specificPartName}
                  onChangeText={composition.setSpecificPartName}
                />
              </CompositionField>

              <CompositionRow>
                <CompositionField label="Цена, ₸">
                  <Input
                    value={composition.specificPartPrice}
                    onChangeText={composition.setSpecificPartPrice}
                    keyboardType="number-pad"
                  />
                </CompositionField>
                <CompositionField label="Гарантия">
                  <Dropdown
                    value={composition.specificWarrantyTemplateId}
                    onValueChange={composition.setSpecificWarrantyTemplateId}
                    options={catalogWarrantyOptions}
                  />
                </CompositionField>
              </CompositionRow>

              {composition.specificWarrantyTemplateId &&
              composition.specificWarrantyTemplateId !== 'none' ? (
                <View
                  style={{
                    padding: 10,
                    borderRadius: 10,
                    backgroundColor: toneBackground(colors.primary, 0.08),
                  }}
                >
                  <Text variant="caption" color="muted" style={{ fontSize: 11 }}>
                    {warrantyTemplateLabel(composition.specificWarrantyTemplateId)}
                  </Text>
                </View>
              ) : null}

              <Button variant="secondary" onPress={composition.addSpecificPart}>
                Добавить
              </Button>
            </CompositionAddCard>

            <CompositionLineList
              empty="Позиции каталога не добавлены"
              items={composition.specificPartLineItems}
              onRemove={composition.removePart}
            />
          </View>
        ) : null}
      </ComposerTabPanel>
    </View>
  );
}
