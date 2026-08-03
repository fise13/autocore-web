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
import { warrantyTemplateLabel, warrantyTemplateOptions } from '@/lib/work-order/warranty-templates';
import type { WorkOrderMotorOutcome } from '@/types/work-order';

import { wo } from '../../theme/wo-visual';
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
  { value: 'fixed', label: 'Fixed amount → payroll' },
  { value: 'hourly', label: 'Hourly → payroll' },
];

const MOTOR_OUTCOME_OPTIONS = [
  { value: 'install', label: 'Install' },
  { value: 'sell', label: 'Sell' },
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
    { value: '', label: 'Company default' },
    ...warrantyTemplateOptions(true).map((option) => ({ value: option.value, label: option.label })),
  ];
  const catalogWarrantyOptions = [
    { value: 'none', label: 'No warranty' },
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
            <CompositionAddCard title="Add labor">
              <CompositionField label="Description" required>
                <Input
                  placeholder="Engine replacement"
                  value={composition.laborDraft.title}
                  onChangeText={(value) => composition.patchLaborDraft({ title: value })}
                />
              </CompositionField>

              <CompositionField label="Payment type">
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
                  <CompositionField label="Labor hours">
                    <Input
                      placeholder="2.5"
                      value={composition.laborDraft.hours}
                      onChangeText={(value) => composition.patchLaborDraft({ hours: value })}
                      keyboardType="decimal-pad"
                    />
                  </CompositionField>
                ) : null}
                <CompositionField label={isHourly ? 'Rate, $/hour' : 'Labor amount, $'}>
                  <Input
                    placeholder={isHourly ? '5 000' : '90 000'}
                    value={composition.laborDraft.unitPrice}
                    onChangeText={(value) => composition.patchLaborDraft({ unitPrice: value })}
                    keyboardType="number-pad"
                  />
                </CompositionField>
              </CompositionRow>

              <CompositionField label="Assignee" required hint="Tab ↹ or enter a name">
                <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                  <View style={{ flex: 1 }}>
                    <AutocompleteInput
                      placeholder="Employee or full name"
                      value={composition.laborDraft.assigneeName}
                      fieldKey="assignee"
                      onValueChange={(value) =>
                        composition.patchLaborDraft({ assigneeName: value, assigneeId: '' })
                      }
                      options={composition.assigneeOptions}
                      onOptionSelect={composition.commitAssignee}
                    />
                  </View>
                  {currentUserId ? (
                    <Button size="sm" variant="outline" onPress={composition.assignSelf}>
                      Me
                    </Button>
                  ) : null}
                </View>
              </CompositionField>

              <Text variant="caption" color="muted" style={{ fontSize: 11, lineHeight: 15 }}>
                {composition.laborDraft.assigneeId
                  ? 'Company employee · added to payroll when the work order closes'
                  : composition.laborDraft.assigneeName.trim()
                    ? 'Outside contractor — not added to payroll'
                    : 'Pick an employee, tap "Me", or enter any name'}
              </Text>

              <Button variant="secondary" onPress={composition.addLabor}>
                Add
              </Button>
            </CompositionAddCard>

            <CompositionLineList
              empty="No labor added yet"
              items={composition.laborLineItems}
              onRemove={composition.removeLabor}
            />
          </View>
        ) : null}

        {tab === 'parts' ? (
          <View style={{ gap: 14 }}>
            <CompositionAddCard
              title="Add part"
              description="From inventory or one-off — the price flows into the invoice and accounting"
              footer={
                <ScanLauncherRow
                  orderId={orderId}
                  orderLabel={orderLabel}
                  onScanResult={onScanResult}
                />
              }
            >
              <CompositionField label="SKU (optional)">
                <AutocompleteInput
                  placeholder="SKU-001"
                  value={composition.partSku}
                  fieldKey="partSku"
                  onValueChange={composition.setPartSku}
                  options={composerOptions.partSkuOptions}
                  matchMode="flexible"
                  onOptionSelect={(value) => composition.fillPartFromInventory(value, 'sku')}
                />
              </CompositionField>

              <CompositionRow>
                <CompositionField label="Name">
                  <AutocompleteInput
                    placeholder="Mann oil filter"
                    value={composition.partName}
                    fieldKey="partName"
                    onValueChange={composition.setPartName}
                    options={composerOptions.partNameOptions}
                    matchMode="flexible"
                    onOptionSelect={(value) => composition.fillPartFromInventory(value, 'name')}
                  />
                </CompositionField>
                <CompositionField label="Qty">
                  <Input
                    placeholder="1"
                    value={composition.partQuantity}
                    onChangeText={composition.setPartQuantity}
                    keyboardType="number-pad"
                  />
                </CompositionField>
              </CompositionRow>

              <CompositionRow>
                <CompositionField label="Price, $">
                  <Input
                    placeholder="12 500"
                    value={composition.partUnitPrice}
                    onChangeText={composition.setPartUnitPrice}
                    keyboardType="number-pad"
                  />
                </CompositionField>
                <View style={{ justifyContent: 'flex-end' }}>
                  <Button variant="secondary" onPress={composition.addPart}>
                    Add
                  </Button>
                </View>
              </CompositionRow>

              <Text variant="caption" color="muted" style={{ fontSize: 11, lineHeight: 15 }}>
                Not in inventory? Enter the name and price manually. Inventory items auto-fill SKU and sale price.
              </Text>
            </CompositionAddCard>

            <CompositionLineList
              empty="No parts selected yet"
              items={composition.regularPartLineItems}
              onRemove={composition.removePart}
            />
          </View>
        ) : null}

        {tab === 'motors' && motorsEnabled ? (
          <View style={{ gap: 14 }}>
            <CompositionAddCard title="Add motor">
              <CompositionField label="Motor serial">
                <AutocompleteInput
                  placeholder="Motor serial · Tab ↹"
                  value={composition.motorSerial}
                  fieldKey="motorSerial"
                  source="engineCode"
                  onValueChange={composition.setMotorSerial}
                  options={composerOptions.motorSerialOptions}
                  matchMode="flexible"
                />
              </CompositionField>

              <CompositionRow>
                <CompositionField label="Operation">
                  <Dropdown
                    value={composition.motorOutcome}
                    onValueChange={(value) =>
                      composition.setMotorOutcome(value as WorkOrderMotorOutcome)
                    }
                    options={MOTOR_OUTCOME_OPTIONS}
                  />
                </CompositionField>
                <CompositionField label="Price">
                  <Input
                    placeholder="Price"
                    value={composition.motorPrice}
                    onChangeText={composition.setMotorPrice}
                    keyboardType="number-pad"
                  />
                </CompositionField>
              </CompositionRow>

              <CompositionField label="Motor warranty">
                <Dropdown
                  value={composition.motorWarrantyTemplateId}
                  onValueChange={composition.setMotorWarrantyTemplateId}
                  options={motorWarrantyOptions}
                  placeholder="Company default"
                />
              </CompositionField>

              <Button variant="secondary" onPress={composition.addMotor}>
                Add
              </Button>
            </CompositionAddCard>

            <CompositionLineList
              empty="No motors added yet"
              items={composition.motorLineItems}
              onRemove={composition.removeMotor}
            />
          </View>
        ) : null}

        {tab === 'specific' && specificsEnabled && composition.quickSpecificCategories.length > 0 ? (
          <View style={{ gap: 14 }}>
            <CompositionAddCard
              title="Quick line item"
              description="Alternator, starter, body parts — not tracked in inventory"
            >
              <CompositionField label="Category">
                <Dropdown
                  value={composition.specificCategoryId}
                  onValueChange={composition.setSpecificCategoryId}
                  options={categoryOptions}
                  placeholder="Select…"
                />
              </CompositionField>

              <CompositionField label="Name">
                <Input
                  placeholder="Toyota 1NZ alternator"
                  value={composition.specificPartName}
                  onChangeText={composition.setSpecificPartName}
                />
              </CompositionField>

              <CompositionRow>
                <CompositionField label="Price, $">
                  <Input
                    value={composition.specificPartPrice}
                    onChangeText={composition.setSpecificPartPrice}
                    keyboardType="number-pad"
                  />
                </CompositionField>
                <CompositionField label="Warranty">
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
                    borderRadius: wo.radiusSm,
                    borderWidth: wo.rule,
                    borderColor: colors.border,
                    backgroundColor: colors.secondary,
                  }}
                >
                  <Text variant="caption" color="muted" style={{ fontSize: 11 }}>
                    {warrantyTemplateLabel(composition.specificWarrantyTemplateId)}
                  </Text>
                </View>
              ) : null}

              <Button variant="secondary" onPress={composition.addSpecificPart}>
                Add
              </Button>
            </CompositionAddCard>

            <CompositionLineList
              empty="No catalog items added yet"
              items={composition.specificPartLineItems}
              onRemove={composition.removePart}
            />
          </View>
        ) : null}
      </ComposerTabPanel>
    </View>
  );
}
