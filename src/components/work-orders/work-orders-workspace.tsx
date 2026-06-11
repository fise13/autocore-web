"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";

import { SETUP_WIZARD_CATEGORY_PRESETS } from "@/domain/company-config";
import { createWorkOrderUseCase } from "@/application/use-cases/work-orders/create-work-order";
import { updateWorkOrderUseCase } from "@/application/use-cases/work-orders/update-work-order";
import { quickCreateClientUseCase } from "@/application/use-cases/work-orders/quick-create-client";
import { quickCreateVehicleUseCase } from "@/application/use-cases/work-orders/quick-create-vehicle";
import { transitionWorkOrderStatusUseCase } from "@/application/use-cases/work-orders/transition-work-order-status";
import { useAuth } from "@/components/providers/auth-provider";
import { useWorkspace } from "@/components/layout/workspace-context";
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
import { isOpenStatus, nextId, nextStatuses as getNextStatuses } from "@/components/work-orders/work-order-utils";
import { calculateWorkOrderPricing, WorkOrder } from "@/domain/work-order";
import { useClientsRealtime } from "@/hooks/use-clients-realtime";
import { useDomainEventsRealtime } from "@/hooks/use-domain-events-realtime";
import { useEmployeesRealtime } from "@/hooks/use-employees-realtime";
import { useInventoryRealtime } from "@/hooks/use-inventory-realtime";
import { useMotorsRealtime } from "@/hooks/use-motors-realtime";
import { useOperationsRealtime } from "@/hooks/use-operations-realtime";
import { usePayrollTransactionsRealtime } from "@/hooks/use-payroll-transactions-realtime";
import { useVehiclesRealtime } from "@/hooks/use-vehicles-realtime";
import { useWorkOrderDocumentsRealtime } from "@/hooks/use-work-order-documents-realtime";
import { useCompanyAppConfig } from "@/hooks/use-company-app-config";
import { useWorkOrdersRealtime } from "@/hooks/use-work-orders-realtime";
import { workOrderToComposerForm } from "@/lib/work-order/order-to-composer-form";
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
  const { registerSyncHandler } = useWorkspace();
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
  const { transactions: payrollTransactions } = usePayrollTransactionsRealtime(
    payrollTransactionRepository,
    companyId,
    !isLoading && canView,
  );

  const { config: companyAppConfig } = useCompanyAppConfig(companyId);
  const quickSpecificCategories = useMemo(() => {
    const fromConfig = (companyAppConfig?.specificCategories ?? []).filter(
      (item) => item.mode === "quick",
    );
    if (fromConfig.length > 0) return fromConfig;
    return SETUP_WIZARD_CATEGORY_PRESETS.filter((item) => item.mode === "quick");
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
  const openCount = orders.filter((order) => isOpenStatus(order.status)).length;
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
  }, []);

  const startCreate = useCallback(() => {
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
        setError("Укажите исполнителя — выберите сотрудника, нажмите «Я» или введите имя");
        return current;
      }
      const pricingMode = draft.pricingMode === "hourly" ? "hourly" : "fixed";
      if (pricingMode === "fixed" && !(Number(draft.unitPrice) > 0)) {
        setError("Укажите сумму за работу");
        return current;
      }
      if (pricingMode === "hourly" && !(Number(draft.hours) > 0 && Number(draft.unitPrice) > 0)) {
        setError("Укажите часы и ставку за час");
        return current;
      }
      setError(null);
      assigned = true;
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
  }, [employees]);

  const addPartLine = useCallback(() => {
    const name = form.partName.trim();
    const sku = form.partSku.trim();
    const quantity = Number(form.partQuantity) || 1;
    const manualPrice = Number(form.partUnitPrice) || 0;

    if (!name) {
      setError("Укажите название запчасти");
      return;
    }

    const item =
      inventoryItems.find((entry) => sku && entry.sku === sku) ??
      inventoryItems.find((entry) => entry.name.toLowerCase() === name.toLowerCase());

    if (item) {
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
      setError("Укажите цену для запчасти вне склада");
      return;
    }

    setError(null);
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
  }, [form.partName, form.partSku, form.partQuantity, form.partUnitPrice, inventoryItems]);

  const addMotorLine = useCallback(() => {
    const serial = form.motorSerial.trim();
    const motor = availableMotors.find((entry) => entry.serialCode === serial);
    if (!motor) {
      setError("Двигатель не найден");
      return;
    }
    setError(null);
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
  }, [availableMotors, form.motorSerial, form.motorWarrantyTemplateId]);

  const addSpecificPartLine = useCallback(() => {
    const category = quickSpecificCategories.find((entry) => entry.id === form.specificCategoryId);
    const name = form.specificPartName.trim();
    const price = Number(form.specificPartPrice) || 0;
    if (!category) {
      setError("Выберите категорию");
      return;
    }
    if (!name) {
      setError("Укажите название позиции");
      return;
    }
    if (!(price > 0)) {
      setError("Укажите цену");
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

  const saveDraft = useCallback(async () => {
    if (!profile?.id || !companyId) return;
    if (!form.clientName.trim() || !form.clientPhone.trim()) {
      setError("Укажите клиента и телефон");
      setComposerStep(1);
      return;
    }
    if (!form.vin.trim() && !form.licensePlate.trim()) {
      setError("Укажите VIN или госномер");
      setComposerStep(1);
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const client =
        clients.find((entry) => entry.id === form.clientId) ??
        (await quickCreateClientUseCase(clientRepository, {
          companyId,
          fullName: form.clientName,
          phone: form.clientPhone,
          createdByUserId: profile.id,
        }));
      const vehicle =
        vehicles.find((entry) => entry.id === form.vehicleId) ??
        (await quickCreateVehicleUseCase(vehicleRepository, {
          companyId,
          clientId: client.id,
          make: form.vehicleMake,
          model: form.vehicleModel,
          vin: form.vin,
          licensePlate: form.licensePlate,
          currentMileage: form.mileage,
          createdByUserId: profile.id,
        }));

      const payload = {
        clientId: client.id,
        clientName: client.fullName,
        clientPhone: client.phone,
        vehicleId: vehicle.id,
        vehicleLabel: [vehicle.make, vehicle.model, vehicle.licensePlate].filter(Boolean).join(" "),
        vin: vehicle.vin || form.vin,
        licensePlate: vehicle.licensePlate || form.licensePlate,
        mileage: form.mileage,
        comment: form.comment,
        laborLines: form.laborLines,
        partLines: form.partLines,
        motorLines: form.motorLines,
        pricing,
        paymentAccount: "cashbox" as const,
        paymentMethod: "cash" as const,
        updatedByUserId: profile.id,
      };

      if (editingOrderId) {
        await updateWorkOrderUseCase(workOrderRepository, {
          companyId,
          workOrderId: editingOrderId,
          input: payload,
        });
        setSelectedOrderId(editingOrderId);
      } else {
        const order = await createWorkOrderUseCase(workOrderRepository, domainEventRepository, {
          companyId,
          ...payload,
          createdByUserId: profile.id,
        });
        setSelectedOrderId(order.id);
        void triggerWorkOrderEventProcessing(order.id).catch(() => undefined);
      }
      resetComposer();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Не удалось создать заказ-наряд");
    } finally {
      setSaving(false);
    }
  }, [clients, companyId, editingOrderId, form, pricing, profile?.id, resetComposer, vehicles]);

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

  async function transition(nextStatus: Parameters<typeof transitionWorkOrderStatusUseCase>[2]["nextStatus"]) {
    if (!profile?.id || !companyId || !selectedOrder) return;
    setSaving(true);
    setError(null);
    try {
      await transitionWorkOrderStatusUseCase(workOrderRepository, domainEventRepository, {
        companyId,
        workOrderId: selectedOrder.id,
        nextStatus,
        actorUserId: profile.id,
      });
      if (nextStatus === "completed") {
        void triggerWorkOrderEventProcessing(selectedOrder.id).catch(() => undefined);
      }
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Не удалось изменить статус");
    } finally {
      setSaving(false);
    }
  }

  if (!canView && !isLoading) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <div className="max-w-md rounded-xl border bg-card p-6 text-center">
          <h2 className="font-semibold">Нет доступа</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Для работы с заказ-нарядами нужно право просмотра заказов.
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
            <header className="flex shrink-0 items-center justify-between gap-4 border-b bg-card/80 px-4 py-3 backdrop-blur-sm md:px-5">
              <div>
                <h1 className="text-base font-semibold tracking-tight">Заказ-наряды</h1>
                <p className="text-xs text-muted-foreground">
                  {orders.length} всего · {openCount} открытых
                </p>
              </div>
              {selectedOrder && !isCreating ? (
                <p className="hidden text-sm text-muted-foreground sm:block">
                  Выбран:{" "}
                  <span className="font-medium text-foreground">
                    {formatWorkOrderLabel(selectedOrder, workOrderDisplayIndex)}
                  </span>
                </p>
              ) : null}
            </header>

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
                onSearchChange={setListSearch}
                onFilterChange={setListFilter}
                onSelectOrder={selectOrder}
                onStartCreate={startCreate}
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
                        quickSpecificCategories={quickSpecificCategories}
                        editingLabel={
                          editingOrderId
                            ? `Редактирование ${formatWorkOrderLabel(
                                orders.find((entry) => entry.id === editingOrderId) ?? { id: editingOrderId, number: "" },
                                workOrderDisplayIndex,
                              )}`
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
                        onSave={saveDraft}
                        onCancel={resetComposer}
                      />
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
