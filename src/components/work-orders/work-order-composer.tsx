"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
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
import { categoryDisplayName } from "@/lib/inventory/category-display-name";
import { formatMotorLineLabel } from "@/lib/motors/format-motor-display-name";
import { ClientEntity } from "@/domain/client";
import { VehicleEntity } from "@/domain/vehicle";
import { InventoryItem } from "@/domain/inventory";
import { MotorEntity } from "@/domain/motor";
import { CompanyEmployee } from "@/domain/rbac";
import { Button } from "@/components/ui/button";
import { SearchCombobox } from "@/components/ui/search-combobox";
import { FadeIn } from "@/components/ui/fade-in";
import { GroupedNumberInput } from "@/components/ui/grouped-number-input";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { modShortcutLabel } from "@/lib/grid/grid-keyboard-shortcuts";
import { cn } from "@/lib/utils";
import { EMPLOYEE_ROLE_LABELS } from "@/lib/work-order/work-order-display";
import {
  listVehicleMakes,
  listVehicleModels,
  vehicleMakeOptions as buildVehicleMakeOptions,
  vehicleModelOptions as buildVehicleModelOptions,
} from "@/lib/vehicles/vehicle-catalog";
import { ROLE_LABELS } from "@/components/work-orders/work-order-copy";
import { userCopy } from "@/lib/user-copy";
import {
  WORK_ORDERS_MOTION_EASE,
} from "@/components/work-orders/work-orders-motion";
import { laborLineLabel, money } from "@/components/work-orders/work-order-utils";
import {
  buildAssigneeOptions,
  buildLaborTitleOptions,
  buildMotorSerialOptions,
  buildPartNameOptions,
  buildPartSkuOptions,
  buildPlateOptions,
  buildVinOptions,
  toSearchOptions,
} from "@/lib/work-order/build-composer-suggestions";
import { rememberComposerFieldValue } from "@/lib/work-order/composer-field-memory";
import { emitGuideSignal } from "@/lib/guides/signals";
import { formatGroupedNumber } from "@/lib/money/format-number";
import type { SearchOption } from "@/lib/search/filter-options";
import { KnowledgeKitBanner } from "@/components/knowledge/knowledge-kit-banner";
import { KnowledgeSuggestionChips } from "@/components/knowledge/knowledge-suggestion-chips";
import { useKnowledgeSuggestions } from "@/hooks/use-knowledge-suggestions";
import type { KnowledgeSuggestion } from "@/domain/knowledge/types";

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
  companyId?: string;
  orders?: WorkOrder[];
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
  onCancel: () => void;
  onSave?: () => void;
};

