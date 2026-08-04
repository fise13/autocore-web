"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";

import { getSetupWizardCategoryPresets } from "@/lib/onboarding/setup-wizard-copy";
import { createWorkOrderUseCase } from "@/application/use-cases/work-orders/create-work-order";
import { updateWorkOrderUseCase } from "@/application/use-cases/work-orders/update-work-order";
import { quickCreateClientUseCase } from "@/application/use-cases/work-orders/quick-create-client";
import { quickCreateVehicleUseCase } from "@/application/use-cases/work-orders/quick-create-vehicle";
import { WorkOrderStatus } from "@/domain/work-order";
import { emitKnowledgeEvent } from "@/lib/knowledge/knowledge-api.client";
import { useAuth } from "@/components/providers/auth-provider";
import { useWorkspace } from "@/components/layout/workspace-context";
import { LastSavedHint } from "@/components/persistence/last-saved-hint";
import { usePersistedDocument } from "@/components/persistence/use-persisted-document";
import { useToast } from "@/components/ui/toast-provider";
import type { PersistenceDraftRecord } from "@/lib/persistence";
import { useRecoverableDrafts } from "@/hooks/use-recoverable-drafts";
import { InventoryItem } from "@/domain/inventory";
import {
  ComposerFormState,
  LaborDraft,
  WorkOrderComposer,
} from "@/components/work-orders/work-order-composer";
import {
  WorkOrderDetailPanel,
  WorkOrderEmptyPanel,
} from "@/components/work-orders/work-order-detail-panel";
import { WorkOrdersClientsPanel } from "@/components/work-orders/work-orders-clients-panel";
import { WorkOrdersVehiclesPanel } from "@/components/work-orders/work-orders-vehicles-panel";
import {
  workOrdersDetailTransition,
  workOrdersDetailVariants,
  workOrdersSectionTransition,
  workOrdersSectionVariants,
} from "@/components/work-orders/work-orders-motion";
import {
  OrderListFilter,
  WorkOrderListPanel,
} from "@/components/work-orders/work-order-list-panel";
import { nextId, nextStatuses as getNextStatuses } from "@/components/work-orders/work-order-utils";
import { calculateWorkOrderPricing, WorkOrder } from "@/domain/work-order";
import { rememberComposerFieldValue } from "@/lib/work-order/composer-field-memory";
import { useClientsRealtime } from "@/hooks/use-clients-realtime";
import { useDomainEventsRealtime } from "@/hooks/use-domain-events-realtime";
import { useEmployeesRealtime } from "@/hooks/use-employees-realtime";
import { useInventoryRealtime } from "@/hooks/use-inventory-realtime";
import { useMotorsRealtime } from "@/hooks/use-motors-realtime";
import { useOperationsRealtime } from "@/hooks/use-operations-realtime";
import { usePayrollTransactionsRealtime } from "@/hooks/use-payroll-transactions-realtime";
import { useMyPayrollTransactions } from "@/hooks/use-my-payroll-transactions";
import { useVehiclesRealtime } from "@/hooks/use-vehicles-realtime";
import { useWorkOrderDocumentsRealtime } from "@/hooks/use-work-order-documents-realtime";
import { useCompanyAppConfig } from "@/hooks/use-company-app-config";
import { useWorkOrdersRealtime } from "@/hooks/use-work-orders-realtime";
import { workOrderToComposerForm } from "@/lib/work-order/order-to-composer-form";
import { canAccessMyEarnings } from "@/lib/auth/app-access";
import { can } from "@/lib/auth/permissions";
import { normalizeCompanyId } from "@/lib/company-id";
import { formatWorkOrderLabel, buildWorkOrderDisplayIndex } from "@/lib/work-order/work-order-display";
import {
  parseWorkOrdersFilter,
  parseWorkOrdersSection,
} from "@/lib/navigation/work-orders-nav";
import { createClientRepository } from "@/infrastructure/firestore/client-repository";
import { createDomainEventRepository } from "@/infrastructure/firestore/domain-event-repository";
import { createInventoryItemRepository } from "@/infrastructure/firestore/inventory-item-repository";
import { createFinancialOperationRepository } from "@/infrastructure/firestore/financial-operation-repository";
import { createMotorRepository } from "@/infrastructure/firestore/motor-repository";
import { createPayrollTransactionRepository } from "@/infrastructure/firestore/payroll-transaction-repository";
import { createVehicleRepository } from "@/infrastructure/firestore/vehicle-repository";
import { generateWorkOrderDocuments } from "@/lib/documents/fetch-document-pdf";
import { triggerWorkOrderEventProcessing } from "@/lib/work-orders/process-work-order-events";
import { ensureWorkOrderDocuments } from "@/lib/work-orders/ensure-work-order-documents";
import { notifyWorkOrderAvailable } from "@/lib/work-orders/notify-work-order-available";
import { transitionWorkOrder } from "@/lib/work-orders/transition-work-order";
import { STATUS_LABELS } from "@/components/work-orders/work-order-copy";
import { userCopy } from "@/lib/user-copy";
import { createWorkOrderDocumentRepository } from "@/infrastructure/firestore/work-order-document-repository";
import { createWorkOrderRepository } from "@/infrastructure/firestore/work-order-repository";

