"use client";

import { useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Car,
  CheckCircle2,
  Cog,
  Package,
  Save,
  User,
  Wrench,
} from "lucide-react";

import { CompanySpecificCategoryConfig } from "@/domain/company-config";
import { WARRANTY_TEMPLATE_IDS } from "@/domain/document-config";
import { WorkOrder, WorkOrderAssigneeRole, WorkOrderLaborPricingMode, WorkOrderMotorOutcome } from "@/domain/work-order";
import { getWarrantyTemplate } from "@/lib/documents/warranty/warranty-templates";
import { ClientEntity } from "@/domain/client";
import { VehicleEntity } from "@/domain/vehicle";
import { InventoryItem } from "@/domain/inventory";
import { MotorEntity } from "@/domain/motor";
import { CompanyEmployee } from "@/domain/rbac";
import { Button } from "@/components/ui/button";
import { DatalistInput, DatalistOption } from "@/components/ui/datalist-input";
import { SearchCombobox } from "@/components/ui/search-combobox";
import { FadeIn } from "@/components/ui/fade-in";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { EMPLOYEE_ROLE_LABELS } from "@/lib/work-order/work-order-display";
import {
  vehicleMakeOptions as buildVehicleMakeOptions,
  vehicleModelOptions as buildVehicleModelOptions,
} from "@/lib/vehicles/vehicle-catalog";
import { ROLE_LABELS } from "@/components/work-orders/work-order-copy";
import { laborLineLabel, money } from "@/components/work-orders/work-order-utils";

export type LaborDraft = {
  title: string;
  pricingMode: WorkOrderLaborPricingMode;
  hours: number;
  unitPrice: number;
  assigneeId: string;
  assigneeName: string;
  assigneeRole: WorkOrderAssigneeRole;
};

export type ComposerFormState = {
  clientId: string;
  clientName: string;
  clientPhone: string;
  vehicleId: string;
  vehicleMake: string;
  vehicleModel: string;
  vin: string;
  licensePlate: string;
  mileage: number;
  comment: string;
  laborDraft: LaborDraft;
  laborLines: WorkOrder["laborLines"];
  partSku: string;
  partName: string;
  partQuantity: number;
  partUnitPrice: number;
  partLines: WorkOrder["partLines"];
  specificCategoryId: string;
  specificPartName: string;
  specificPartPrice: number;
  specificWarrantyTemplateId: string;
  motorSerial: string;
  motorOutcome: WorkOrderMotorOutcome;
  motorPrice: number;
  motorWarrantyTemplateId: string;
  motorLines: WorkOrder["motorLines"];
  discount: number;
};

type WorkOrderComposerProps = {
  step: number;
  form: ComposerFormState;
  clients: ClientEntity[];
  vehicles: VehicleEntity[];
  inventoryItems: InventoryItem[];
  availableMotors: MotorEntity[];
  employees: CompanyEmployee[];
  currentUserId?: string;
  quickSpecificCategories?: CompanySpecificCategoryConfig[];
  editingLabel?: string;
  pricing: WorkOrder["pricing"];
  saving: boolean;
  canEdit: boolean;
  onStepChange: (step: number) => void;
  onFormChange: <K extends keyof ComposerFormState>(key: K, value: ComposerFormState[K]) => void;
  onLaborDraftChange: (patch: Partial<LaborDraft>) => void;
  onClientSelect: (clientId: string) => void;
  onVehicleSelect: (vehicleId: string) => void;
  onAddLabor: () => void;
  onAddPart: () => void;
  onAddSpecificPart: () => void;
  onAddMotor: () => void;
  onRemoveLabor: (index: number) => void;
  onRemovePart: (index: number) => void;
  onRemovePartById: (lineId: string) => void;
  onRemoveMotor: (index: number) => void;
  onSave: () => void;
  onCancel: () => void;
};

const STEPS = [
  { id: 1, label: "Клиент и авто", icon: User },
  { id: 2, label: "Состав заказа", icon: Wrench },
  { id: 3, label: "Проверка", icon: Save },
] as const;

type VehicleFieldKey = "vehicleMake" | "vehicleModel" | "licensePlate" | "vin";

function uniqueOptions(values: string[]): DatalistOption[] {
  return [...new Set(values.filter(Boolean))].map((value) => ({ value }));
}

