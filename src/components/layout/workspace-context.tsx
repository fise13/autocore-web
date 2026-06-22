"use client";

import {
  ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { InventoryItem } from "@/domain/inventory";
import { initialMotorSyncState, MotorSyncState } from "@/domain/motor-sync";
import { MotorAvailability } from "@/infrastructure/firestore/motor-repository";
import { isEditableExternalField, isRedoShortcut, isUndoShortcut } from "@/lib/grid/grid-keyboard-shortcuts";
import {
  clearMotorImportSession,
  dismissMotorImportJob,
  isMotorImportJobDismissed,
  readMotorImportSession,
} from "@/lib/motors/import/motor-import-session";
import { cancelMotorImportJobRemote } from "@/lib/motors/motor-import-api.client";

export type GridSaveStatus = "idle" | "pending" | "saving" | "saved" | "error";

export type MotorExcelIoState = {
  canExport: boolean;
  canImport: boolean;
  busy: "export" | "import" | null;
};

export type WarehouseExcelIoState = {
  canExport: boolean;
  canImport: boolean;
  busy: "export" | "import" | null;
};

export type WarehouseImportProgressState = {
  phase: "analyze" | "apply";
  percent: number;
  message: string;
  fileName?: string;
  jobId?: string;
};

export type MotorImportProgressState = WarehouseImportProgressState;

export type MotorImportReviewSnapshot = {
  jobId: string;
  fileName?: string;
  totalMotors: number;
  validMotors: number;
  specificSheets: number;
};

export type WorkspaceSearchSuggestion = {
  id: string;
  label: string;
  description?: string;
  searchValue: string;
};

export type BarcodeScanSnapshot = {
  barcode: string;
  itemId?: string;
  itemName?: string;
};

type WorkspaceContextValue = {
  search: string;
  setSearch: (value: string) => void;
  searchSuggestions: WorkspaceSearchSuggestion[];
  setSearchSuggestions: (suggestions: WorkspaceSearchSuggestion[]) => void;
  availability: MotorAvailability;
  setAvailability: (value: MotorAvailability) => void;
  selectedBrandLocalId: number | null;
  setSelectedBrandLocalId: (value: number | null) => void;
  selectedEngineLocalId: number | null;
  setSelectedEngineLocalId: (value: number | null) => void;
  selectedSpecificCategoryId: string | null;
  setSelectedSpecificCategoryId: (value: string | null) => void;
  specificColumnsDialogOpen: boolean;
  setSpecificColumnsDialogOpen: (open: boolean) => void;
  selectedWarehouseId: string | null;
  setSelectedWarehouseId: (value: string | null) => void;
  shownCount: number;
  totalCount: number;
  setCounts: (shown: number, total: number) => void;
  saveStatus: GridSaveStatus;
  setSaveStatus: (status: GridSaveStatus) => void;
  saveError: string | null;
  setSaveError: (error: string | null) => void;
  gridZoom: number;
  setGridZoom: (zoom: number) => void;
  registerSaveHandler: (handler: (() => void) | null) => void;
  triggerSave: () => void;
  registerGridUndoHandler: (handler: (() => void) | null) => void;
  registerGridRedoHandler: (handler: (() => void) | null) => void;
  registerCloudPushHandler: (handler: (() => Promise<void>) | null) => void;
  triggerCloudPush: () => Promise<void>;
  motorSyncState: MotorSyncState;
  setMotorSyncState: (state: MotorSyncState | ((prev: MotorSyncState) => MotorSyncState)) => void;
  registerSyncHandler: (handler: (() => Promise<void>) | null) => void;
  triggerSync: () => Promise<boolean>;
  registerMotorExcelHandlers: (handlers: {
    exportMotors: () => Promise<void>;
    importMotors: (file: File) => Promise<void>;
  } | null) => void;
  setMotorExcelAvailability: (state: MotorExcelIoState) => void;
  motorExcelIo: MotorExcelIoState;
  triggerMotorExport: () => Promise<void>;
  triggerMotorImport: (file: File) => Promise<void>;
  registerMotorImportPicker: (handler: (() => void) | null) => void;
  triggerMotorImportPicker: () => boolean;
  registerWarehouseExcelHandlers: (handlers: {
    exportWarehouse: () => Promise<void>;
    importWarehouse: () => Promise<void>;
  } | null) => void;
  setWarehouseExcelAvailability: (state: WarehouseExcelIoState) => void;
  warehouseExcelIo: WarehouseExcelIoState;
  triggerWarehouseExport: () => Promise<void>;
  triggerWarehouseImport: () => Promise<void>;
  registerWarehouseImportPicker: (handler: (() => void) | null) => void;
  triggerWarehouseImportPicker: () => boolean;
  registerWarehouseBarcodeHandler: (handler: (() => void) | null) => void;
  triggerWarehouseBarcode: () => boolean;
  warehouseItemHighlightId: string | null;
  setWarehouseItemHighlightId: (id: string | null) => void;
  warehouseBarcodePrefill: string | null;
  setWarehouseBarcodePrefill: (barcode: string | null) => void;
  lastBarcodeScan: BarcodeScanSnapshot | null;
  setLastBarcodeScan: (scan: BarcodeScanSnapshot | null) => void;
  registerWorkOrderBarcodeScanHandler: (handler: ((item: InventoryItem) => boolean) | null) => void;
  triggerWorkOrderBarcodeScan: (item: InventoryItem) => boolean;
  warehouseImportProgress: WarehouseImportProgressState | null;
  setWarehouseImportProgress: (progress: WarehouseImportProgressState | null) => void;
  registerWarehouseImportCancel: (handler: (() => void) | null) => void;
  cancelWarehouseImport: () => void;
  motorImportProgress: MotorImportProgressState | null;
  setMotorImportProgress: (progress: MotorImportProgressState | null) => void;
  motorImportPendingJobId: string | null;
  setMotorImportPendingJobId: (jobId: string | null) => void;
  registerMotorImportCancel: (handler: (() => void) | null) => void;
  cancelMotorImport: () => void;
  motorImportReviewPending: boolean;
  motorImportReview: MotorImportReviewSnapshot | null;
  setMotorImportReview: (review: MotorImportReviewSnapshot | null) => void;
  dismissMotorImportReview: () => void;
  setMotorImportReviewPending: (pending: boolean) => void;
  registerImportIslandHandler: (handler: (() => void) | null) => void;
  triggerImportIslandClick: () => void;
};

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [search, setSearch] = useState("");
  const [searchSuggestions, setSearchSuggestionsState] = useState<WorkspaceSearchSuggestion[]>([]);

  const setSearchSuggestions = useCallback((suggestions: WorkspaceSearchSuggestion[]) => {
    setSearchSuggestionsState((prev) => {
      if (
        prev.length === suggestions.length &&
        prev.every(
          (item, index) =>
            item.id === suggestions[index]?.id &&
            item.label === suggestions[index]?.label &&
            item.description === suggestions[index]?.description &&
            item.searchValue === suggestions[index]?.searchValue,
        )
      ) {
        return prev;
      }
      return suggestions;
    });
  }, []);
  const [availability, setAvailability] = useState<MotorAvailability>("all");
  const [selectedBrandLocalId, setSelectedBrandLocalId] = useState<number | null>(null);
  const [selectedEngineLocalId, setSelectedEngineLocalId] = useState<number | null>(null);
  const [selectedSpecificCategoryId, setSelectedSpecificCategoryId] = useState<string | null>(null);
  const [specificColumnsDialogOpen, setSpecificColumnsDialogOpen] = useState(false);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string | null>(null);
  const [shownCount, setShownCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [saveStatus, setSaveStatus] = useState<GridSaveStatus>("idle");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [gridZoom, setGridZoom] = useState(1);
  const [motorSyncState, setMotorSyncState] = useState<MotorSyncState>(initialMotorSyncState);
  const saveHandlerRef = useRef<(() => void) | null>(null);
  const undoHandlerRef = useRef<(() => void) | null>(null);
  const redoHandlerRef = useRef<(() => void) | null>(null);
  const cloudPushHandlerRef = useRef<(() => Promise<void>) | null>(null);
  const syncHandlerRef = useRef<(() => Promise<void>) | null>(null);
  const savingRef = useRef(false);
  const motorExportRef = useRef<(() => Promise<void>)>(async () => {
    throw new Error("Экспорт недоступен");
  });
  const motorImportRef = useRef<(file: File) => Promise<void>>(async () => {
    throw new Error("Импорт недоступен");
  });
  const motorImportPickerRef = useRef<(() => void) | null>(null);
  const warehouseExportRef = useRef<(() => Promise<void>)>(async () => {
    throw new Error("Экспорт недоступен");
  });
  const warehouseImportRef = useRef<(() => Promise<void>)>(async () => {
    throw new Error("Импорт недоступен");
  });
  const warehouseImportPickerRef = useRef<(() => void) | null>(null);
  const warehouseBarcodeHandlerRef = useRef<(() => void) | null>(null);
  const workOrderBarcodeScanRef = useRef<((item: InventoryItem) => boolean) | null>(null);
  const [warehouseItemHighlightId, setWarehouseItemHighlightId] = useState<string | null>(null);
  const [warehouseBarcodePrefill, setWarehouseBarcodePrefill] = useState<string | null>(null);
  const [lastBarcodeScan, setLastBarcodeScan] = useState<BarcodeScanSnapshot | null>(null);
  const [motorExcelIo, setMotorExcelIo] = useState<MotorExcelIoState>({
    canExport: false,
    canImport: false,
    busy: null,
  });
  const [warehouseExcelIo, setWarehouseExcelIo] = useState<WarehouseExcelIoState>({
    canExport: false,
    canImport: false,
    busy: null,
  });
  const [warehouseImportProgress, setWarehouseImportProgress] =
    useState<WarehouseImportProgressState | null>(null);
  const [motorImportProgress, setMotorImportProgressState] =
    useState<MotorImportProgressState | null>(null);
  const [motorImportPendingJobId, setMotorImportPendingJobIdState] = useState<string | null>(null);
  const motorImportPendingJobIdRef = useRef<string | null>(null);
  const motorImportReviewRef = useRef<MotorImportReviewSnapshot | null>(null);
  const motorImportProgressRef = useRef<MotorImportProgressState | null>(null);
  const motorImportUserCancelledRef = useRef(false);
  const warehouseImportCancelRef = useRef<(() => void) | null>(null);
  const motorImportCancelRef = useRef<(() => void) | null>(null);
  const importIslandHandlerRef = useRef<(() => void) | null>(null);
  const [motorImportReview, setMotorImportReview] = useState<MotorImportReviewSnapshot | null>(null);
  motorImportPendingJobIdRef.current = motorImportPendingJobId;
  motorImportReviewRef.current = motorImportReview;
  motorImportProgressRef.current = motorImportProgress;

  const setMotorImportPendingJobId = useCallback((jobId: string | null) => {
    if (jobId !== null) {
      motorImportUserCancelledRef.current = false;
    }
    motorImportPendingJobIdRef.current = jobId;
    setMotorImportPendingJobIdState(jobId);
  }, []);

  const setMotorImportProgress = useCallback((progress: MotorImportProgressState | null) => {
    motorImportProgressRef.current = progress;
    if (progress !== null && motorImportUserCancelledRef.current) {
      return;
    }
    setMotorImportProgressState(progress);
  }, []);

  const dismissMotorImportReview = useCallback(() => {
    const jobId = motorImportReviewRef.current?.jobId;
    if (jobId) {
      dismissMotorImportJob(jobId);
      void cancelMotorImportJobRemote(jobId);
    }
    setMotorImportReview((current) => {
      if (current) {
        clearMotorImportSession();
      }
      return null;
    });
    motorImportUserCancelledRef.current = true;
    setMotorImportPendingJobId(null);
    setMotorImportProgress(null);
  }, [setMotorImportPendingJobId, setMotorImportProgress]);

  const setMotorImportReviewPending = useCallback((pending: boolean) => {
    if (!pending) {
      setMotorImportReview(null);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.sessionStorage.getItem("autocore.motor-import.session");
      if (!raw) return;
      const parsed = JSON.parse(raw) as { jobId?: string };
      if (parsed.jobId && !isMotorImportJobDismissed(parsed.jobId)) {
        setMotorImportPendingJobId(parsed.jobId);
      }
    } catch {
      // ignore
    }
  }, [setMotorImportPendingJobId]);

  const registerWarehouseImportCancel = useCallback((handler: (() => void) | null) => {
    warehouseImportCancelRef.current = handler;
  }, []);

  const cancelWarehouseImport = useCallback(() => {
    warehouseImportCancelRef.current?.();
  }, []);

  const registerMotorImportCancel = useCallback((handler: (() => void) | null) => {
    motorImportCancelRef.current = handler;
  }, []);

  const cancelMotorImport = useCallback(() => {
    const jobId =
      motorImportPendingJobIdRef.current ??
      motorImportProgressRef.current?.jobId ??
      motorImportReviewRef.current?.jobId ??
      readMotorImportSession()?.jobId ??
      null;

    motorImportUserCancelledRef.current = true;

    if (jobId) {
      dismissMotorImportJob(jobId);
      void cancelMotorImportJobRemote(jobId);
    }

    motorImportCancelRef.current?.();
    clearMotorImportSession();
    setMotorImportReview(null);
    setMotorImportPendingJobId(null);
    setMotorImportProgressState(null);
    motorImportProgressRef.current = null;
  }, [setMotorImportPendingJobId]);

  const registerImportIslandHandler = useCallback((handler: (() => void) | null) => {
    importIslandHandlerRef.current = handler;
  }, []);

  const triggerImportIslandClick = useCallback(() => {
    importIslandHandlerRef.current?.();
  }, []);

  const setCounts = useCallback((shown: number, total: number) => {
    setShownCount((prev) => (prev === shown ? prev : shown));
    setTotalCount((prev) => (prev === total ? prev : total));
  }, []);

  const registerSaveHandler = useCallback((handler: (() => void) | null) => {
    saveHandlerRef.current = handler;
  }, []);

  const registerGridUndoHandler = useCallback((handler: (() => void) | null) => {
    undoHandlerRef.current = handler;
  }, []);

  const registerGridRedoHandler = useCallback((handler: (() => void) | null) => {
    redoHandlerRef.current = handler;
  }, []);

  const triggerSave = useCallback(() => {
    saveHandlerRef.current?.();
  }, []);

  const triggerSync = useCallback(async (): Promise<boolean> => {
    if (savingRef.current) return true;
    savingRef.current = true;
    try {
      saveHandlerRef.current?.();
      if (cloudPushHandlerRef.current) {
        await cloudPushHandlerRef.current();
        return true;
      }
      if (syncHandlerRef.current) {
        await syncHandlerRef.current();
        return true;
      }
      return Boolean(saveHandlerRef.current);
    } finally {
      savingRef.current = false;
    }
  }, []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const cmd = event.metaKey || event.ctrlKey;
      if (!cmd) return;

      const isSaveKey = event.code === "KeyS" || event.key.toLowerCase() === "s";
      if (isSaveKey) {
        event.preventDefault();
        event.stopPropagation();
        void triggerSync().catch((error) => {
          console.error("Save failed:", error);
        });
        return;
      }

      if (isEditableExternalField(event.target)) return;

      if (isUndoShortcut(event) && undoHandlerRef.current) {
        event.preventDefault();
        event.stopPropagation();
        undoHandlerRef.current();
        return;
      }

      if (isRedoShortcut(event) && redoHandlerRef.current) {
        event.preventDefault();
        event.stopPropagation();
        redoHandlerRef.current();
      }
    }

    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [triggerSync]);

  const registerCloudPushHandler = useCallback((handler: (() => Promise<void>) | null) => {
    cloudPushHandlerRef.current = handler;
  }, []);

  const triggerCloudPush = useCallback(async () => {
    if (!cloudPushHandlerRef.current) {
      throw new Error("Сохранение недоступно: таблица ещё не готова.");
    }
    await cloudPushHandlerRef.current();
  }, []);

  const registerSyncHandler = useCallback((handler: (() => Promise<void>) | null) => {
    syncHandlerRef.current = handler;
  }, []);

  const registerMotorExcelHandlers = useCallback(
    (
      handlers: {
        exportMotors: () => Promise<void>;
        importMotors: (file: File) => Promise<void>;
      } | null,
    ) => {
      if (!handlers) {
        motorExportRef.current = async () => {
          throw new Error("Экспорт недоступен");
        };
        motorImportRef.current = async () => {
          throw new Error("Импорт недоступен");
        };
        return;
      }

      motorExportRef.current = handlers.exportMotors;
      motorImportRef.current = handlers.importMotors;
    },
    [],
  );

  const setMotorExcelAvailability = useCallback((state: MotorExcelIoState) => {
    setMotorExcelIo((current) => {
      if (
        current.canExport === state.canExport &&
        current.canImport === state.canImport &&
        current.busy === state.busy
      ) {
        return current;
      }
      return state;
    });
  }, []);

  const triggerMotorExport = useCallback(async () => {
    if (!motorExcelIo.canExport) {
      throw new Error("Экспорт недоступен");
    }
    await motorExportRef.current();
  }, [motorExcelIo.canExport]);

  const triggerMotorImport = useCallback(async (file: File) => {
    if (!motorExcelIo.canImport) {
      throw new Error("Импорт недоступен");
    }
    await motorImportRef.current(file);
  }, [motorExcelIo.canImport]);

  const registerMotorImportPicker = useCallback((handler: (() => void) | null) => {
    motorImportPickerRef.current = handler;
  }, []);

  const triggerMotorImportPicker = useCallback((): boolean => {
    if (!motorImportPickerRef.current) {
      return false;
    }
    motorImportPickerRef.current();
    return true;
  }, []);

  const registerWarehouseExcelHandlers = useCallback(
    (
      handlers: {
        exportWarehouse: () => Promise<void>;
        importWarehouse: () => Promise<void>;
      } | null,
    ) => {
      if (!handlers) {
        warehouseExportRef.current = async () => {
          throw new Error("Экспорт недоступен");
        };
        warehouseImportRef.current = async () => {
          throw new Error("Импорт недоступен");
        };
        return;
      }

      warehouseExportRef.current = handlers.exportWarehouse;
      warehouseImportRef.current = handlers.importWarehouse;
    },
    [],
  );

  const setWarehouseExcelAvailability = useCallback((state: WarehouseExcelIoState) => {
    setWarehouseExcelIo((current) => {
      if (
        current.canExport === state.canExport &&
        current.canImport === state.canImport &&
        current.busy === state.busy
      ) {
        return current;
      }
      return state;
    });
  }, []);

  const triggerWarehouseExport = useCallback(async () => {
    if (!warehouseExcelIo.canExport) {
      throw new Error("Экспорт недоступен");
    }
    await warehouseExportRef.current();
  }, [warehouseExcelIo.canExport]);

  const triggerWarehouseImport = useCallback(async () => {
    if (!warehouseExcelIo.canImport) {
      throw new Error("Импорт недоступен");
    }
    await warehouseImportRef.current();
  }, [warehouseExcelIo.canImport]);

  const registerWarehouseImportPicker = useCallback((handler: (() => void) | null) => {
    warehouseImportPickerRef.current = handler;
  }, []);

  const triggerWarehouseImportPicker = useCallback((): boolean => {
    if (!warehouseImportPickerRef.current) {
      return false;
    }
    warehouseImportPickerRef.current();
    return true;
  }, []);

  const registerWarehouseBarcodeHandler = useCallback((handler: (() => void) | null) => {
    warehouseBarcodeHandlerRef.current = handler;
  }, []);

  const triggerWarehouseBarcode = useCallback((): boolean => {
    if (!warehouseBarcodeHandlerRef.current) {
      return false;
    }
    warehouseBarcodeHandlerRef.current();
    return true;
  }, []);

  const registerWorkOrderBarcodeScanHandler = useCallback(
    (handler: ((item: InventoryItem) => boolean) | null) => {
      workOrderBarcodeScanRef.current = handler;
    },
    [],
  );

  const triggerWorkOrderBarcodeScan = useCallback((item: InventoryItem): boolean => {
    if (!workOrderBarcodeScanRef.current) return false;
    return workOrderBarcodeScanRef.current(item);
  }, []);

  const motorImportReviewPending = motorImportReview !== null;

  const value = useMemo(
    () => ({
      search,
      setSearch,
      searchSuggestions,
      setSearchSuggestions,
      availability,
      setAvailability,
      selectedBrandLocalId,
      setSelectedBrandLocalId,
      selectedEngineLocalId,
      setSelectedEngineLocalId,
      selectedSpecificCategoryId,
      setSelectedSpecificCategoryId,
      specificColumnsDialogOpen,
      setSpecificColumnsDialogOpen,
      selectedWarehouseId,
      setSelectedWarehouseId,
      shownCount,
      totalCount,
      setCounts,
      saveStatus,
      setSaveStatus,
      saveError,
      setSaveError,
      gridZoom,
      setGridZoom,
      registerSaveHandler,
      triggerSave,
      registerGridUndoHandler,
      registerGridRedoHandler,
      registerCloudPushHandler,
      triggerCloudPush,
      motorSyncState,
      setMotorSyncState,
      registerSyncHandler,
      triggerSync,
      registerMotorExcelHandlers,
      setMotorExcelAvailability,
      motorExcelIo,
      triggerMotorExport,
      triggerMotorImport,
      registerMotorImportPicker,
      triggerMotorImportPicker,
      registerWarehouseExcelHandlers,
      setWarehouseExcelAvailability,
      warehouseExcelIo,
      triggerWarehouseExport,
      triggerWarehouseImport,
      registerWarehouseImportPicker,
      triggerWarehouseImportPicker,
      registerWarehouseBarcodeHandler,
      triggerWarehouseBarcode,
      warehouseItemHighlightId,
      setWarehouseItemHighlightId,
      warehouseBarcodePrefill,
      setWarehouseBarcodePrefill,
      lastBarcodeScan,
      setLastBarcodeScan,
      registerWorkOrderBarcodeScanHandler,
      triggerWorkOrderBarcodeScan,
      warehouseImportProgress,
      setWarehouseImportProgress,
      registerWarehouseImportCancel,
      cancelWarehouseImport,
      motorImportProgress,
      setMotorImportProgress,
      motorImportPendingJobId,
      setMotorImportPendingJobId,
      registerMotorImportCancel,
      cancelMotorImport,
      motorImportReviewPending,
      motorImportReview,
      setMotorImportReview,
      dismissMotorImportReview,
      setMotorImportReviewPending,
      registerImportIslandHandler,
      triggerImportIslandClick,
    }),
    [
      search,
      searchSuggestions,
      availability,
      selectedBrandLocalId,
      selectedEngineLocalId,
      selectedSpecificCategoryId,
      specificColumnsDialogOpen,
      selectedWarehouseId,
      shownCount,
      totalCount,
      setCounts,
      saveStatus,
      saveError,
      gridZoom,
      registerSaveHandler,
      triggerSave,
      registerGridUndoHandler,
      registerGridRedoHandler,
      registerCloudPushHandler,
      triggerCloudPush,
      motorSyncState,
      registerSyncHandler,
      triggerSync,
      registerMotorExcelHandlers,
      setMotorExcelAvailability,
      motorExcelIo,
      triggerMotorExport,
      triggerMotorImport,
      registerMotorImportPicker,
      triggerMotorImportPicker,
      registerWarehouseExcelHandlers,
      setWarehouseExcelAvailability,
      warehouseExcelIo,
      triggerWarehouseExport,
      triggerWarehouseImport,
      registerWarehouseImportPicker,
      triggerWarehouseImportPicker,
      registerWarehouseBarcodeHandler,
      triggerWarehouseBarcode,
      warehouseItemHighlightId,
      warehouseBarcodePrefill,
      lastBarcodeScan,
      registerWorkOrderBarcodeScanHandler,
      triggerWorkOrderBarcodeScan,
      warehouseImportProgress,
      registerWarehouseImportCancel,
      cancelWarehouseImport,
      motorImportProgress,
      motorImportPendingJobId,
      registerMotorImportCancel,
      cancelMotorImport,
      motorImportReviewPending,
      motorImportReview,
      dismissMotorImportReview,
      registerImportIslandHandler,
      triggerImportIslandClick,
    ],
  );

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error("useWorkspace must be used inside WorkspaceProvider");
  }
  return context;
}