const workOrderRepository = createWorkOrderRepository();
const clientRepository = createClientRepository();
const vehicleRepository = createVehicleRepository();
const domainEventRepository = createDomainEventRepository();
const inventoryRepository = createInventoryItemRepository();
const motorRepository = createMotorRepository();
const documentRepository = createWorkOrderDocumentRepository();
const financialOperationRepository = createFinancialOperationRepository();
const payrollTransactionRepository = createPayrollTransactionRepository();

const INITIAL_LABOR_DRAFT: LaborDraft = {
  title: "",
  pricingMode: "fixed",
  hours: 1,
  unitPrice: 0,
  assigneeId: "",
  assigneeName: "",
  assigneeRole: "mechanic",
};

function initialFormState(): ComposerFormState {
  return {
    clientId: "",
    clientName: "",
    clientPhone: "",
    vehicleId: "",
    vehicleMake: "",
    vehicleModel: "",
    vin: "",
    licensePlate: "",
    mileage: 0,
    comment: "",
    laborDraft: INITIAL_LABOR_DRAFT,
    laborLines: [],
    partSku: "",
    partName: "",
    partQuantity: 1,
    partUnitPrice: 0,
    partLines: [],
    specificCategoryId: "",
    specificPartName: "",
    specificPartPrice: 0,
    specificWarrantyTemplateId: "none",
    motorSerial: "",
    motorOutcome: "install",
    motorPrice: 0,
    motorWarrantyTemplateId: "",
    motorLines: [],
    discount: 0,
  };
}