function vehiclesInContext(
  vehicles: VehicleEntity[],
  form: ComposerFormState,
  exclude?: VehicleFieldKey,
): VehicleEntity[] {
  return vehicles.filter((vehicle) => {
    if (
      exclude !== "vehicleMake" &&
      form.vehicleMake.trim() &&
      vehicle.make.toLowerCase() !== form.vehicleMake.trim().toLowerCase()
    ) {
      return false;
    }
    if (
      exclude !== "vehicleModel" &&
      form.vehicleModel.trim() &&
      vehicle.model.toLowerCase() !== form.vehicleModel.trim().toLowerCase()
    ) {
      return false;
    }
    if (
      exclude !== "licensePlate" &&
      form.licensePlate.trim() &&
      vehicle.licensePlate.toLowerCase() !== form.licensePlate.trim().toLowerCase()
    ) {
      return false;
    }
    if (exclude !== "vin" && form.vin.trim() && vehicle.vin.toLowerCase() !== form.vin.trim().toLowerCase()) {
      return false;
    }
    return true;
  });
}

export function WorkOrderComposer({
  step,
  form,
  clients,
  vehicles,
  inventoryItems,
  availableMotors,
  employees,
  currentUserId,
  quickSpecificCategories = [],
  editingLabel,
  pricing,
  saving,
  canEdit,
  onStepChange,
  onFormChange,
  onLaborDraftChange,
  onClientSelect,
  onVehicleSelect,
  onAddLabor,
  onAddPart,
  onAddSpecificPart,
  onAddMotor,
  onRemoveLabor,
  onRemovePart,
  onRemovePartById,
  onRemoveMotor,
  onSave,
  onCancel,
}: WorkOrderComposerProps) {
  const specificPartLines = useMemo(
    () => form.partLines.filter((line) => line.source === "specific_quick"),
    [form.partLines],
  );
  const regularPartLines = useMemo(
    () => form.partLines.filter((line) => line.source !== "specific_quick"),
    [form.partLines],
  );

  const clientVehicles = useMemo(
    () => vehicles.filter((vehicle) => !form.clientId || vehicle.clientId === form.clientId),
    [form.clientId, vehicles],
  );

  const clientNameOptions = useMemo(
    () => clients.map((client) => ({ value: client.fullName })),
    [clients],
  );
  const clientPhoneOptions = useMemo(
    () => clients.map((client) => ({ value: client.phone, label: client.fullName })),
    [clients],
  );
  const vehicleMakeOptionsList = useMemo(
    () =>
      buildVehicleMakeOptions(
        vehiclesInContext(clientVehicles, form, "vehicleMake").map((vehicle) => vehicle.make),
      ),
    [clientVehicles, form],
  );
  const vehicleModelOptionsList = useMemo(
    () =>
      buildVehicleModelOptions(
        form.vehicleMake,
        vehiclesInContext(clientVehicles, form, "vehicleModel").map((vehicle) => vehicle.model),
      ),
    [clientVehicles, form],
  );
  const licensePlateOptions = useMemo(
    () =>
      uniqueOptions(
        vehiclesInContext(clientVehicles, form, "licensePlate")
          .map((vehicle) => vehicle.licensePlate)
          .filter(Boolean),
      ),
    [clientVehicles, form],
  );
  const vinOptions = useMemo(
    () =>
      uniqueOptions(
        vehiclesInContext(clientVehicles, form, "vin")
          .map((vehicle) => vehicle.vin)
          .filter(Boolean),
      ),
    [clientVehicles, form],
  );

  function detachVehicleLink() {
    if (form.vehicleId) onFormChange("vehicleId", "");
  }

  function commitVehicleByPlate(value: string) {
    const vehicle = clientVehicles.find(
      (entry) => entry.licensePlate.toLowerCase() === value.trim().toLowerCase(),
    );
    if (vehicle) onVehicleSelect(vehicle.id);
  }

  function commitVehicleByVin(value: string) {
    const vehicle = clientVehicles.find((entry) => entry.vin.toLowerCase() === value.trim().toLowerCase());
    if (vehicle) onVehicleSelect(vehicle.id);
  }
  const assigneeOptions = useMemo(
    () =>
      employees.map((employee) => ({
        value: employee.fullName || employee.email,
        label: EMPLOYEE_ROLE_LABELS[employee.role] ?? employee.role,
      })),
    [employees],
  );

  function resolveAssigneeRole(employee: CompanyEmployee): WorkOrderAssigneeRole {
    if (employee.role === "diagnostician") return "diagnostician";
    if (employee.role === "manager" || employee.role === "owner" || employee.role === "admin") {
      return "manager";
    }
    return "mechanic";
  }

  function assigneeRoleLabel(employee: CompanyEmployee): string {
    return EMPLOYEE_ROLE_LABELS[employee.role] ?? ROLE_LABELS[resolveAssigneeRole(employee)];
  }

  function commitAssignee(value: string) {
    const employee = employees.find((entry) => (entry.fullName || entry.email) === value);
    if (!employee) return;
    onLaborDraftChange({
      assigneeName: employee.fullName || employee.email,
      assigneeId: employee.uid,
      assigneeRole: resolveAssigneeRole(employee),
    });
  }

  function tryResolveAssigneeByName(name: string) {
    const normalized = name.trim().toLowerCase();
    if (!normalized) return;
    const employee = employees.find(
      (entry) => (entry.fullName || entry.email).toLowerCase() === normalized,
    );
    if (employee) commitAssignee(employee.fullName || employee.email);
  }

  function assignSelf() {
    if (!currentUserId) return;
    const employee = employees.find((entry) => entry.uid === currentUserId);
    if (employee) {
      commitAssignee(employee.fullName || employee.email);
      return;
    }
    onLaborDraftChange({
      assigneeId: currentUserId,
      assigneeName: "Я",
      assigneeRole: "mechanic",
    });
  }
  const partSkuOptions = useMemo(
    () => inventoryItems.map((item) => ({ value: item.sku, label: item.name })),
    [inventoryItems],
  );
  const partNameOptions = useMemo(
    () => inventoryItems.map((item) => ({ value: item.name, label: item.sku })),
    [inventoryItems],
  );
  const motorSerialOptions = useMemo(
    () =>
      availableMotors.map((motor) => ({
        value: motor.serialCode,
        label: [motor.serialCode, motor.brandName, motor.engineCode, motor.configuration]
          .filter(Boolean)
          .join(" · "),
      })),
    [availableMotors],
  );

  const isHourlyLabor = form.laborDraft.pricingMode === "hourly";
  const laborDraftTotal = isHourlyLabor
    ? (Number(form.laborDraft.hours) || 0) * (Number(form.laborDraft.unitPrice) || 0)
    : Number(form.laborDraft.unitPrice) || 0;
  const canAddLabor =
    form.laborDraft.title.trim().length > 0 &&
    Boolean(form.laborDraft.assigneeId || form.laborDraft.assigneeName.trim()) &&
    (isHourlyLabor
      ? Number(form.laborDraft.hours) > 0 && Number(form.laborDraft.unitPrice) > 0
      : Number(form.laborDraft.unitPrice) > 0);

  const step1Valid = form.clientName.trim() && form.clientPhone.trim() && (form.vin.trim() || form.licensePlate.trim());

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="border-b bg-card/60 px-6 py-4 backdrop-blur-sm">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">
              {editingLabel ?? "Новый заказ-наряд"}
            </h2>
            <p className="text-sm text-muted-foreground">Три шага — клиент, работы, сохранение</p>
          </div>
          <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
            Отмена
          </Button>
        </div>

        <ol className="mt-4 flex gap-2">
          {STEPS.map((item) => {
            const Icon = item.icon;
            const active = step === item.id;
            const done = step > item.id;
            return (
              <li key={item.id} className="flex min-w-0 flex-1 items-center gap-2">
                <button
                  type="button"
                  onClick={() => item.id < step && onStepChange(item.id)}
                  className={cn(
                    "flex min-w-0 flex-1 items-center gap-2 rounded-lg border px-3 py-2 text-left transition-all duration-200",
                    active && "border-primary/40 bg-primary/5",
                    done && "border-emerald-500/30 bg-emerald-500/5",
                    !active && !done && "border-border/60 bg-muted/20",
                  )}
                >
                  <span
                    className={cn(
                      "flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                      active && "bg-primary text-primary-foreground",
                      done && "bg-emerald-600 text-white",
                      !active && !done && "bg-muted text-muted-foreground",
                    )}
                  >
                    {item.id}
                  </span>
                  <span className="min-w-0 truncate text-xs font-medium">{item.label}</span>
                  <Icon className="ml-auto size-3.5 shrink-0 text-muted-foreground" />
                </button>
              </li>
            );
          })}
        </ol>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
        {step === 1 ? (
          <FadeIn key="composer-step-1" className="mx-auto max-w-2xl space-y-6">
            <Section icon={User} title="Клиент" description="Подсказка прямо в поле — Tab ↹ принять">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="ФИО клиента" required hint="Tab ↹">
                  <DatalistInput
                    id="work-order-client-name"
                    value={form.clientName}
                    onValueChange={(value) => onFormChange("clientName", value)}
                    options={clientNameOptions}
                    onOptionCommit={(value) => {
                      const client = clients.find((entry) => entry.fullName === value);
                      if (client) onClientSelect(client.id);
                    }}
                    placeholder="Иванов Алексей"
                  />
                </Field>
                <Field label="Телефон" required hint="Tab ↹">
                  <DatalistInput
                    value={form.clientPhone}
                    onValueChange={(value) => onFormChange("clientPhone", value)}
                    options={clientPhoneOptions}
                    onOptionCommit={(value) => {
                      const client = clients.find((entry) => entry.phone === value);
                      if (client) onClientSelect(client.id);
                    }}
                    placeholder="+7 777 000 00 00"
                  />
                </Field>
              </div>
            </Section>

            <Section icon={Car} title="Автомобиль" description="Марка и модель — из каталога, госномер и VIN — из авто клиента">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Марка">
                  <SearchCombobox
                    value={form.vehicleMake}
                    onValueChange={(value) => {
                      detachVehicleLink();
                      onFormChange("vehicleMake", value);
                      if (
                        form.vehicleModel &&
                        !buildVehicleModelOptions(value, [form.vehicleModel]).some(
                          (option) => option.value.toLowerCase() === form.vehicleModel.toLowerCase(),
                        )
                      ) {
                        onFormChange("vehicleModel", "");
                      }
                    }}
                    options={vehicleMakeOptionsList}
                    placeholder="Toyota"
                    emptyMessage="Марка не найдена — можно ввести вручную"
                  />
                </Field>
                <Field label="Модель">
                  <SearchCombobox
                    value={form.vehicleModel}
                    onValueChange={(value) => {
                      detachVehicleLink();
                      onFormChange("vehicleModel", value);
                    }}
                    options={vehicleModelOptionsList}
                    placeholder={form.vehicleMake.trim() ? "Camry" : "Сначала выберите марку"}
                    emptyMessage={
                      form.vehicleMake.trim()
                        ? "Модель не найдена — можно ввести вручную"
                        : "Укажите марку"
                    }
                    disabled={!form.vehicleMake.trim()}
                  />
                </Field>
                <Field label="Госномер">
                  <DatalistInput
                    value={form.licensePlate}
                    onValueChange={(value) => {
                      detachVehicleLink();
                      onFormChange("licensePlate", value.toUpperCase());
                    }}
                    options={licensePlateOptions}
                    matchMode="flexible"
                    onOptionCommit={commitVehicleByPlate}
                    placeholder="123 ABC 01"
                  />
                </Field>
                <Field label="VIN">
                  <DatalistInput
                    value={form.vin}
                    onValueChange={(value) => {
                      detachVehicleLink();
                      onFormChange("vin", value.toUpperCase());
                    }}
                    options={vinOptions}
                    matchMode="flexible"
                    onOptionCommit={commitVehicleByVin}
                    placeholder="JTDBT923…"
                  />
                </Field>
                <Field label="Пробег, км">
                  <Input
                    type="number"
                    value={form.mileage || ""}
                    onChange={(event) => onFormChange("mileage", Number(event.target.value) || 0)}
                    placeholder="125000"
                  />
                </Field>
              </div>
              <Field label="Комментарий / жалобы клиента">
                <Textarea
                  value={form.comment}
                  onChange={(event) => onFormChange("comment", event.target.value)}
                  placeholder="Стук при холодном пуске, просит проверить компрессию…"
                  className="min-h-[88px] resize-none"
                />
              </Field>
            </Section>
          </FadeIn>
        ) : null}

        {step === 2 ? (
          <FadeIn key="composer-step-2" className="mx-auto max-w-3xl">
            <Tabs defaultValue="labor">
              <TabsList className="mb-4 w-full justify-start">
                <TabsTrigger value="labor" className="gap-1.5">
                  <Wrench className="size-3.5" />
                  Работы
                  {form.laborLines.length > 0 ? (
                    <span className="rounded-full bg-primary/10 px-1.5 text-[10px] text-primary">
                      {form.laborLines.length}
                    </span>
                  ) : null}
                </TabsTrigger>
                <TabsTrigger value="parts" className="gap-1.5">
                  <Package className="size-3.5" />
                  Запчасти
                  {regularPartLines.length > 0 ? (
                    <span className="rounded-full bg-primary/10 px-1.5 text-[10px] text-primary">
                      {regularPartLines.length}
                    </span>
                  ) : null}
                </TabsTrigger>
                <TabsTrigger value="motors" className="gap-1.5">
                  <Cog className="size-3.5" />
                  Двигатели
                  {form.motorLines.length > 0 ? (
                    <span className="rounded-full bg-primary/10 px-1.5 text-[10px] text-primary">
                      {form.motorLines.length}
                    </span>
                  ) : null}
                </TabsTrigger>
                {quickSpecificCategories.length > 0 ? (
                  <TabsTrigger value="specific" className="gap-1.5">
                    <Package className="size-3.5" />
                    Специфичные
                    {specificPartLines.length > 0 ? (
                      <span className="rounded-full bg-primary/10 px-1.5 text-[10px] text-primary">
                        {specificPartLines.length}
                      </span>
                    ) : null}
                  </TabsTrigger>
                ) : null}
              </TabsList>

              <TabsContent value="labor" className="space-y-4">
                <AddRowCard title="Добавить работу">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Наименование" required>
                      <Input
                        value={form.laborDraft.title}
                        onChange={(event) => onLaborDraftChange({ title: event.target.value })}
                        placeholder="Замена двигателя"
                      />
                    </Field>
                    <Field label="Тип оплаты">
                      <select
                        className={selectClass}
                        value={form.laborDraft.pricingMode}
                        onChange={(event) =>
                          onLaborDraftChange({
                            pricingMode: event.target.value as WorkOrderLaborPricingMode,
                          })
                        }
                      >
                        <option value="fixed">Фикс. сумма → зарплата</option>
                        <option value="hourly">Почасовая → зарплата</option>
                      </select>
                    </Field>
                  </div>

                  <div className={cn("mt-4 grid gap-4", isHourlyLabor ? "sm:grid-cols-3" : "sm:grid-cols-2")}>
                    {isHourlyLabor ? (
                      <Field label="Нормо-часы">
                        <Input
                          type="number"
                          min={0}
                          step={0.5}
                          value={form.laborDraft.hours}
                          onChange={(event) => onLaborDraftChange({ hours: Number(event.target.value) })}
                          placeholder="2.5"
                        />
                      </Field>
                    ) : null}
                    <Field label={isHourlyLabor ? "Ставка, ₸/час" : "Сумма работы, ₸"}>
                      <Input
                        type="number"
                        min={0}
                        value={form.laborDraft.unitPrice || ""}
                        onChange={(event) => onLaborDraftChange({ unitPrice: Number(event.target.value) })}
                        placeholder={isHourlyLabor ? "5000" : "90000"}
                      />
                    </Field>
                    <Field label="Исполнитель" required hint="Tab ↹ или своё имя">
                      <div className="flex gap-2">
                        <DatalistInput
                          value={form.laborDraft.assigneeName}
                          onValueChange={(value) =>
                            onLaborDraftChange({ assigneeName: value, assigneeId: "" })
                          }
                          options={assigneeOptions}
                          onOptionCommit={commitAssignee}
                          onBlur={(event) =>
                            tryResolveAssigneeByName((event.target as HTMLInputElement).value)
                          }
                          placeholder="Сотрудник или ФИО"
                          className={cn(
                            "min-w-0 flex-1",
                            form.laborDraft.assigneeId && "border-emerald-500/50 ring-emerald-500/10",
                          )}
                        />
                        {currentUserId ? (
                          <Button type="button" variant="outline" size="sm" onClick={assignSelf}>
                            Я
                          </Button>
                        ) : null}
                      </div>
                    </Field>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-dashed pt-4">
                    <div className="min-w-0 space-y-1">
                      {form.laborDraft.assigneeId ? (
                        <p className="flex items-center gap-1.5 text-xs text-emerald-700 animate-autocore-fade-in motion-reduce:animate-none">
                          <CheckCircle2 className="size-3.5 shrink-0" />
                          <span>
                            {(() => {
                              const employee = employees.find((entry) => entry.uid === form.laborDraft.assigneeId);
                              return employee
                                ? assigneeRoleLabel(employee)
                                : ROLE_LABELS[form.laborDraft.assigneeRole];
                            })()}{" "}
                            · {form.laborDraft.assigneeName}
                            {laborDraftTotal > 0 ? ` · ${money(laborDraftTotal)} → Зарплаты` : ""}
                          </span>
                        </p>
                      ) : employees.length === 0 ? (
                        <p className="text-xs text-amber-600">
                          Добавьте сотрудников в «Настройки → Сотрудники»
                        </p>
                      ) : form.laborDraft.assigneeName.trim() ? (
                        <p className="text-xs text-muted-foreground">
                          Внешний исполнитель · {form.laborDraft.assigneeName} — без начисления в зарплату
                        </p>
                      ) : (
                        <p className="text-xs text-muted-foreground">
                          Сотрудник из списка, кнопка «Я» или произвольное имя
                        </p>
                      )}
                    </div>
                    <Button type="button" variant="secondary" disabled={!canAddLabor} onClick={onAddLabor}>
                      Добавить
                    </Button>
                  </div>
                </AddRowCard>
                <LineItems
                  empty="Работы не добавлены — можно сохранить черновик и дополнить позже"
                  items={form.laborLines.map((line) => laborLineLabel(line, employees))}
                  onRemove={onRemoveLabor}
                />
              </TabsContent>

              <TabsContent value="parts" className="space-y-4">
                <AddRowCard title="Добавить запчасть" description="Со склада или разово — цена попадёт в накладную и бухгалтерию">
                  <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)_72px_96px_auto]">
                    <DatalistInput
                      value={form.partSku}
                      onValueChange={(value) => onFormChange("partSku", value)}
                      options={partSkuOptions}
                      onOptionCommit={(value) => {
                        const item = inventoryItems.find((entry) => entry.sku === value);
                        if (item) {
                          onFormChange("partSku", item.sku);
                          onFormChange("partName", item.name);
                          onFormChange(
                            "partUnitPrice",
                            item.sellPrice ?? item.averageCost ?? item.purchasePrice ?? 0,
                          );
                        }
                      }}
                      placeholder="Артикул (необяз.)"
                    />
                    <DatalistInput
                      value={form.partName}
                      onValueChange={(value) => onFormChange("partName", value)}
                      options={partNameOptions}
                      onOptionCommit={(value) => {
                        const item = inventoryItems.find((entry) => entry.name === value);
                        if (item) {
                          onFormChange("partSku", item.sku);
                          onFormChange("partName", item.name);
                          onFormChange(
                            "partUnitPrice",
                            item.sellPrice ?? item.averageCost ?? item.purchasePrice ?? 0,
                          );
                        }
                      }}
                      placeholder="Название"
                    />
                    <Input
                      type="number"
                      min={1}
                      value={form.partQuantity}
                      onChange={(event) => onFormChange("partQuantity", Number(event.target.value) || 1)}
                      aria-label="Количество"
                    />
                    <Input
                      type="number"
                      min={0}
                      value={form.partUnitPrice || ""}
                      onChange={(event) => onFormChange("partUnitPrice", Number(event.target.value) || 0)}
                      placeholder="Цена, ₸"
                      aria-label="Цена"
                    />
                    <Button type="button" variant="secondary" onClick={onAddPart}>
                      Добавить
                    </Button>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Нет на складе — введите название и цену вручную. Со склада подставятся артикул и цена продажи.
                  </p>
                </AddRowCard>
                <LineItems
                  empty="Запчасти не выбраны"
                  items={regularPartLines.map((line) => {
                    const tag = line.source === "adhoc" || !line.itemId ? " · разово" : "";
                    return `${line.name}${tag} × ${line.quantity} = ${money(line.quantity * line.unitPrice)}`;
                  })}
                  onRemove={(index) => {
                    const line = regularPartLines[index];
                    if (line) onRemovePartById(line.id);
                  }}
                />
              </TabsContent>

              <TabsContent value="motors" className="space-y-4">
                <AddRowCard title="Добавить двигатель">
                  <div className="grid gap-3 sm:grid-cols-[1fr_140px_140px_auto]">
                    <DatalistInput
                      value={form.motorSerial}
                      onValueChange={(value) => onFormChange("motorSerial", value)}
                      options={motorSerialOptions}
                      matchMode="flexible"
                      placeholder="Номер двигателя · Tab ↹"
                    />
                    <select
                      className={selectClass}
                      value={form.motorOutcome}
                      onChange={(event) =>
                        onFormChange("motorOutcome", event.target.value as WorkOrderMotorOutcome)
                      }
                    >
                      <option value="install">Установка</option>
                      <option value="sell">Продажа</option>
                    </select>
                    <Input
                      type="number"
                      value={form.motorPrice || ""}
                      onChange={(event) => onFormChange("motorPrice", Number(event.target.value))}
                      placeholder="Цена"
                    />
                    <Button type="button" variant="secondary" onClick={onAddMotor}>
                      Добавить
                    </Button>
                  </div>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    <Field label="Гарантия на двигатель">
                      <select
                        className={selectClass}
                        value={form.motorWarrantyTemplateId}
                        onChange={(event) => onFormChange("motorWarrantyTemplateId", event.target.value)}
                      >
                        <option value="">По умолчанию компании</option>
                        {WARRANTY_TEMPLATE_IDS.map((id) => (
                          <option key={id} value={id}>
                            {getWarrantyTemplate(id).name}
                          </option>
                        ))}
                        <option value="no_warranty">Без гарантии</option>
                      </select>
                    </Field>
                  </div>
                </AddRowCard>
                <LineItems
                  empty="Двигатели не добавлены"
                  items={form.motorLines.map(
                    (line) =>
                      `${line.serialCode} · ${line.outcome === "install" ? "установка" : "продажа"} · ${money(line.unitPrice)}`,
                  )}
                  onRemove={onRemoveMotor}
                />
              </TabsContent>

              {quickSpecificCategories.length > 0 ? (
                <TabsContent value="specific" className="space-y-4">
                  <AddRowCard
                    title="Быстрая позиция"
                    description="Генератор, стартер, кузовные — без учёта на складе"
                  >
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Field label="Категория">
                        <select
                          className={selectClass}
                          value={form.specificCategoryId}
                          onChange={(event) => onFormChange("specificCategoryId", event.target.value)}
                        >
                          <option value="">Выберите…</option>
                          {quickSpecificCategories.map((category) => (
                            <option key={category.id} value={category.id}>
                              {category.name}
                            </option>
                          ))}
                        </select>
                      </Field>
                      <Field label="Название">
                        <Input
                          value={form.specificPartName}
                          onChange={(event) => onFormChange("specificPartName", event.target.value)}
                          placeholder="Генератор Toyota 1NZ"
                        />
                      </Field>
                      <Field label="Цена, ₸">
                        <Input
                          type="number"
                          min={0}
                          value={form.specificPartPrice || ""}
                          onChange={(event) =>
                            onFormChange("specificPartPrice", Number(event.target.value) || 0)
                          }
                        />
                      </Field>
                      <Field label="Гарантия">
                        <select
                          className={selectClass}
                          value={form.specificWarrantyTemplateId}
                          onChange={(event) =>
                            onFormChange("specificWarrantyTemplateId", event.target.value)
                          }
                        >
                          <option value="none">Без гарантии</option>
                          {WARRANTY_TEMPLATE_IDS.map((id) => (
                            <option key={id} value={id}>
                              {getWarrantyTemplate(id).name}
                            </option>
                          ))}
                        </select>
                      </Field>
                    </div>
                    <Button type="button" variant="secondary" className="mt-3" onClick={onAddSpecificPart}>
                      Добавить
                    </Button>
                  </AddRowCard>
                  <LineItems
                    empty="Специфичные позиции не добавлены"
                    items={specificPartLines.map((line) => {
                      const category = line.specificCategoryName ? `${line.specificCategoryName} · ` : "";
                      return `${category}${line.name} = ${money(line.unitPrice)}`;
                    })}
                    onRemove={(index) => {
                      const line = specificPartLines[index];
                      if (line) onRemovePartById(line.id);
                    }}
                  />
                </TabsContent>
              ) : null}
            </Tabs>
          </FadeIn>
        ) : null}

        {step === 3 ? (
          <FadeIn key="composer-step-3" className="mx-auto grid max-w-3xl gap-4 lg:grid-cols-2">
            <SummaryCard title="Клиент">
              <p className="font-medium">{form.clientName || "—"}</p>
              <p className="text-sm text-muted-foreground">{form.clientPhone || "—"}</p>
            </SummaryCard>
            <SummaryCard title="Автомобиль">
              <p className="font-medium">
                {[form.vehicleMake, form.vehicleModel].filter(Boolean).join(" ") || "—"}
              </p>
              <p className="text-sm text-muted-foreground">
                {[form.licensePlate, form.vin].filter(Boolean).join(" · ") || "—"}
                {form.mileage ? ` · ${form.mileage.toLocaleString("ru-RU")} км` : ""}
              </p>
            </SummaryCard>
            <SummaryCard title="Состав" className="lg:col-span-2">
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li>Работ: {form.laborLines.length}</li>
                <li>
                  Запчастей:{" "}
                  {form.partLines.filter((line) => line.source !== "specific_quick").length}
                </li>
                {specificPartLines.length > 0 ? (
                  <li>Специфичных: {specificPartLines.length}</li>
                ) : null}
                <li>Двигателей: {form.motorLines.length}</li>
                {form.comment ? <li className="pt-2 text-foreground">«{form.comment}»</li> : null}
              </ul>
            </SummaryCard>
            <SummaryCard title="Скидка" className="lg:col-span-2">
              <Input
                type="number"
                min={0}
                value={form.discount || ""}
                onChange={(event) => onFormChange("discount", Number(event.target.value) || 0)}
                placeholder="0"
              />
            </SummaryCard>
          </FadeIn>
        ) : null}
      </div>

      <footer className="flex items-center justify-between gap-3 border-t bg-card/80 px-6 py-4 backdrop-blur-sm">
        <div className="min-w-0">
          <p className="text-lg font-semibold tabular-nums">{money(pricing.grandTotal)}</p>
          <p className="truncate text-xs text-muted-foreground">
            Работы {money(pricing.laborTotal)} · Запчасти {money(pricing.partsTotal)} · Двигатели{" "}
            {money(pricing.motorsTotal)}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {step > 1 ? (
            <Button type="button" variant="outline" onClick={() => onStepChange(step - 1)}>
              <ArrowLeft className="size-4" />
              Назад
            </Button>
          ) : null}
          {step < 3 ? (
            <Button
              type="button"
              disabled={step === 1 && !step1Valid}
              onClick={() => onStepChange(step + 1)}
            >
              Далее
              <ArrowRight className="size-4" />
            </Button>
          ) : (
            <Button type="button" disabled={!canEdit || saving || !step1Valid} onClick={onSave}>
              <Save className="size-4" />
              {saving ? "Сохранение…" : "Сохранить черновик"}
            </Button>
          )}
        </div>
      </footer>
    </div>
  );
}

