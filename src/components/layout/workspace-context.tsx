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

import { initialMotorSyncState, MotorSyncState } from "@/domain/motor-sync";
import { MotorAvailability } from "@/infrastructure/firestore/motor-repository";
import { isEditableExternalField, isRedoShortcut, isUndoShortcut } from "@/lib/grid/grid-keyboard-shortcuts";

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

type WorkspaceContextValue = {
  search: string;
  setSearch: (value: string) => void;
  availability: MotorAvailability;
  setAvailability: (value: MotorAvailability) => void;
  selectedBrandLocalId: number | null;
  setSelectedBrandLocalId: (value: number | null) => void;
  selectedEngineLocalId: number | null;
  setSelectedEngineLocalId: (value: number | null) => void;
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
};

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [search, setSearch] = useState("");
  const [availability, setAvailability] = useState<MotorAvailability>("all");
  const [selectedBrandLocalId, setSelectedBrandLocalId] = useState<number | null>(null);
  const [selectedEngineLocalId, setSelectedEngineLocalId] = useState<number | null>(null);
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
    if (!syncHandlerRef.current) {
      saveHandlerRef.current?.();
      return Boolean(saveHandlerRef.current);
    }
    await syncHandlerRef.current();
    return true;
  }, []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const cmd = event.metaKey || event.ctrlKey;
      if (!cmd) return;

      if (event.key.toLowerCase() === "s") {
        event.preventDefault();
        event.stopPropagation();
        if (syncHandlerRef.current) {
          void syncHandlerRef.current().catch((error) => {
            console.error("Save failed:", error);
          });
        } else if (saveHandlerRef.current) {
          saveHandlerRef.current();
        }
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
  }, []);

  const registerCloudPushHandler = useCallback((handler: (() => Promise<void>) | null) => {
    cloudPushHandlerRef.current = handler;
  }, []);

  const triggerCloudPush = useCallback(async () => {
    if (!cloudPushHandlerRef.current) {
      throw new Error("Синхронизация недоступна: таблица ещё не готова.");
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

  const value = useMemo(
    () => ({
      search,
      setSearch,
      availability,
      setAvailability,
      selectedBrandLocalId,
      setSelectedBrandLocalId,
      selectedEngineLocalId,
      setSelectedEngineLocalId,
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
    }),
    [
      search,
      availability,
      selectedBrandLocalId,
      selectedEngineLocalId,
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