export function WorkOrdersWorkspace() {
  const { profile, isLoading } = useAuth();
  const { registerSyncHandler, registerWorkOrderBarcodeScanHandler } = useWorkspace();
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const routeParams = useParams();
  const routeOrderId = typeof routeParams?.id === "string" ? routeParams.id : null;
  const companyId = normalizeCompanyId(profile?.companyId);
  const canView = can(profile, "work_orders_view");
  const canEdit = can(profile, "work_orders_edit");

  const { orders } = useWorkOrdersRealtime(workOrderRepository, companyId, !isLoading && canView);
  const { clients } = useClientsRealtime(clientRepository, companyId, !isLoading && canView);
  const { vehicles } = useVehiclesRealtime(vehicleRepository, companyId, !isLoading && canView);
  const { data: inventoryItems = [] } = useInventoryRealtime(inventoryRepository, companyId, !isLoading && canView);
  const { data: motors = [] } = useMotorsRealtime(motorRepository, {
    uid: profile?.id ?? "",
    companyId,
    availability: "available",
    enabled: !isLoading && canView,
  });
  const { employees } = useEmployeesRealtime(companyId, !isLoading && canView);
  const operationsQuery = useOperationsRealtime(financialOperationRepository, {
    companyId,
    type: "all",
    enabled: !isLoading && canView,
  });
  const canViewAccounting = can(profile, "accounting_view");
  const canViewOwnPayroll = canAccessMyEarnings(profile);
  const { transactions: companyPayrollTransactions } = usePayrollTransactionsRealtime(
    payrollTransactionRepository,
    companyId,
    !isLoading && canView && canViewAccounting,
  );
  const { transactions: ownPayrollTransactions } = useMyPayrollTransactions(
    payrollTransactionRepository,
    companyId,
    profile?.id ?? "",
    !isLoading && canView && !canViewAccounting && canViewOwnPayroll,
  );
  const payrollTransactions = canViewAccounting ? companyPayrollTransactions : ownPayrollTransactions;

  const { config: companyAppConfig } = useCompanyAppConfig(companyId);
  const quickSpecificCategories = useMemo(() => {
    const fromConfig = (companyAppConfig?.specificCategories ?? []).filter(
      (item) => item.mode === "quick",
    );
    if (fromConfig.length > 0) return fromConfig;
    return getSetupWizardCategoryPresets().filter((item) => item.mode === "quick");
  }, [companyAppConfig]);

  const [isCreating, setIsCreating] = useState(false);
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);
  const [composerStep, setComposerStep] = useState(1);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [listSearch, setListSearch] = useState("");
  const [listFilter, setListFilter] = useState<OrderListFilter>("open");
  const section = parseWorkOrdersSection(searchParams.get("section"));
  const [form, setForm] = useState<ComposerFormState>(initialFormState);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [composerSessionId, setComposerSessionId] = useState(() => `new:${crypto.randomUUID()}`);
  const editingOrderIdRef = useRef<string | null>(null);
  editingOrderIdRef.current = editingOrderId;
  const formRef = useRef(form);
  formRef.current = form;

  const selectedOrder = useMemo(
    () => orders.find((order) => order.id === selectedOrderId) ?? null,
    [orders, selectedOrderId],
  );

  const { events } = useDomainEventsRealtime(
    domainEventRepository,
    companyId,
    selectedOrder?.id ?? "",
    Boolean(selectedOrder && !isCreating),
  );
  const { documents } = useWorkOrderDocumentsRealtime(
    documentRepository,
    companyId,
    selectedOrder?.id ?? "",
    Boolean(selectedOrder && !isCreating),
  );

  const availableMotors = useMemo(
    () => motors.filter((motor) => !motor.soldDate && (motor.status ?? "available") === "available"),
    [motors],
  );
  const pricing = useMemo(
    () => calculateWorkOrderPricing(form.laborLines, form.partLines, form.motorLines, form.discount),
    [form.discount, form.laborLines, form.motorLines, form.partLines],
  );
  const workOrderDisplayIndex = useMemo(() => buildWorkOrderDisplayIndex(orders), [orders]);
  const payrollByOrderId = useMemo(() => {
    const map = new Map<string, typeof payrollTransactions>();
    for (const row of payrollTransactions) {
      const bucket = map.get(row.workOrderId) ?? [];
      bucket.push(row);
      map.set(row.workOrderId, bucket);
    }
    return map;
  }, [payrollTransactions]);

  const selectedOrderOperations = useMemo(() => {
    if (!selectedOrderId) return [];
    return (operationsQuery.data ?? []).filter(
      (operation) => operation.relatedWorkOrderId === selectedOrderId,
    );
  }, [operationsQuery.data, selectedOrderId]);

  const selectedOrderPayroll = useMemo(() => {
    if (!selectedOrderId) return [];
    return payrollTransactions.filter((transaction) => transaction.workOrderId === selectedOrderId);
  }, [payrollTransactions, selectedOrderId]);

  useEffect(() => {
    const orderId = searchParams.get("order") ?? routeOrderId;
    if (!orderId || orders.length === 0) return;
    if (orders.some((order) => order.id === orderId)) {
      setSelectedOrderId(orderId);
      setIsCreating(false);
    }
  }, [orders, routeOrderId, searchParams]);

  useEffect(() => {
    setListFilter(parseWorkOrdersFilter(searchParams.get("filter")));
  }, [searchParams]);

  const patchForm = useCallback(<K extends keyof ComposerFormState>(key: K, value: ComposerFormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  }, []);

  const resetComposer = useCallback(() => {
    setForm(initialFormState());
    setComposerStep(1);
    setIsCreating(false);
    setEditingOrderId(null);
    setComposerSessionId(`new:${crypto.randomUUID()}`);
  }, []);

  const startCreate = useCallback(() => {
    setComposerSessionId(`new:${crypto.randomUUID()}`);
    setForm(initialFormState());
    setComposerStep(1);
    setIsCreating(true);
    setEditingOrderId(null);
    setSelectedOrderId(null);
    setError(null);
  }, []);

  const startEdit = useCallback(
    (orderId: string) => {
      const order = orders.find((entry) => entry.id === orderId);
      if (!order || !["draft", "confirmed"].includes(order.status)) return;
      setComposerSessionId(order.id);
      setForm(workOrderToComposerForm(order));
      setComposerStep(1);
      setEditingOrderId(order.id);
      setIsCreating(true);
      setSelectedOrderId(order.id);
      setError(null);
    },
    [orders],
  );

  const selectOrder = useCallback((orderId: string) => {
    setSelectedOrderId(orderId);
    setIsCreating(false);
    setError(null);
  }, []);

  const handleClientSelect = useCallback(
    (clientId: string) => {
      patchForm("clientId", clientId);
      const client = clients.find((entry) => entry.id === clientId);
      if (!client) return;
      patchForm("clientName", client.fullName);
      patchForm("clientPhone", client.phone);
      patchForm("vehicleId", "");
    },
    [clients, patchForm],
  );

  useEffect(() => {
    if (searchParams.get("create") !== "1" || !canEdit || section !== "orders") return;

    startCreate();
    const clientId = searchParams.get("clientId");
    if (clientId && clients.some((client) => client.id === clientId)) {
      handleClientSelect(clientId);
    }
  }, [canEdit, clients, handleClientSelect, searchParams, section, startCreate]);

  const handleVehicleSelect = useCallback(
    (vehicleId: string) => {
      patchForm("vehicleId", vehicleId);
      const vehicle = vehicles.find((entry) => entry.id === vehicleId);
      if (!vehicle) return;
      patchForm("vehicleMake", vehicle.make);
      patchForm("vehicleModel", vehicle.model);
      patchForm("vin", vehicle.vin);
      patchForm("licensePlate", vehicle.licensePlate);
      patchForm("mileage", vehicle.currentMileage);
    },
    [patchForm, vehicles],
  );

  const addLaborLine = useCallback(() => {
    let assigned = false;
    let rememberedTitle = "";
    let rememberedAssignee = "";
    setForm((current) => {
      const draft = current.laborDraft;
      if (!draft.title.trim()) return current;

      let assigneeId = draft.assigneeId;
      let assigneeRole = draft.assigneeRole;
      if (!assigneeId && draft.assigneeName.trim()) {
        const matched = employees.find(
          (entry) => (entry.fullName || entry.email).toLowerCase() === draft.assigneeName.trim().toLowerCase(),
        );
        if (matched) {
          assigneeId = matched.uid;
          assigneeRole =
            matched.role === "diagnostician"
              ? "diagnostician"
              : matched.role === "manager" || matched.role === "owner" || matched.role === "admin"
                ? "manager"
                : "mechanic";
        }
      }

      const displayName = !assigneeId && draft.assigneeName.trim() ? draft.assigneeName.trim() : "";
      if (!assigneeId && !displayName) {
        setError(userCopy.workOrders.errors.assigneeRequired);
        return current;
      }
      const pricingMode = draft.pricingMode === "hourly" ? "hourly" : "fixed";
      if (pricingMode === "fixed" && !(Number(draft.unitPrice) > 0)) {
        setError(userCopy.workOrders.errors.laborAmountRequired);
        return current;
      }
      if (pricingMode === "hourly" && !(Number(draft.hours) > 0 && Number(draft.unitPrice) > 0)) {
        setError(userCopy.workOrders.errors.hoursRateRequired);
        return current;
      }
      setError(null);
      assigned = true;
      rememberedTitle = draft.title.trim();
      rememberedAssignee = draft.assigneeName.trim();
      return {
        ...current,
        laborLines: [
          ...current.laborLines,
          {
            id: nextId("labor"),
            title: draft.title.trim(),
            pricingMode,
            hours: pricingMode === "hourly" ? Number(draft.hours) || 0 : 0,
            unitPrice: Number(draft.unitPrice) || 0,
            assigneeIds: assigneeId ? [assigneeId] : [],
            ...(displayName ? { assigneeDisplayNames: [displayName] } : {}),
            assigneeRole,
          },
        ],
        laborDraft: {
          ...INITIAL_LABOR_DRAFT,
          assigneeRole,
        },
      };
    });
    if (assigned) {
      rememberComposerFieldValue(companyId, "laborTitle", rememberedTitle);
      if (rememberedAssignee) rememberComposerFieldValue(companyId, "assignee", rememberedAssignee);
    }
  }, [companyId, employees]);

  const addPartLine = useCallback(() => {
    const name = form.partName.trim();
    const sku = form.partSku.trim();
    const quantity = Number(form.partQuantity) || 1;
    const manualPrice = Number(form.partUnitPrice) || 0;

    if (!name) {
      setError(userCopy.workOrders.errors.partNameRequired);
      return;
    }

    const item =
      inventoryItems.find((entry) => sku && entry.sku === sku) ??
      inventoryItems.find((entry) => entry.name.toLowerCase() === name.toLowerCase());

    if (item) {
      setError(null);
      rememberComposerFieldValue(companyId, "partSku", item.sku);
      rememberComposerFieldValue(companyId, "partName", item.name);
      setForm((current) => ({
        ...current,
        partLines: [
          ...current.partLines,
          {
            id: nextId("part"),
            itemId: item.id,
            source: "warehouse" as const,
            sku: item.sku,
            name: item.name,
            quantity,
            unitPrice: manualPrice || (item.sellPrice ?? item.averageCost ?? item.purchasePrice ?? 0),
            unitCost: item.averageCost ?? item.purchasePrice ?? 0,
          },
        ],
        partSku: "",
        partName: "",
        partQuantity: 1,
        partUnitPrice: 0,
      }));
      return;
    }

    if (manualPrice <= 0) {
      setError(userCopy.workOrders.errors.adhocPartPriceRequired);
      return;
    }

    setError(null);
    rememberComposerFieldValue(companyId, "partName", name);
    if (sku) rememberComposerFieldValue(companyId, "partSku", sku);
    setForm((current) => ({
      ...current,
      partLines: [
        ...current.partLines,
        {
          id: nextId("part"),
          source: "adhoc" as const,
          ...(sku ? { sku } : {}),
          name,
          quantity,
          unitPrice: manualPrice,
          unitCost: manualPrice,
        },
      ],
      partSku: "",
      partName: "",
      partQuantity: 1,
      partUnitPrice: 0,
    }));
  }, [companyId, form.partName, form.partSku, form.partQuantity, form.partUnitPrice, inventoryItems]);

  const handleBarcodeScan = useCallback(
    (item: InventoryItem) => {
      if (!isCreating) return false;
      setError(null);
      setForm((current) => ({
        ...current,
        partLines: [
          ...current.partLines,
          {
            id: nextId("part"),
            itemId: item.id,
            source: "warehouse" as const,
            sku: item.sku,
            name: item.name,
            quantity: 1,
            unitPrice: item.sellPrice ?? item.averageCost ?? item.purchasePrice ?? 0,
            unitCost: item.averageCost ?? item.purchasePrice ?? 0,
          },
        ],
      }));
      toast({
        title: userCopy.workOrders.errors.partAdded,
        description: `${item.name} × 1`,
        variant: "success",
      });
      return true;
    },
    [isCreating, toast],
  );

  useEffect(() => {
    registerWorkOrderBarcodeScanHandler(handleBarcodeScan);
    return () => registerWorkOrderBarcodeScanHandler(null);
  }, [handleBarcodeScan, registerWorkOrderBarcodeScanHandler]);

  const addMotorLine = useCallback(() => {
    const serial = form.motorSerial.trim();
    const motor = availableMotors.find((entry) => entry.serialCode === serial);
    if (!motor) {
      setError(userCopy.workOrders.errors.motorNotFound);
      return;
    }
    setError(null);
    rememberComposerFieldValue(companyId, "motorSerial", motor.serialCode);
    setForm((current) => ({
      ...current,
      motorLines: [
        ...current.motorLines,
        {
          id: nextId("motor"),
          motorId: motor.id,
          serialCode: motor.serialCode,
          ...(motor.brandName ? { brandName: motor.brandName } : {}),
          ...(motor.engineCode ? { engineCode: motor.engineCode } : {}),
          ...(motor.configuration ? { configuration: motor.configuration } : {}),
          unitPrice: Number(current.motorPrice) || 0,
          outcome: current.motorOutcome,
          ...(current.motorWarrantyTemplateId
            ? {
                warrantyTemplateId: current.motorWarrantyTemplateId as WorkOrder["motorLines"][number]["warrantyTemplateId"],
              }
            : {}),
        },
      ],
      motorSerial: "",
      motorPrice: 0,
      motorWarrantyTemplateId: "",
    }));
  }, [availableMotors, companyId, form.motorOutcome, form.motorPrice, form.motorSerial, form.motorWarrantyTemplateId]);

  const addSpecificPartLine = useCallback(() => {
    const category = quickSpecificCategories.find((entry) => entry.id === form.specificCategoryId);
    const name = form.specificPartName.trim();
    const price = Number(form.specificPartPrice) || 0;
    if (!category) {
      setError(userCopy.workOrders.errors.categoryRequired);
      return;
    }
    if (!name) {
      setError(userCopy.workOrders.errors.itemNameRequired);
      return;
    }
    if (!(price > 0)) {
      setError(userCopy.workOrders.errors.priceRequired);
      return;
    }
    setError(null);
    setForm((current) => ({
      ...current,
      partLines: [
        ...current.partLines,
        {
          id: nextId("specific"),
          source: "specific_quick",
          name,
          quantity: 1,
          unitPrice: price,
          unitCost: 0,
          specificCategoryId: category.id,
          specificCategoryName: category.name,
          ...(!current.specificWarrantyTemplateId ||
          current.specificWarrantyTemplateId === "none"
            ? { warrantyTemplateId: "none" as const }
            : {
                warrantyTemplateId:
                  current.specificWarrantyTemplateId as WorkOrder["partLines"][number]["warrantyTemplateId"],
              }),
        },
      ],
      specificCategoryId: "",
      specificPartName: "",
      specificPartPrice: 0,
      specificWarrantyTemplateId: "none",
    }));
  }, [form.specificCategoryId, form.specificPartName, form.specificPartPrice, quickSpecificCategories]);

  const persistComposer = useCallback(
    async (options: {
      formState: ComposerFormState;
      closeAfter: boolean;
      silent?: boolean;
    }) => {
      if (!profile?.id || !companyId) {
        return { ok: false as const, error: userCopy.workOrders.errors.noCompany };
      }
      const nextForm = options.formState;
      if (!nextForm.clientName.trim() || !nextForm.clientPhone.trim()) {
        if (!options.silent) {
          setError(userCopy.workOrders.errors.clientPhoneRequired);
          setComposerStep(1);
        }
        return { ok: false as const, error: "incomplete" };
      }
      if (!nextForm.vin.trim() && !nextForm.licensePlate.trim()) {
        if (!options.silent) {
          setError(userCopy.workOrders.errors.vinOrPlateRequired);
          setComposerStep(1);
        }
        return { ok: false as const, error: "incomplete" };
      }

      if (!options.silent) {
        setSaving(true);
        setError(null);
      }
      try {
        const client =
          clients.find((entry) => entry.id === nextForm.clientId) ??
          (await quickCreateClientUseCase(clientRepository, {
            companyId,
            fullName: nextForm.clientName,
            phone: nextForm.clientPhone,
            createdByUserId: profile.id,
          }));
        const vehicle =
          vehicles.find((entry) => entry.id === nextForm.vehicleId) ??
          (await quickCreateVehicleUseCase(vehicleRepository, {
            companyId,
            clientId: client.id,
            make: nextForm.vehicleMake,
            model: nextForm.vehicleModel,
            vin: nextForm.vin,
            licensePlate: nextForm.licensePlate,
            currentMileage: nextForm.mileage,
            createdByUserId: profile.id,
          }));

        const nextPricing = calculateWorkOrderPricing(
          nextForm.laborLines,
          nextForm.partLines,
          nextForm.motorLines,
          nextForm.discount,
        );

        const payload = {
          clientId: client.id,
          clientName: client.fullName,
          clientPhone: client.phone,
          vehicleId: vehicle.id,
          vehicleLabel: [vehicle.make, vehicle.model, vehicle.licensePlate].filter(Boolean).join(" "),
          vin: vehicle.vin || nextForm.vin,
          licensePlate: vehicle.licensePlate || nextForm.licensePlate,
          mileage: nextForm.mileage,
          comment: nextForm.comment,
          laborLines: nextForm.laborLines,
          partLines: nextForm.partLines,
          motorLines: nextForm.motorLines,
          pricing: nextPricing,
          paymentAccount: "cashbox" as const,
          paymentMethod: "cash" as const,
          updatedByUserId: profile.id,
        };

        const currentEditingId = editingOrderIdRef.current;
        if (currentEditingId) {
          await updateWorkOrderUseCase(workOrderRepository, {
            companyId,
            workOrderId: currentEditingId,
            input: payload,
          });
          setSelectedOrderId(currentEditingId);
          void notifyWorkOrderAvailable(currentEditingId).catch(() => undefined);
          void ensureWorkOrderDocuments(currentEditingId);
          if (options.closeAfter) resetComposer();
          return { ok: true as const, orderId: currentEditingId };
        }

        const order = await createWorkOrderUseCase(workOrderRepository, domainEventRepository, {
          companyId,
          ...payload,
          createdByUserId: profile.id,
        });
        setSelectedOrderId(order.id);
        setEditingOrderId(order.id);
        setComposerSessionId(order.id);
        editingOrderIdRef.current = order.id;
        void triggerWorkOrderEventProcessing(order.id).catch(() => undefined);
        void ensureWorkOrderDocuments(order.id);
        void notifyWorkOrderAvailable(order.id).catch(() => undefined);
        void emitKnowledgeEvent({
          type: "wo.created",
          workOrderId: order.id,
          clientId: order.clientId,
          vehicleId: order.vehicleId,
          engineCode: order.motorLines[0]?.engineCode,
          brandName: order.motorLines[0]?.brandName ?? nextForm.vehicleMake,
          payload: {
            laborTitles: order.laborLines.map((line) => line.title),
            partSkus: order.partLines.map((line) => line.sku || line.name),
            fieldValues: {
              vehicleMake: nextForm.vehicleMake,
              vehicleModel: nextForm.vehicleModel,
              clientName: nextForm.clientName,
            },
          },
        });
        if (options.closeAfter) resetComposer();
        return { ok: true as const, orderId: order.id };
      } catch (nextError) {
        const message =
          nextError instanceof Error ? nextError.message : userCopy.workOrders.errors.createFailed;
        if (!options.silent) setError(message);
        return { ok: false as const, error: message };
      } finally {
        if (!options.silent) setSaving(false);
      }
    },
    [clients, companyId, profile?.id, resetComposer, vehicles],
  );

  const saveDraft = useCallback(async () => {
    await persistComposer({ formState: formRef.current, closeAfter: true, silent: false });
  }, [persistComposer]);

  const composerPersistenceKey =
    canEdit && isCreating && companyId
      ? {
          companyId,
          kind: "work_order_composer" as const,
          id: editingOrderId ?? composerSessionId,
        }
      : null;

  usePersistedDocument({
    key: composerPersistenceKey,
    value: form,
    label: form.clientName.trim() || userCopy.workOrders.errors.orderFallback,
    // Local draft only — cloud save is ⌘S / Ctrl+S via registerSyncHandler.
    sync: null,
    enabled: Boolean(composerPersistenceKey),
  });

  const activeComposerDraftId = isCreating ? editingOrderId ?? composerSessionId : null;
  const { drafts: unfinishedDrafts, discard: discardUnfinishedDraft, refresh: refreshUnfinishedDrafts } =
    useRecoverableDrafts({
      companyId,
      kind: "work_order_composer",
      excludeId: activeComposerDraftId,
      enabled: Boolean(companyId && canEdit),
    });

  const restoreComposerDraft = useCallback(async (draft: PersistenceDraftRecord) => {
    const snapshot = draft.snapshot as ComposerFormState;
    if (!snapshot || typeof snapshot !== "object") return;
    setComposerSessionId(draft.id);
    if (!draft.id.startsWith("new:")) {
      setEditingOrderId(draft.id);
      setSelectedOrderId(draft.id);
    } else {
      setEditingOrderId(null);
    }
    setForm(snapshot);
    setComposerStep(1);
    setIsCreating(true);
    setError(null);
    void refreshUnfinishedDrafts();
  }, [refreshUnfinishedDrafts]);

  const handleDiscardUnfinishedDraft = useCallback(
    async (draft: PersistenceDraftRecord) => {
      await discardUnfinishedDraft(draft);
    },
    [discardUnfinishedDraft],
  );

  useEffect(() => {
    if (!canEdit || !isCreating) {
      registerSyncHandler(null);
      return;
    }
    registerSyncHandler(saveDraft);
    return () => registerSyncHandler(null);
  }, [canEdit, isCreating, registerSyncHandler, saveDraft]);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k" && isCreating) {
        event.preventDefault();
        document.getElementById("work-order-client-name")?.focus();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isCreating]);

  async function transition(nextStatus: WorkOrderStatus) {
    if (!profile?.id || !companyId || !selectedOrder || !canEdit) return;
    setSaving(true);
    setError(null);
    try {
      await transitionWorkOrder(selectedOrder.id, nextStatus);
      void ensureWorkOrderDocuments(selectedOrder.id);
      toast({
        title: STATUS_LABELS[nextStatus],
        description: userCopy.workOrders.errors.orderUpdated(
          formatWorkOrderLabel(selectedOrder, workOrderDisplayIndex),
        ),
        variant: "success",
      });
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : userCopy.workOrders.errors.statusChangeFailed);
    } finally {
      setSaving(false);
    }
  }

  if (!canView && !isLoading) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <div className="max-w-md rounded-xl border bg-card p-6 text-center">
          <h2 className="font-semibold">{userCopy.workOrders.access.title}</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {userCopy.workOrders.access.description}
          </p>
        </div>
      </div>
    );
  }

  const shellClassName = "-m-4 flex h-[calc(100vh-3.5rem)] flex-col overflow-hidden md:-m-6";

  return (
    <div className={shellClassName}>
      <AnimatePresence mode="wait" initial={false}>
        {section === "clients" ? (
          <motion.div
            key="work-orders-clients"
            variants={workOrdersSectionVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={workOrdersSectionTransition}
            className="flex h-full min-h-0 flex-col"
          >
            <WorkOrdersClientsPanel
              clients={clients}
              vehicles={vehicles}
              canEdit={canEdit}
              initialSearch={section === "clients" ? (searchParams.get("search") ?? "") : ""}
            />
          </motion.div>
        ) : section === "vehicles" ? (
          <motion.div
            key="work-orders-vehicles"
            variants={workOrdersSectionVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={workOrdersSectionTransition}
            className="flex h-full min-h-0 flex-col"
          >
            <WorkOrdersVehiclesPanel vehicles={vehicles} clients={clients} canEdit={canEdit} />
          </motion.div>
        ) : (
          <motion.div
            key="work-orders-list"
            variants={workOrdersSectionVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={workOrdersSectionTransition}
            className="flex h-full min-h-0 flex-col"
          >
            {error ? (
              <div className="shrink-0 border-b border-destructive/20 bg-destructive/10 px-4 py-2 text-sm text-destructive md:px-5">
                {error}
              </div>
            ) : null}

            <div className="flex min-h-0 flex-1">
              <WorkOrderListPanel
                orders={orders}
                selectedOrderId={selectedOrderId}
                isCreating={isCreating}
                search={listSearch}
                filter={listFilter}
                canEdit={canEdit}
                employees={employees}
                displayIndex={workOrderDisplayIndex}
                payrollByOrderId={payrollByOrderId}
                unfinishedDrafts={unfinishedDrafts}
                activeDraftId={activeComposerDraftId}
                onSearchChange={setListSearch}
                onFilterChange={setListFilter}
                onSelectOrder={selectOrder}
                onStartCreate={startCreate}
                onRestoreDraft={(draft) => void restoreComposerDraft(draft)}
                onDiscardDraft={(draft) => void handleDiscardUnfinishedDraft(draft)}
              />

              <main className="relative min-w-0 flex-1 overflow-hidden bg-background">
                <AnimatePresence mode="wait">
                  {isCreating ? (
                    <motion.div
                      key="composer"
                      variants={workOrdersDetailVariants}
                      initial="initial"
                      animate="animate"
                      exit="exit"
                      transition={workOrdersDetailTransition}
                      className="h-full overflow-visible"
                    >
                      <WorkOrderComposer
                        step={composerStep}
                        form={form}
                        clients={clients}
                        vehicles={vehicles}
                        inventoryItems={inventoryItems}
                        availableMotors={availableMotors}
                        employees={employees}
                        currentUserId={profile?.id}
                        companyId={companyId}
                        orders={orders}
                        quickSpecificCategories={quickSpecificCategories}
                        editingLabel={
                          editingOrderId
                            ? userCopy.workOrders.editing(
                                formatWorkOrderLabel(
                                  orders.find((entry) => entry.id === editingOrderId) ?? {
                                    id: editingOrderId,
                                    number: "",
                                  },
                                  workOrderDisplayIndex,
                                ),
                              )
                            : undefined
                        }
                        pricing={pricing}
                        saving={saving}
                        canEdit={canEdit}
                        onStepChange={setComposerStep}
                        onFormChange={patchForm}
                        onLaborDraftChange={(patch) =>
                          setForm((current) => ({ ...current, laborDraft: { ...current.laborDraft, ...patch } }))
                        }
                        onClientSelect={handleClientSelect}
                        onVehicleSelect={handleVehicleSelect}
                        onAddLabor={addLaborLine}
                        onAddPart={addPartLine}
                        onAddSpecificPart={addSpecificPartLine}
                        onAddMotor={addMotorLine}
                        onRemoveLabor={(index) =>
                          setForm((current) => ({
                            ...current,
                            laborLines: current.laborLines.filter((_, itemIndex) => itemIndex !== index),
                          }))
                        }
                        onRemovePart={(index) =>
                          setForm((current) => ({
                            ...current,
                            partLines: current.partLines.filter((_, itemIndex) => itemIndex !== index),
                          }))
                        }
                        onRemovePartById={(lineId) =>
                          setForm((current) => ({
                            ...current,
                            partLines: current.partLines.filter((line) => line.id !== lineId),
                          }))
                        }
                        onRemoveMotor={(index) =>
                          setForm((current) => ({
                            ...current,
                            motorLines: current.motorLines.filter((_, itemIndex) => itemIndex !== index),
                          }))
                        }
                        onCancel={resetComposer}
                      />
                      {composerPersistenceKey ? (
                        <div className="border-t px-6 py-2">
                          <LastSavedHint persistenceKey={composerPersistenceKey} />
                        </div>
                      ) : null}
                    </motion.div>
                  ) : selectedOrder ? (
                    <motion.div
                      key={selectedOrder.id}
                      variants={workOrdersDetailVariants}
                      initial="initial"
                      animate="animate"
                      exit="exit"
                      transition={workOrdersDetailTransition}
                      className="h-full overflow-visible"
                    >
                      <WorkOrderDetailPanel
                        displayIndex={workOrderDisplayIndex}
                        order={selectedOrder}
                        events={events}
                        documents={documents}
                        operations={selectedOrderOperations}
                        payroll={selectedOrderPayroll}
                        employees={employees}
                        saving={saving}
                        canEdit={canEdit}
                        nextStatuses={getNextStatuses(selectedOrder.status)}
                        onTransition={transition}
                        onEdit={
                          canEdit && ["draft", "confirmed"].includes(selectedOrder.status)
                            ? () => startEdit(selectedOrder.id)
                            : undefined
                        }
                      />
                    </motion.div>
                  ) : (
                    <motion.div
                      key="empty"
                      variants={workOrdersDetailVariants}
                      initial="initial"
                      animate="animate"
                      exit="exit"
                      transition={workOrdersDetailTransition}
                      className="h-full overflow-visible"
                    >
                      <WorkOrderEmptyPanel canEdit={canEdit} onCreateNew={startCreate} />
                    </motion.div>
                  )}
                </AnimatePresence>
              </main>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