const selectClass =
  "flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50";

function Section({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: typeof User;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border bg-card p-4 shadow-sm">
      <div className="mb-4 flex items-start gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="size-4" />
        </span>
        <div>
          <h3 className="font-semibold">{title}</h3>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function Field({
  label,
  required,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <Label className="text-xs font-medium text-muted-foreground">
          {label}
          {required ? <span className="text-destructive"> *</span> : null}
        </Label>
        {hint ? (
          <span className="shrink-0 text-[10px] tabular-nums text-muted-foreground/60">{hint}</span>
        ) : null}
      </div>
      {children}
    </div>
  );
}

function AddRowCard({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-dashed bg-muted/15 p-4 transition-colors duration-200 hover:bg-muted/20">
      <div className="mb-3 space-y-0.5">
        <p className="text-sm font-medium">{title}</p>
        {description ? <p className="text-xs text-muted-foreground">{description}</p> : null}
      </div>
      {children}
    </div>
  );
}

function LineItems({
  empty,
  items,
  onRemove,
}: {
  empty: string;
  items: string[];
  onRemove: (index: number) => void;
}) {
  if (items.length === 0) {
    return (
      <FadeIn>
        <p className="rounded-lg bg-muted/30 px-3 py-4 text-center text-sm text-muted-foreground">{empty}</p>
      </FadeIn>
    );
  }
  return (
    <ul className="overflow-hidden rounded-xl border bg-card">
      <AnimatePresence initial={false}>
        {items.map((item, index) => (
          <motion.li
            key={`${index}-${item}`}
            layout
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="flex items-center justify-between gap-3 border-b px-3 py-2.5 text-sm last:border-b-0"
          >
            <span className="min-w-0 truncate">{item}</span>
            <button
              type="button"
              className="shrink-0 text-xs text-muted-foreground transition-colors hover:text-destructive"
              onClick={() => onRemove(index)}
            >
              Удалить
            </button>
          </motion.li>
        ))}
      </AnimatePresence>
    </ul>
  );
}

function SummaryCard({
  title,
  className,
  children,
}: {
  title: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("rounded-xl border bg-card p-4", className)}>
      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">{title}</p>
      {children}
    </div>
  );
}