type VehicleFieldKey = "vehicleMake" | "vehicleModel" | "licensePlate" | "vin";

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
  companyId,
  orders = [],
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
  onCancel,
  onSave,
}: WorkOrderComposerProps) {
  const wo = userCopy.workOrders;
  const c = wo.composer;
  const d = wo.detail;
  const STEPS = [
    { id: 1, label: c.steps.clientVehicle, icon: User },
    { id: 2, label: c.steps.lines, icon: Wrench },
    { id: 3, label: c.steps.review, icon: Save },
  ] as const;

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

  const clientNameOptions = useMemo<SearchOption[]>(
    () =>
      clients.slice(0, 120).map((client) => ({
        value: client.fullName,
        label: client.fullName,
        description: client.phone || undefined,
        keywords: client.phone,
      })),
    [clients],
  );
  const clientPhoneOptions = useMemo<SearchOption[]>(
    () =>
      clients.slice(0, 120).map((client) => ({
        value: client.phone,
        label: client.phone,
        description: client.fullName || undefined,
        keywords: client.fullName,
      })),
    [clients],
  );
  const vehicleMakeOptionsList = useMemo(() => {
    const clientMakes = vehicles.map((vehicle) => vehicle.make).filter(Boolean);
    const motorMakes: string[] = [];
    const seenMotorMakes = new Set<string>();
    for (const motor of availableMotors) {
      const brand = motor.brandName?.trim();
      if (!brand) continue;
      const key = brand.toLowerCase();
      if (seenMotorMakes.has(key)) continue;
      seenMotorMakes.add(key);
      motorMakes.push(brand);
    }
    return buildVehicleMakeOptions([...clientMakes, ...motorMakes]);
  }, [availableMotors, vehicles]);
  const vehicleModelOptionsList = useMemo(() => {
    const make = form.vehicleMake.trim().toLowerCase();
    const clientModels = vehicles
      .filter((vehicle) => !make || vehicle.make.trim().toLowerCase() === make)
      .map((vehicle) => vehicle.model)
      .filter(Boolean);
    return buildVehicleModelOptions(form.vehicleMake, clientModels);
  }, [form.vehicleMake, vehicles]);
  const licensePlateOptions = useMemo(
    () =>
      toSearchOptions(
        buildPlateOptions(
          companyId,
          vehiclesInContext(clientVehicles, form, "licensePlate")
            .map((vehicle) => vehicle.licensePlate)
            .filter(Boolean),
        ),
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only vehicle-matching fields
    [clientVehicles, companyId, form.clientId, form.vehicleMake, form.vehicleModel, form.vin],
  );
  const vinOptions = useMemo(
    () =>
      toSearchOptions(
        buildVinOptions(
          companyId,
          vehiclesInContext(clientVehicles, form, "vin")
            .map((vehicle) => vehicle.vin)
            .filter(Boolean) as string[],
        ),
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only vehicle-matching fields
    [
      clientVehicles,
      companyId,
      form.clientId,
      form.vehicleMake,
      form.vehicleModel,
      form.licensePlate,
    ],
  );

  function detachVehicleLink() {
    if (form.vehicleId) onFormChange("vehicleId", "");
  }

  function commitVehicleByPlate(value: string) {
    rememberComposerFieldValue(companyId, "licensePlate", value);
    const vehicle = clientVehicles.find(
      (entry) => entry.licensePlate.toLowerCase() === value.trim().toLowerCase(),
    );
    if (vehicle) onVehicleSelect(vehicle.id);
  }

  function commitVehicleByVin(value: string) {
    rememberComposerFieldValue(companyId, "vin", value);
    const vehicle = clientVehicles.find((entry) => entry.vin.toLowerCase() === value.trim().toLowerCase());
    if (vehicle) onVehicleSelect(vehicle.id);
  }
  const assigneeOptions = useMemo(
    () => toSearchOptions(buildAssigneeOptions(companyId, employees)),
    [companyId, employees],
  );
  const laborTitleOptions = useMemo(
    () =>
      toSearchOptions(
        buildLaborTitleOptions(
          companyId,
          orders,
          form.laborLines.map((line) => line.title),
        ),
      ),
    [companyId, form.laborLines, orders],
  );

  const prevLaborCountRef = useRef(form.laborLines.length);
  const [highlightLaborId, setHighlightLaborId] = useState<string | null>(null);

  useEffect(() => {
    if (form.laborLines.length > prevLaborCountRef.current) {
      const added = form.laborLines[form.laborLines.length - 1];
      if (added) {
        setHighlightLaborId(added.id);
        const timer = window.setTimeout(() => setHighlightLaborId(null), 1400);
        prevLaborCountRef.current = form.laborLines.length;
        return () => window.clearTimeout(timer);
      }
    }
    prevLaborCountRef.current = form.laborLines.length;
  }, [form.laborLines]);

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
    rememberComposerFieldValue(companyId, "assignee", value);
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
      assigneeName: c.me,
      assigneeRole: "mechanic",
    });
  }
  const partSkuOptions = useMemo(
    () => toSearchOptions(buildPartSkuOptions(companyId, inventoryItems)),
    [companyId, inventoryItems],
  );
  const partNameOptions = useMemo(
    () => toSearchOptions(buildPartNameOptions(companyId, inventoryItems)),
    [companyId, inventoryItems],
  );
  const motorSerialOptions = useMemo(
    () =>
      toSearchOptions(
        buildMotorSerialOptions(companyId, availableMotors, (motor) =>
          formatMotorLineLabel(motor, { includeSerial: true }),
        ),
      ),
    [availableMotors, companyId],
  );

  const primaryEngineCode = useMemo(() => {
    const fromMotors = form.motorLines.map((line) => line.engineCode?.trim()).find(Boolean);
    if (fromMotors) return fromMotors;
    const serial = form.motorSerial.trim().toLowerCase();
    const motor = availableMotors.find((item) => item.serialCode.trim().toLowerCase() === serial);
    return motor?.engineCode?.trim() || "";
  }, [availableMotors, form.motorLines, form.motorSerial]);

  const primaryBrandName = useMemo(() => {
    const fromMotors = form.motorLines.map((line) => line.brandName?.trim()).find(Boolean);
    if (fromMotors) return fromMotors;
    return form.vehicleMake.trim();
  }, [form.motorLines, form.vehicleMake]);

  const knowledgeEnabled = Boolean(companyId) && canEdit;
  const { suggestions: knowledgeSuggestions, accept: acceptKnowledge, dismiss: dismissKnowledge } =
    useKnowledgeSuggestions({
      enabled: knowledgeEnabled && (step === 1 || step === 2),
      companyId,
      engineCode: step === 2 ? primaryEngineCode || undefined : undefined,
      brandName: primaryBrandName || undefined,
      clientId: form.clientId || undefined,
      mechanicId: form.laborDraft.assigneeId || undefined,
      limit: 12,
    });

  const kitSuggestions = useMemo(
    () => knowledgeSuggestions.filter((item) => item.kind === "kit" || item.kind === "mechanic"),
    [knowledgeSuggestions],
  );
  const companionSuggestions = useMemo(
    () =>
      knowledgeSuggestions.filter(
        (item) => item.kind === "cooccur" || item.kind === "fbt" || item.kind === "field",
      ),
    [knowledgeSuggestions],
  );
  const clientPrefSuggestions = useMemo(
    () => knowledgeSuggestions.filter((item) => item.kind === "client_prefs"),
    [knowledgeSuggestions],
  );

  const [kitDismissed, setKitDismissed] = useState(false);

  function applyKnowledgeSuggestion(suggestion: KnowledgeSuggestion) {
    const sku = typeof suggestion.payload.sku === "string" ? suggestion.payload.sku : "";
    const laborTitle =
      typeof suggestion.payload.laborTitle === "string"
        ? suggestion.payload.laborTitle
        : suggestion.title.startsWith("labor:")
          ? suggestion.title.slice("labor:".length)
          : "";
    const keys = Array.isArray(suggestion.payload.keys)
      ? suggestion.payload.keys.filter((key): key is string => typeof key === "string")
      : [];

    if (sku || keys.some((key) => !key.startsWith("labor:"))) {
      const resolvedSku = sku || keys.find((key) => !key.startsWith("labor:")) || suggestion.title;
      const inventory = inventoryItems.find(
        (item) => item.sku.trim().toLowerCase() === resolvedSku.trim().toLowerCase(),
      );
      onFormChange("partSku", inventory?.sku ?? resolvedSku);
      onFormChange("partName", inventory?.name ?? suggestion.title);
      if (inventory && typeof inventory.sellPrice === "number") {
        onFormChange("partUnitPrice", inventory.sellPrice);
      }
      onAddPart();
    } else if (laborTitle || keys.some((key) => key.startsWith("labor:"))) {
      const title =
        laborTitle ||
        keys.find((key) => key.startsWith("labor:"))?.slice("labor:".length) ||
        suggestion.title;
      onLaborDraftChange({ title });
    } else if (suggestion.kind === "client_prefs") {
      const fieldKey = typeof suggestion.payload.fieldKey === "string" ? suggestion.payload.fieldKey : "";
      const value = typeof suggestion.payload.label === "string" ? suggestion.payload.label : suggestion.title;
      if (fieldKey === "vehicleMake") onFormChange("vehicleMake", value);
      if (fieldKey === "vehicleModel") onFormChange("vehicleModel", value);
      if (fieldKey === "paymentMethod") {
        // no composer field — ignore
      }
    }

    void acceptKnowledge(suggestion);
  }

  function applyKit(items: KnowledgeSuggestion[]) {
    for (const item of items) {
      applyKnowledgeSuggestion(item);
    }
    setKitDismissed(true);
  }

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
    <div
      className="flex h-full min-h-0 flex-col"
      data-guide="work-order-composer"
      data-guide-complete={step >= 2 ? "true" : "false"}
    >
      <div className="border-b bg-card/60 px-6 py-4 backdrop-blur-sm">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">
              {editingLabel ?? wo.newOrder}
            </h2>
            <p className="text-sm text-muted-foreground">{c.subtitle}</p>
          </div>
          <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
            {c.cancel}
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
            {clientPrefSuggestions.length > 0 ? (
              <div className="space-y-1.5">
                <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  {c.clientPrefsHint}
                </p>
                <KnowledgeSuggestionChips
                  suggestions={clientPrefSuggestions.slice(0, 6)}
                  onAccept={applyKnowledgeSuggestion}
                  onDismiss={(suggestion) => void dismissKnowledge(suggestion)}
                />
              </div>
            ) : null}
            <Section icon={User} title={c.clientSection} description={c.clientSectionDesc}>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label={c.clientName}
                  required
                  guideId="work-order-client"
                  complete={Boolean(form.clientName.trim() && (form.vin.trim() || form.licensePlate.trim()))}
                >
                  <SearchCombobox
                    value={form.clientName}
                    onValueChange={(value) => {
                      onFormChange("clientName", value);
                      if (!form.clientId) return;
                      const selected = clients.find((entry) => entry.id === form.clientId);
                      if (!selected || selected.fullName !== value) {
                        onFormChange("clientId", "");
                        if (form.vehicleId) onFormChange("vehicleId", "");
                      }
                    }}
                    onOptionSelect={(value) => {
                      const client = clients.find((entry) => entry.fullName === value);
                      if (client) onClientSelect(client.id);
                    }}
                    options={clientNameOptions}
                    placeholder={c.clientNamePlaceholder}
                    emptyMessage={c.clientNameEmpty}
                  />
                </Field>
                <Field label={c.phone} required>
                  <SearchCombobox
                    value={form.clientPhone}
                    onValueChange={(value) => {
                      onFormChange("clientPhone", value);
                      if (!form.clientId) return;
                      const selected = clients.find((entry) => entry.id === form.clientId);
                      if (!selected || selected.phone !== value) {
                        onFormChange("clientId", "");
                        if (form.vehicleId) onFormChange("vehicleId", "");
                      }
                    }}
                    onOptionSelect={(value) => {
                      const client = clients.find((entry) => entry.phone === value);
                      if (client) onClientSelect(client.id);
                    }}
                    options={clientPhoneOptions}
                    placeholder="+7 777 000 00 00"
                    emptyMessage={c.phoneEmpty}
                  />
                </Field>
              </div>
            </Section>

            <Section
              icon={Car}
              title={c.vehicleSection}
              description={c.vehicleSectionDesc}
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label={c.make}>
                  <SearchCombobox
                    value={form.vehicleMake}
                    onValueChange={(value) => {
                      detachVehicleLink();
                      const previousMake = form.vehicleMake.trim();
                      const nextMake = value.trim();
                      onFormChange("vehicleMake", value);

                      // While typing a free-form brand, keep the model.
                      // Clear only when brand is wiped or replaced with another known catalog make
                      // whose catalog does not include the current model.
                      if (!nextMake) {
                        if (form.vehicleModel) onFormChange("vehicleModel", "");
                        return;
                      }
                      const nextIsKnownBrand = listVehicleMakes().some(
                        (entry) => entry.toLowerCase() === nextMake.toLowerCase(),
                      );
                      if (!nextIsKnownBrand) return;
                      if (previousMake.toLowerCase() === nextMake.toLowerCase()) return;

                      const model = form.vehicleModel.trim();
                      if (!model) return;
                      const modelAllowed =
                        listVehicleModels(value).some(
                          (entry) => entry.toLowerCase() === model.toLowerCase(),
                        ) ||
                        vehicles.some(
                          (vehicle) =>
                            vehicle.make.trim().toLowerCase() === nextMake.toLowerCase() &&
                            vehicle.model.trim().toLowerCase() === model.toLowerCase(),
                        );
                      if (!modelAllowed) onFormChange("vehicleModel", "");
                    }}
                    options={vehicleMakeOptionsList}
                    placeholder={c.makePlaceholder}
                    emptyMessage={c.makeEmpty}
                  />
                </Field>
                <Field label={c.model}>
                  <SearchCombobox
                    value={form.vehicleModel}
                    onValueChange={(value) => {
                      detachVehicleLink();
                      onFormChange("vehicleModel", value);
                    }}
                    options={vehicleModelOptionsList}
                    placeholder={form.vehicleMake.trim() ? c.modelPlaceholder : c.modelPlaceholderNeedMake}
                    emptyMessage={
                      form.vehicleMake.trim()
                        ? c.modelEmpty
                        : c.modelNeedMake
                    }
                    disabled={!form.vehicleMake.trim()}
                  />
                </Field>
                <Field label={c.licensePlate}>
                  <SearchCombobox
                    value={form.licensePlate}
                    onValueChange={(value) => {
                      detachVehicleLink();
                      onFormChange("licensePlate", value.toUpperCase());
                    }}
                    onOptionSelect={commitVehicleByPlate}
                    options={licensePlateOptions}
                    placeholder="123 ABC 01"
                    emptyMessage={c.licensePlateEmpty}
                  />
                </Field>
                <Field label="VIN">
                  <SearchCombobox
                    value={form.vin}
                    onValueChange={(value) => {
                      detachVehicleLink();
                      onFormChange("vin", value.toUpperCase());
                    }}
                    onOptionSelect={commitVehicleByVin}
                    options={vinOptions}
                    placeholder="JTDBT923…"
                    emptyMessage={c.vinEmpty}
                  />
                </Field>
                <Field label={c.mileageKm}>
                  <GroupedNumberInput
                    value={form.mileage}
                    onValueChange={(value) => onFormChange("mileage", value)}
                    placeholder="125 000"
                  />
                </Field>
              </div>
              <Field label={c.comment}>
                <Textarea
                  value={form.comment}
                  onChange={(event) => onFormChange("comment", event.target.value)}
                  placeholder={c.commentPlaceholder}
                  className="min-h-[88px] resize-none"
                />
              </Field>
            </Section>
          </FadeIn>
        ) : null}

        {step === 2 ? (
          <FadeIn key="composer-step-2" className="mx-auto max-w-3xl space-y-4">
            {!kitDismissed && kitSuggestions.length > 0 && primaryEngineCode ? (
              <KnowledgeKitBanner
                engineCode={primaryEngineCode}
                items={kitSuggestions.slice(0, 8)}
                confidence={kitSuggestions[0]?.confidence ?? 0}
                onApply={applyKit}
                onDismiss={() => setKitDismissed(true)}
              />
            ) : null}
            {companionSuggestions.length > 0 ? (
              <div className="space-y-1.5">
                <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  {c.hints}
                </p>
                <KnowledgeSuggestionChips
                  suggestions={companionSuggestions.slice(0, 8)}
                  onAccept={applyKnowledgeSuggestion}
                  onDismiss={(suggestion) => void dismissKnowledge(suggestion)}
                />
              </div>
            ) : null}
            <Tabs defaultValue="labor">
              <TabsList className="mb-4 w-full justify-start">
                <TabsTrigger value="labor" className="gap-1.5">
                  <Wrench className="size-3.5" />
                  {c.tabLabor}
                  {form.laborLines.length > 0 ? (
                    <span className="rounded-full bg-primary/10 px-1.5 text-[10px] text-primary">
                      {form.laborLines.length}
                    </span>
                  ) : null}
                </TabsTrigger>
                <TabsTrigger value="parts" className="gap-1.5">
                  <Package className="size-3.5" />
                  {c.tabParts}
                  {regularPartLines.length > 0 ? (
                    <span className="rounded-full bg-primary/10 px-1.5 text-[10px] text-primary">
                      {regularPartLines.length}
                    </span>
                  ) : null}
                </TabsTrigger>
                <TabsTrigger value="motors" className="gap-1.5" data-guide="work-order-motors-tab">
                  <Cog className="size-3.5" />
                  {c.tabMotors}
                  {form.motorLines.length > 0 ? (
                    <span className="rounded-full bg-primary/10 px-1.5 text-[10px] text-primary">
                      {form.motorLines.length}
                    </span>
                  ) : null}
                </TabsTrigger>
                {quickSpecificCategories.length > 0 ? (
                  <TabsTrigger value="specific" className="gap-1.5">
                    <Package className="size-3.5" />
                    {c.tabCatalog}
                    {specificPartLines.length > 0 ? (
                      <span className="rounded-full bg-primary/10 px-1.5 text-[10px] text-primary">
                        {specificPartLines.length}
                      </span>
                    ) : null}
                  </TabsTrigger>
                ) : null}
              </TabsList>

              <TabsContent value="labor" className="space-y-4">
                <AddRowCard title={c.addLabor}>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label={c.laborTitle} required>
                      <SearchCombobox
                        value={form.laborDraft.title}
                        onValueChange={(value) => onLaborDraftChange({ title: value })}
                        options={laborTitleOptions}
                        placeholder={c.laborTitlePlaceholder}
                        emptyMessage={c.laborTitleEmpty}
                      />
                    </Field>
                    <Field label={c.pricingMode}>
                      <select
                        className={selectClass}
                        value={form.laborDraft.pricingMode}
                        onChange={(event) =>
                          onLaborDraftChange({
                            pricingMode: event.target.value as WorkOrderLaborPricingMode,
                          })
                        }
                      >
                        <option value="fixed">{c.pricingFixed}</option>
                        <option value="hourly">{c.pricingHourly}</option>
                      </select>
                    </Field>
                  </div>

                  <div className={cn("mt-4 grid gap-4", isHourlyLabor ? "sm:grid-cols-3" : "sm:grid-cols-2")}>
                    {isHourlyLabor ? (
                      <Field label={c.normHours}>
                        <GroupedNumberInput
                          value={form.laborDraft.hours}
                          onValueChange={(value) => onLaborDraftChange({ hours: value })}
                          allowDecimals
                          maximumFractionDigits={1}
                          placeholder="2,5"
                        />
                      </Field>
                    ) : null}
                    <Field label={isHourlyLabor ? c.ratePerHour : c.laborAmount}>
                      <GroupedNumberInput
                        value={form.laborDraft.unitPrice}
                        onValueChange={(value) => onLaborDraftChange({ unitPrice: value })}
                        emptyAsZero={false}
                        placeholder={isHourlyLabor ? "5 000" : "90 000"}
                      />
                    </Field>
                    <Field label={c.assignee} required>
                      <div className="flex gap-2">
                        <div
                          className="min-w-0 flex-1"
                          onBlur={(event) => {
                            if (event.currentTarget.contains(event.relatedTarget as Node | null)) return;
                            tryResolveAssigneeByName(form.laborDraft.assigneeName);
                          }}
                        >
                          <SearchCombobox
                            value={form.laborDraft.assigneeName}
                            onValueChange={(value) =>
                              onLaborDraftChange({ assigneeName: value, assigneeId: "" })
                            }
                            onOptionSelect={commitAssignee}
                            options={assigneeOptions}
                            placeholder={c.assigneePlaceholder}
                            emptyMessage={c.assigneeEmpty}
                            className={cn(
                              form.laborDraft.assigneeId && "border-emerald-500/50 ring-emerald-500/10",
                            )}
                          />
                        </div>
                        {currentUserId ? (
                          <Button type="button" variant="outline" size="sm" onClick={assignSelf}>
                            {c.me}
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
                            {laborDraftTotal > 0 ? ` · ${money(laborDraftTotal)}${c.toPayroll}` : ""}
                          </span>
                        </p>
                      ) : employees.length === 0 ? (
                        <p className="text-xs text-amber-600">
                          {c.addEmployeesHint}
                        </p>
                      ) : form.laborDraft.assigneeName.trim() ? (
                        <p className="text-xs text-muted-foreground">
                          {c.externalAssignee(form.laborDraft.assigneeName)}
                        </p>
                      ) : (
                        <p className="text-xs text-muted-foreground">
                          {c.assigneeHint}
                        </p>
                      )}
                    </div>
                    <Button type="button" variant="secondary" disabled={!canAddLabor} onClick={onAddLabor}>
                      {c.add}
                    </Button>
                  </div>
                </AddRowCard>
                <LineItems
                  empty={c.laborEmpty}
                  items={form.laborLines.map((line) => ({
                    id: line.id,
                    label: laborLineLabel(line, employees),
                    highlight: line.id === highlightLaborId,
                  }))}
                  onRemove={onRemoveLabor}
                />
              </TabsContent>

              <TabsContent value="parts" className="space-y-4">
                <AddRowCard title={c.addPart} description={c.addPartDesc}>
                  <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)_72px_96px_auto]">
                    <SearchCombobox
                      value={form.partSku}
                      onValueChange={(value) => onFormChange("partSku", value)}
                      onOptionSelect={(value) => {
                        rememberComposerFieldValue(companyId, "partSku", value);
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
                      options={partSkuOptions}
                      placeholder={c.skuOptional}
                      emptyMessage={c.skuEmpty}
                    />
                    <SearchCombobox
                      value={form.partName}
                      onValueChange={(value) => onFormChange("partName", value)}
                      onOptionSelect={(value) => {
                        rememberComposerFieldValue(companyId, "partName", value);
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
                      options={partNameOptions}
                      placeholder={c.namePlaceholder}
                      emptyMessage={c.nameEmpty}
                    />
                    <GroupedNumberInput
                      value={form.partQuantity}
                      onValueChange={(value) => onFormChange("partQuantity", value || 1)}
                      aria-label={c.quantityAria}
                    />
                    <GroupedNumberInput
                      value={form.partUnitPrice}
                      onValueChange={(value) => onFormChange("partUnitPrice", value)}
                      emptyAsZero={false}
                      placeholder={c.pricePlaceholder}
                      aria-label={c.priceAria}
                    />
                    <Button type="button" variant="secondary" onClick={onAddPart}>
                      {c.add}
                    </Button>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {c.partHint}
                  </p>
                </AddRowCard>
                <LineItems
                  empty={c.partsEmpty}
                  items={regularPartLines.map((line) => {
                    const tag = line.source === "adhoc" || !line.itemId ? d.adhocTag : "";
                    return {
                      id: line.id,
                      label: `${line.name}${tag} × ${line.quantity} = ${money(line.quantity * line.unitPrice)}`,
                    };
                  })}
                  onRemove={(index) => {
                    const line = regularPartLines[index];
                    if (line) onRemovePartById(line.id);
                  }}
                />
              </TabsContent>

              <TabsContent value="motors" className="space-y-4">
                <AddRowCard
                  title={c.addMotor}
                  guideId="work-order-engine"
                  complete={form.motorLines.length > 0}
                >
                  <div className="grid gap-3 sm:grid-cols-[1fr_140px_140px_auto]">
                    <SearchCombobox
                      value={form.motorSerial}
                      onValueChange={(value) => onFormChange("motorSerial", value)}
                      onOptionSelect={(value) => rememberComposerFieldValue(companyId, "motorSerial", value)}
                      options={motorSerialOptions}
                      placeholder={c.motorSerialPlaceholder}
                      emptyMessage={c.motorSerialEmpty}
                    />
                    <select
                      className={selectClass}
                      value={form.motorOutcome}
                      onChange={(event) =>
                        onFormChange("motorOutcome", event.target.value as WorkOrderMotorOutcome)
                      }
                    >
                      <option value="install">{c.outcomeInstall}</option>
                      <option value="sell">{c.outcomeSell}</option>
                    </select>
                    <GroupedNumberInput
                      value={form.motorPrice}
                      onValueChange={(value) => onFormChange("motorPrice", value)}
                      emptyAsZero={false}
                      placeholder={c.priceShort}
                    />
                    <Button type="button" variant="secondary" onClick={onAddMotor}>
                      {c.add}
                    </Button>
                  </div>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    <Field label={c.motorWarranty}>
                      <select
                        className={selectClass}
                        value={form.motorWarrantyTemplateId}
                        onChange={(event) => onFormChange("motorWarrantyTemplateId", event.target.value)}
                      >
                        <option value="">{c.companyDefault}</option>
                        {WARRANTY_TEMPLATE_IDS.map((id) => (
                          <option key={id} value={id}>
                            {getWarrantyTemplate(id).name}
                          </option>
                        ))}
                      </select>
                    </Field>
                  </div>
                </AddRowCard>
                <LineItems
                  empty={c.motorsEmpty}
                  items={form.motorLines.map((line) => ({
                    id: line.id,
                    label: `${formatMotorLineLabel(line, { includeSerial: true })} · ${line.outcome === "install" ? d.install : d.sale} · ${money(line.unitPrice)}`,
                  }))}
                  onRemove={onRemoveMotor}
                />
              </TabsContent>

              {quickSpecificCategories.length > 0 ? (
                <TabsContent value="specific" className="space-y-4">
                  <AddRowCard
                    title={c.quickItem}
                    description={c.quickItemDesc}
                  >
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Field label={c.category}>
                        <select
                          className={selectClass}
                          value={form.specificCategoryId}
                          onChange={(event) => onFormChange("specificCategoryId", event.target.value)}
                        >
                          <option value="">{c.selectEllipsis}</option>
                          {quickSpecificCategories.map((category) => (
                            <option key={category.id} value={category.id}>
                              {categoryDisplayName(category)}
                            </option>
                          ))}
                        </select>
                      </Field>
                      <Field label={c.itemName}>
                        <Input
                          value={form.specificPartName}
                          onChange={(event) => onFormChange("specificPartName", event.target.value)}
                          placeholder={c.itemNamePlaceholder}
                        />
                      </Field>
                      <Field label={c.priceUsd}>
                        <GroupedNumberInput
                          value={form.specificPartPrice}
                          onValueChange={(value) => onFormChange("specificPartPrice", value)}
                          emptyAsZero={false}
                        />
                      </Field>
                      <Field label={c.warranty}>
                        <select
                          className={selectClass}
                          value={form.specificWarrantyTemplateId}
                          onChange={(event) =>
                            onFormChange("specificWarrantyTemplateId", event.target.value)
                          }
                        >
                          <option value="none">{c.noWarranty}</option>
                          {WARRANTY_TEMPLATE_IDS.filter((id) => id !== "no_warranty").map((id) => (
                            <option key={id} value={id}>
                              {getWarrantyTemplate(id).name}
                            </option>
                          ))}
                        </select>
                      </Field>
                    </div>
                    <Button type="button" variant="secondary" className="mt-3" onClick={onAddSpecificPart}>
                      {c.add}
                    </Button>
                  </AddRowCard>
                  <LineItems
                    empty={c.catalogEmpty}
                    items={specificPartLines.map((line) => {
                      const category = line.specificCategoryName ? `${line.specificCategoryName} · ` : "";
                      return {
                        id: line.id,
                        label: `${category}${line.name} = ${money(line.unitPrice)}`,
                      };
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
            <SummaryCard title={c.summaryClient}>
              <p className="font-medium">{form.clientName || "—"}</p>
              <p className="text-sm text-muted-foreground">{form.clientPhone || "—"}</p>
            </SummaryCard>
            <SummaryCard title={c.summaryVehicle}>
              <p className="font-medium">
                {[form.vehicleMake, form.vehicleModel].filter(Boolean).join(" ") || "—"}
              </p>
              <p className="text-sm text-muted-foreground">
                {[form.licensePlate, form.vin].filter(Boolean).join(" · ") || "—"}
                {form.mileage ? ` · ${d.km(formatGroupedNumber(form.mileage))}` : ""}
              </p>
            </SummaryCard>
            <SummaryCard title={c.summaryLines} className="lg:col-span-2">
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li>{c.laborCount(form.laborLines.length)}</li>
                <li>
                  {c.partsCount(
                    form.partLines.filter((line) => line.source !== "specific_quick").length,
                  )}
                </li>
                {specificPartLines.length > 0 ? (
                  <li>{c.catalogCount(specificPartLines.length)}</li>
                ) : null}
                <li>{c.motorsCount(form.motorLines.length)}</li>
                {form.comment ? <li className="pt-2 text-foreground">«{form.comment}»</li> : null}
              </ul>
            </SummaryCard>
            <SummaryCard title={c.discount} className="lg:col-span-2">
              <GroupedNumberInput
                value={form.discount}
                onValueChange={(value) => onFormChange("discount", value)}
                emptyAsZero={false}
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
            {c.totalsLine(
              money(pricing.laborTotal),
              money(pricing.partsTotal),
              money(pricing.motorsTotal),
            )}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {step > 1 ? (
            <Button type="button" variant="outline" onClick={() => onStepChange(step - 1)}>
              <ArrowLeft className="size-4" />
              {c.back}
            </Button>
          ) : null}
          {step < 3 ? (
            <Button
              type="button"
              disabled={step === 1 && !step1Valid}
              data-guide="work-order-next"
              onClick={() => {
                emitGuideSignal("work-order-step-advanced");
                onStepChange(step + 1);
              }}
            >
              {c.next}
              <ArrowRight className="size-4" />
            </Button>
          ) : (
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant={canEdit && step1Valid ? "default" : "outline"}
                disabled={!canEdit || !step1Valid || saving}
                data-guide="work-order-save"
                title={`${c.saveDraft} (${modShortcutLabel("S")})`}
                onClick={() => onSave?.()}
              >
                <Save className="size-4" />
                {saving ? c.saving : `${c.saveDraft} (${modShortcutLabel("S")})`}
              </Button>
            </div>
          )}
        </div>
      </footer>
    </div>
  );
}

const selectClass =
  "flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring";

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
  guideId,
  complete,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
  guideId?: string;
  complete?: boolean;
}) {
  return (
    <div
      className="space-y-1.5"
      data-guide={guideId}
      data-guide-complete={guideId ? (complete ? "true" : "false") : undefined}
    >
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
  guideId,
  complete,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  guideId?: string;
  complete?: boolean;
}) {
  return (
    <div
      className="rounded-xl border border-dashed bg-muted/15 p-4 transition-colors duration-200 hover:bg-muted/20"
      data-guide={guideId}
      data-guide-complete={guideId ? (complete ? "true" : "false") : undefined}
    >
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
  items: Array<{ id: string; label: string; highlight?: boolean }>;
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
    <motion.ul
      layout
      className="overflow-hidden rounded-xl border bg-card"
      initial={false}
    >
      <AnimatePresence initial={false} mode="popLayout">
        {items.map((item, index) => (
          <motion.li
            key={item.id}
            layout="position"
            initial={{ opacity: 0, y: -14, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, height: 0, transition: { duration: 0.16, ease: WORK_ORDERS_MOTION_EASE } }}
            transition={{ duration: 0.24, ease: WORK_ORDERS_MOTION_EASE }}
            className={cn(
              "flex items-center justify-between gap-3 border-b px-3 py-2.5 text-sm last:border-b-0",
              item.highlight && "bg-emerald-500/10",
            )}
          >
            <span className="min-w-0 truncate">{item.label}</span>
            <button
              type="button"
              className="shrink-0 text-xs text-muted-foreground transition-colors hover:text-destructive"
              onClick={() => onRemove(index)}
            >
              {userCopy.workOrders.composer.remove}
            </button>
          </motion.li>
        ))}
      </AnimatePresence>
    </motion.ul>
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
