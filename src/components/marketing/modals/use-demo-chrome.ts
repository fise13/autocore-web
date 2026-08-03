"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";

import type { WorkOrderStatus } from "@/domain/work-order";
import type { DocumentUiLabels } from "@/lib/documents/document-context";

/** Localized labels for marketing demo grids, mobile sim, finance tabs, AI import, etc. */
export function useDemoChrome() {
  const t = useTranslations("marketing.demoChrome");

  const columns = useMemo(
    () => ({
      brand: t("columns.brand"),
      engine: t("columns.engine"),
      serial: t("columns.serial"),
      qty: t("columns.qty"),
      place: t("columns.place"),
      price: t("columns.price"),
      box: t("columns.box"),
      status: t("columns.status"),
      reserve: t("columns.reserve"),
      action: t("columns.action"),
      config: t("columns.config"),
      arrival: t("columns.arrival"),
      sku: t("columns.sku"),
      name: t("columns.name"),
      onHand: t("columns.onHand"),
      available: t("columns.available"),
    }),
    [t],
  );

  const filters = useMemo(
    () => ({
      all: t("filters.all"),
      inStock: t("filters.inStock"),
      reserved: t("filters.reserved"),
      search: t("filters.search"),
      searchMotors: t("filters.searchMotors"),
      searchWarehouse: t("filters.searchWarehouse"),
      export: t("filters.export"),
      filters: t("filters.filters"),
      empty: t("filters.empty"),
      statusFilterAria: t("filters.statusFilterAria"),
      countOf: (shown: number, total: number) => t("filters.countOf", { shown, total }),
      rows: t("filters.rows"),
    }),
    [t],
  );

  const status = useMemo(
    () => ({
      inStock: t("status.inStock"),
      reserved: t("status.reserved"),
      reservedFor: (name: string) => t("status.reservedFor", { name }),
      label: (motorStatus: "reserved" | "available") =>
        motorStatus === "reserved" ? t("status.reserved") : t("status.inStock"),
    }),
    [t],
  );

  const grid = useMemo(
    () => ({
      ariaLabel: t("grid.ariaLabel"),
      motorsTitle: t("grid.motorsTitle"),
      demoData: t("grid.demoData"),
      motorsSection: t("grid.motorsSection"),
    }),
    [t],
  );

  const mobile = useMemo(
    () => ({
      warehouse: t("mobile.warehouse"),
      scan: t("mobile.scan"),
      scanAria: t("mobile.scanAria"),
      positionsSummary: (total: number, units: number) =>
        t("mobile.positionsSummary", { total, units }),
      onHand: t("mobile.onHand"),
      positions: t("mobile.positions"),
      searchPlaceholder: t("mobile.searchPlaceholder"),
      searchAria: t("mobile.searchAria"),
      bin: t("mobile.bin"),
      minus: t("mobile.minus"),
      plus: t("mobile.plus"),
      scanHint: t("mobile.scanHint"),
      scanning: t("mobile.scanning"),
      tapScanAgain: t("mobile.tapScanAgain"),
      tapScan: t("mobile.tapScan"),
      exactMatch: t("mobile.exactMatch"),
      balance: t("mobile.balance"),
      warehouseName: t("mobile.warehouseName"),
      location: t("mobile.location"),
      price: t("mobile.price"),
      openCard: t("mobile.openCard"),
      tabsAria: t("mobile.tabsAria"),
      reserveToast: (engine: string, location: string) =>
        t("mobile.reserveToast", { engine, location }),
    }),
    [t],
  );

  const finance = useMemo(
    () => ({
      kicker: t("finance.kicker"),
      title: t("finance.title"),
      balance: (amount: string) => t("finance.balance", { amount }),
      overview: t("finance.overview"),
      operations: t("finance.operations"),
      workOrders: t("finance.workOrders"),
    }),
    [t],
  );

  const aiImport = useMemo(
    () => ({
      windowTitle: t("aiImport.windowTitle"),
      ready: t("aiImport.ready"),
      dropFile: t("aiImport.dropFile"),
      mapping: t("aiImport.mapping"),
      importing: t("aiImport.importing"),
      accepted: t("aiImport.accepted"),
      upload: t("aiImport.upload"),
      runAgain: t("aiImport.runAgain"),
      done: t("aiImport.done"),
      mappingRows: [
        {
          col: t("aiImport.mappingColSku"),
          field: t("aiImport.mappingFieldSku"),
          confidence: 0.98,
        },
        {
          col: t("aiImport.mappingColName"),
          field: t("aiImport.mappingFieldName"),
          confidence: 0.94,
        },
        {
          col: t("aiImport.mappingColPrice"),
          field: t("aiImport.mappingFieldCost"),
          confidence: 0.91,
        },
        {
          col: t("aiImport.mappingColQty"),
          field: t("aiImport.mappingFieldStock"),
          confidence: 0.88,
        },
      ] as const,
    }),
    [t],
  );

  const philosophy = useMemo(
    () => ({
      before: t("philosophy.before"),
      after: t("philosophy.after"),
    }),
    [t],
  );

  const weekdays = useMemo(
    () =>
      [
        t("weekdays.mon"),
        t("weekdays.tue"),
        t("weekdays.wed"),
        t("weekdays.thu"),
        t("weekdays.fri"),
        t("weekdays.sat"),
        t("weekdays.sun"),
      ] as const,
    [t],
  );

  const nav = useMemo(
    () => ({
      overview: t("nav.overview"),
      warehouse: t("nav.warehouse"),
      inventory: t("nav.inventory"),
      activity: t("nav.activity"),
      accounting: t("nav.accounting"),
      employees: t("nav.employees"),
    }),
    [t],
  );

  const common = useMemo(
    () => ({
      inStock: t("common.inStock"),
      reserve: t("common.reserve"),
      now: t("common.now"),
      shelf: t("common.shelf"),
      cost: t("common.cost"),
      total: t("common.total"),
      engine: t("common.engine"),
      vehicle: t("common.vehicle"),
      client: t("common.client"),
      auto: t("common.auto"),
      hoursShort: t("common.hoursShort"),
      works: t("common.works"),
      fromWarehouse: t("common.fromWarehouse"),
      justNow: t("common.justNow"),
      sent: t("common.sent"),
      inProgress: t("common.inProgress"),
      newStatus: t("common.newStatus"),
      closed: t("common.closed"),
      synced: t("common.synced"),
      receiving: t("common.receiving"),
      receivingData: t("common.receivingData"),
      processing: t("common.processing"),
      waiting: t("common.waiting"),
      scanning: t("common.scanning"),
      syncing: t("common.syncing"),
      updatedNow: t("common.updatedNow"),
      days180: t("common.days180"),
      gray: t("common.gray"),
      activityLog: t("common.activityLog"),
      demoCompany: t("common.demoCompany"),
      storekeeper: t("common.storekeeper"),
      onDesktop: t("common.onDesktop"),
    }),
    [t],
  );

  const operational = useMemo(
    () => ({
      opsCenter: t("operational.opsCenter"),
      revenueToday: t("operational.revenueToday"),
      openOrders: t("operational.openOrders"),
      stockPositions: t("operational.stockPositions"),
      teamOnline: t("operational.teamOnline"),
      lowStock: t("operational.lowStock"),
      balance: t("operational.balance"),
      advances: t("operational.advances"),
      warehouseValue: t("operational.warehouseValue"),
      warehouseDetail: t("operational.warehouseDetail"),
      accountingDetail: t("operational.accountingDetail"),
      inventoryValue: t("operational.inventoryValue"),
      inventoryDetail: t("operational.inventoryDetail"),
      employeesValue: t("operational.employeesValue"),
      employeesDetail: t("operational.employeesDetail"),
    }),
    [t],
  );

  const sync = useMemo(
    () => ({
      titleWarehouse: t("sync.titleWarehouse"),
      masterDesk: t("sync.masterDesk"),
      onHand: t("sync.onHand"),
      reserves: t("sync.reserves"),
      today: t("sync.today"),
      newFromPhone: t("sync.newFromPhone"),
      engineShelf: t("sync.engineShelf"),
      reserveCreated: t("sync.reserveCreated"),
      reserveMeta: t("sync.reserveMeta"),
      positionInStock: t("sync.positionInStock"),
      warehouseLiveSync: t("sync.warehouseLiveSync"),
      newReserveIphone: t("sync.newReserveIphone"),
    }),
    [t],
  );

  const overview = useMemo(
    () => ({
      revenue: t("overview.revenue"),
      orders: t("overview.orders"),
      warehouse: t("overview.warehouse"),
      online: t("overview.online"),
      alerts: t("overview.alerts"),
      incomeExpense: t("overview.incomeExpense"),
      ops7days: t("overview.ops7days"),
      activity: t("overview.activity"),
      opsEvents: t("overview.opsEvents"),
      income: t("overview.income"),
      expense: t("overview.expense"),
    }),
    [t],
  );

  const scan = useMemo(
    () => ({
      scanningVin: t("scan.scanningVin"),
      scanningCode: t("scan.scanningCode"),
      vinRecognized: t("scan.vinRecognized"),
      savedOnPhone: t("scan.savedOnPhone"),
      saved: t("scan.saved"),
      reservedForWo: t("scan.reservedForWo"),
      vinScanned: t("scan.vinScanned"),
      sentToDesktop: t("scan.sentToDesktop"),
      aimAtCode: t("scan.aimAtCode"),
      vinReady: t("scan.vinReady"),
      sending: t("scan.sending"),
      waitingVin: t("scan.waitingVin"),
      warehousePhone: t("scan.warehousePhone"),
      warehouseEngines: t("scan.warehouseEngines"),
      engineShelfMeta: t("scan.engineShelfMeta"),
    }),
    [t],
  );

  const analytics = useMemo(
    () => ({
      title: t("analytics.title"),
      revenueWeek: t("analytics.revenueWeek"),
      orders: t("analytics.orders"),
      margin: t("analytics.margin"),
      balance: t("analytics.balance"),
    }),
    [t],
  );

  const vehicle = useMemo(
    () => ({
      title: t("vehicle.title"),
      specLine: (color: string) => t("vehicle.specLine", { color }),
      scanning: t("vehicle.scanning"),
      inDatabase: t("vehicle.inDatabase"),
      mileage: t("vehicle.mileage"),
      mileageValue: t("vehicle.mileageValue"),
      orderLink: t("vehicle.orderLink"),
      engineSwap: t("vehicle.engineSwap"),
      warrantyG4kc: t("vehicle.warrantyG4kc"),
      historyReady: t("vehicle.historyReady"),
    }),
    [t],
  );

  const workOrder = useMemo(
    () => ({
      title: t("workOrder.title"),
      number: t("workOrder.number"),
      windowTitle: t("workOrder.windowTitle"),
      engineSwap: t("workOrder.engineSwap"),
      stepCreate: t("workOrder.stepCreate"),
      stepReserve: t("workOrder.stepReserve"),
      stepClose: t("workOrder.stepClose"),
      listTitle: t("workOrder.listTitle"),
      hoursAt: (hours: number, price: string) => t("workOrder.hoursAt", { hours, price }),
    }),
    [t],
  );

  const documents = useMemo(
    () => ({
      title: t("documents.title"),
      warrantyTicket: t("documents.warrantyTicket"),
      orderDays: t("documents.orderDays"),
      engineLine: t("documents.engineLine"),
      vehicleLine: t("documents.vehicleLine"),
      mileageLine: t("documents.mileageLine"),
      qrAdded: t("documents.qrAdded"),
      printing: t("documents.printing"),
      preview: t("documents.preview"),
      windowTitle: t("documents.windowTitle"),
      act: t("documents.act"),
      typeAria: t("documents.typeAria"),
      titles: {
        "work-order": t("documents.titles.work-order"),
        "service-act": t("documents.titles.service-act"),
        "engine-warranty": t("documents.titles.engine-warranty"),
        "service-tag": t("documents.titles.service-tag"),
        invoice: t("documents.titles.invoice"),
        "engine-waybill": t("documents.titles.engine-waybill"),
        "commercial-proposal": t("documents.titles.commercial-proposal"),
        "vehicle-intake-act": t("documents.titles.vehicle-intake-act"),
        "sales-receipt": t("documents.titles.sales-receipt"),
      } as const,
    }),
    [t],
  );

  const feed = useMemo(() => {
    const events = t.raw("feed.events") as Array<{
      actor: string;
      module: string;
      action: string;
      tone: "success" | "warning" | "operational" | "critical";
    }>;
    return {
      now: t("feed.now"),
      secondsAgo: (n: number) => t("feed.secondsAgo", { n }),
      events,
    };
  }, [t]);

  const devices = useMemo(
    () => ({
      scanWarehouse: t("devices.scanWarehouse"),
      recognized: (code: string) => t("devices.recognized", { code }),
      officeTitle: t("devices.officeTitle"),
      sameObject: t("devices.sameObject"),
      shelfVisible: (location: string) => t("devices.shelfVisible", { location }),
    }),
    [t],
  );

  const repair = useMemo(
    () => ({
      title: t("repair.title"),
      orderOpened: t("repair.orderOpened"),
      engineRemoved: t("repair.engineRemoved"),
      g4kcInstalled: t("repair.g4kcInstalled"),
      userIvan: t("repair.userIvan"),
      userAlexey: t("repair.userAlexey"),
      photoAttached: t("repair.photoAttached"),
      repairDone: t("repair.repairDone"),
    }),
    [t],
  );

  const aiImportMock = useMemo(
    () => ({
      title: t("aiImportMock.title"),
      accepted128: t("aiImportMock.accepted128"),
      mapping: t("aiImportMock.mapping"),
      dropExcel: t("aiImportMock.dropExcel"),
      done128: t("aiImportMock.done128"),
      mappingRows: [
        { col: t("aiImportMock.colSku"), field: t("aiImportMock.fieldSku") },
        { col: t("aiImportMock.colName"), field: t("aiImportMock.fieldName") },
        { col: t("aiImportMock.colPrice"), field: t("aiImportMock.fieldCost") },
      ] as const,
    }),
    [t],
  );

  const platform = useMemo(
    () => ({
      oneSystem: t("platform.oneSystem"),
      linkActive: t("platform.linkActive"),
      readyToSend: t("platform.readyToSend"),
    }),
    [t],
  );

  const security = useMemo(
    () => ({
      activityLog: t("security.activityLog"),
      whoWhatWhen: t("security.whoWhatWhen"),
    }),
    [t],
  );

  const financeOps = useMemo(
    () => ({
      paymentComment: (number: string) => t("financeOps.paymentComment", { number }),
      workOrderRevenue: t("financeOps.workOrderRevenue"),
      motorSaleComment: t("financeOps.motorSaleComment"),
      motorSaleDescription: t("financeOps.motorSaleDescription"),
      partsCost: t("financeOps.partsCost"),
      mechanicsPayroll: t("financeOps.mechanicsPayroll"),
      otherShiftRevenue: t("financeOps.otherShiftRevenue"),
      saleIssueDescription: t("financeOps.saleIssueDescription"),
    }),
    [t],
  );

  const accountingUi = useMemo(() => {
    const dateLocale = t("accountingUi.dateLocale") as "en" | "ru";
    const typeLabels = t.raw("accountingUi.typeLabels") as Record<string, string>;
    const typeBadge = t.raw("accountingUi.typeBadge") as Record<string, string>;
    const accountLabels = t.raw("accountingUi.accountLabels") as Record<string, string>;
    const categoryLabels = t.raw("accountingUi.categoryLabels") as Record<string, string>;
    return {
      dateLocale,
      totalBalance: t("accountingUi.totalBalance"),
      cashbox: t("accountingUi.cashbox"),
      kaspi: t("accountingUi.kaspi"),
      today: t("accountingUi.today"),
      todayHint: (income: string, expenses: string) =>
        t("accountingUi.todayHint", { income, expenses }),
      weeklyTitle: t("accountingUi.weeklyTitle"),
      weeklyDescription: t("accountingUi.weeklyDescription"),
      topCategoriesTitle: t("accountingUi.topCategoriesTitle"),
      topCategoriesDescription: t("accountingUi.topCategoriesDescription"),
      noCategories: t("accountingUi.noCategories"),
      typeDistributionTitle: t("accountingUi.typeDistributionTitle"),
      typeDistributionDescription: t("accountingUi.typeDistributionDescription"),
      uncategorized: t("accountingUi.uncategorized"),
      empty: t("accountingUi.empty"),
      colDate: t("accountingUi.colDate"),
      colType: t("accountingUi.colType"),
      colAccount: t("accountingUi.colAccount"),
      colCategory: t("accountingUi.colCategory"),
      colAmount: t("accountingUi.colAmount"),
      colDetails: t("accountingUi.colDetails"),
      colWorkOrder: t("accountingUi.colWorkOrder"),
      colActions: t("accountingUi.colActions"),
      advance: t("accountingUi.advance"),
      incomeFlow: t("accountingUi.incomeFlow"),
      expenseFlow: t("accountingUi.expenseFlow"),
      delete: t("accountingUi.delete"),
      workOrderTitle: (number: number) => t("accountingUi.workOrderTitle", { number }),
      typeLabels,
      typeBadge,
      accountLabels,
      categoryLabels,
    };
  }, [t]);

  const workOrderUi = useMemo(() => {
    const dateLocale = t("workOrderUi.dateLocale") as "en" | "ru";
    const status = t.raw("workOrderUi.status") as Record<string, string>;
    const statusHint = t.raw("workOrderUi.statusHint") as Record<string, string>;
    const titles = t.raw("workOrderUi.documents.titles") as Record<string, string>;
    const descriptions = t.raw("workOrderUi.documents.descriptions") as Record<string, string>;
    return {
      dateLocale,
      orderTitle: (number: number) => t("workOrderUi.orderTitle", { number }),
      assignees: t("workOrderUi.assignees"),
      lineSummary: (labor: number, parts: number, motors: number) =>
        t("workOrderUi.lineSummary", { labor, parts, motors }),
      edit: t("workOrderUi.edit"),
      client: t("workOrderUi.client"),
      vehicle: t("workOrderUi.vehicle"),
      km: (n: string) => t("workOrderUi.km", { n }),
      comment: t("workOrderUi.comment"),
      tabLines: t("workOrderUi.tabLines"),
      tabFinance: t("workOrderUi.tabFinance"),
      tabDocuments: t("workOrderUi.tabDocuments"),
      laborTitle: t("workOrderUi.laborTitle"),
      partsTitle: t("workOrderUi.partsTitle"),
      motorsTitle: t("workOrderUi.motorsTitle"),
      laborEmpty: t("workOrderUi.laborEmpty"),
      partsEmpty: t("workOrderUi.partsEmpty"),
      motorsEmpty: t("workOrderUi.motorsEmpty"),
      adhocTag: t("workOrderUi.adhocTag"),
      install: t("workOrderUi.install"),
      sale: t("workOrderUi.sale"),
      discount: (amount: string) => t("workOrderUi.discount", { amount }),
      systemHistory: (count: number) => t("workOrderUi.systemHistory", { count }),
      noEvents: t("workOrderUi.noEvents"),
      eventPending: t("workOrderUi.eventPending"),
      eventReady: t("workOrderUi.eventReady"),
      noAssignee: t("workOrderUi.noAssignee"),
      hoursAt: (hours: number, price: string, total: string) =>
        t("workOrderUi.hoursAt", { hours, price, total }),
      fixedPrice: (total: string) => t("workOrderUi.fixedPrice", { total }),
      roleLabels: {
        mechanic: t("workOrderUi.roleMechanic"),
        diagnostician: t("workOrderUi.roleDiagnostician"),
        manager: t("workOrderUi.roleManager"),
      },
      status,
      statusHint,
      documents: {
        dateLocale,
        autoHint: t("workOrderUi.documents.autoHint"),
        refresh: t("workOrderUi.documents.refresh"),
        generating: t("workOrderUi.documents.generating"),
        pdfGenerating: t("workOrderUi.documents.pdfGenerating"),
        noneForStatus: t("workOrderUi.documents.noneForStatus"),
        pending: t("workOrderUi.documents.pending"),
        ready: t("workOrderUi.documents.ready"),
        preview: t("workOrderUi.documents.preview"),
        openPdfFailed: t("workOrderUi.documents.openPdfFailed"),
        downloadPdfFailed: t("workOrderUi.documents.downloadPdfFailed"),
        refreshFailed: t("workOrderUi.documents.refreshFailed"),
        savedCount: (count: number) => t("workOrderUi.documents.savedCount", { count }),
        updated: (date: string) => t("workOrderUi.documents.updated", { date }),
        titles,
        descriptions,
      },
      finance: {
        notReady: t("workOrderUi.finance.notReady"),
        income: t("workOrderUi.finance.income"),
        expenses: t("workOrderUi.finance.expenses"),
        payroll: t("workOrderUi.finance.payroll"),
        operationsTitle: t("workOrderUi.finance.operationsTitle"),
        openAccounting: t("workOrderUi.finance.openAccounting"),
        opsProcessing: t("workOrderUi.finance.opsProcessing"),
        opsAfterComplete: t("workOrderUi.finance.opsAfterComplete"),
        payrollTitle: t("workOrderUi.finance.payrollTitle"),
        payrollEmpty: t("workOrderUi.finance.payrollEmpty"),
        categoryLabels: t.raw("accountingUi.categoryLabels") as Record<string, string>,
        typeBadge: t.raw("accountingUi.typeBadge") as Record<string, string>,
      },
      demo: {
        clientName: t("workOrderUi.demo.clientName"),
        comment: t("workOrderUi.demo.comment"),
        orderNumber: t("workOrderUi.demo.orderNumber"),
        labor1: t("workOrderUi.demo.labor1"),
        labor2: t("workOrderUi.demo.labor2"),
        part1: t("workOrderUi.demo.part1"),
        part2: t("workOrderUi.demo.part2"),
        employee1: t("workOrderUi.demo.employee1"),
        employee2: t("workOrderUi.demo.employee2"),
      },
    };
  }, [t]);

  const documentDemo = useMemo(
    () => ({
      legalName: t("documentDemo.legalName"),
      slogan: t("documentDemo.slogan"),
      address: t("documentDemo.address"),
      warrantyLabel: t("documentDemo.warrantyLabel"),
      warrantyText: t("documentDemo.warrantyText"),
      motorNotes: t("documentDemo.motorNotes"),
      vehicleLogbookTitle: t("documentDemo.vehicleLogbookTitle"),
      saleClientName: t("documentDemo.saleClientName"),
    }),
    [t],
  );

  // Use t.raw for ICU template strings (`{date}`, `{km}`, …) — consumers fill
  // placeholders via `.replace()`. Calling `t()` without values throws FORMATTING_ERROR.
  // Hyphenated template keys (`work-order`, …) also need raw object indexing.
  const documentPdf = useMemo(
    () => t.raw("documentPdf") as DocumentUiLabels,
    [t],
  );

  const documentTemplates = useMemo(() => {
    const variants = [
      "work-order",
      "service-act",
      "engine-warranty",
      "invoice",
      "engine-waybill",
      "commercial-proposal",
      "vehicle-intake-act",
      "sales-receipt",
    ] as const;
    const fields = [
      "title",
      "tag",
      "lead",
      "primaryLabel",
      "warrantyBlock",
      "footer",
      "disclaimer",
    ] as const;
    const raw = t.raw("documentTemplates") as Record<
      string,
      Record<string, string>
    >;
    const result = {} as Record<
      (typeof variants)[number],
      Record<(typeof fields)[number], string>
    >;
    for (const variant of variants) {
      const source = raw[variant] ?? {};
      const entry = {} as Record<(typeof fields)[number], string>;
      for (const field of fields) {
        const value = source[field] ?? "";
        // i18n forbids empty messages; "—" means intentionally blank optional copy.
        entry[field] =
          (field === "disclaimer" || field === "warrantyBlock") && value === "—"
            ? ""
            : value;
      }
      result[variant] = entry;
    }
    return result;
  }, [t]);

  const statusLabels = useMemo(
    () => t.raw("statusLabels") as Record<WorkOrderStatus, string>,
    [t],
  );

  const motorsSnapshot = useMemo(
    () => ({
      today: (time: string) => t("motorsSnapshot.today", { time }),
      yesterday: (time: string) => t("motorsSnapshot.yesterday", { time }),
      mon: (time: string) => t("motorsSnapshot.mon", { time }),
      noteContract: (km: string) => t("motorsSnapshot.noteContract", { km }),
      noteParts: (km: string) => t("motorsSnapshot.noteParts", { km }),
      noteKm: (km: string) => t("motorsSnapshot.noteKm", { km }),
      kmSuffix: t("motorsSnapshot.kmSuffix"),
      orderPrefixSource: t("motorsSnapshot.orderPrefixSource"),
      orderPrefixLocalized: t("motorsSnapshot.orderPrefixLocalized"),
    }),
    [t],
  );

  return {
    columns,
    filters,
    status,
    grid,
    mobile,
    finance,
    aiImport,
    philosophy,
    weekdays,
    nav,
    common,
    operational,
    sync,
    overview,
    scan,
    analytics,
    vehicle,
    workOrder,
    documents,
    feed,
    devices,
    repair,
    aiImportMock,
    platform,
    security,
    financeOps,
    accountingUi,
    workOrderUi,
    documentDemo,
    documentPdf,
    documentTemplates,
    statusLabels,
    motorsSnapshot,
    sell: t("sell"),
  };
}
