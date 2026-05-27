"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { useWorkspace } from "@/components/layout/workspace-context";
import { MotorEntity } from "@/domain/motor";
import { ImportExportPreferences } from "@/hooks/use-user-preferences";
import { buildExportFilename, exportMotorsToExcelFile } from "@/lib/motors/excel-export";
import { createActivityLogRepository } from "@/infrastructure/firestore/activity-log-repository";

type MotorExcelIoBridgeProps = {
  uid: string;
  companyId: string;
  canEdit: boolean;
  motors: MotorEntity[];
  importExportPrefs: ImportExportPreferences;
  onImportFile: (file: File) => void | Promise<void>;
};

export function useMotorExcelIoBridge({
  uid,
  companyId,
  canEdit,
  motors,
  importExportPrefs,
  onImportFile,
}: MotorExcelIoBridgeProps) {
  const { registerMotorExcelHandlers, setMotorExcelAvailability } = useWorkspace();
  const [busy, setBusy] = useState<"export" | "import" | null>(null);
  const motorsRef = useRef(motors);
  const onImportFileRef = useRef(onImportFile);

  useEffect(() => {
    motorsRef.current = motors;
    onImportFileRef.current = onImportFile;
  }, [motors, onImportFile]);

  const exportMotors = useCallback(async () => {
    if (!uid) {
      throw new Error("Экспорт недоступен");
    }

    setBusy("export");
    try {
      const scoped = motorsRef.current.filter(
        (motor) => importExportPrefs.includeDeleted || !motor.deletedAt,
      );
      if (scoped.length === 0) {
        throw new Error("Нет данных для экспорта");
      }

      exportMotorsToExcelFile(scoped, buildExportFilename(), {
        dateFormat: importExportPrefs.exportDateFormat,
        includeSold: importExportPrefs.includeSold,
        separateByEngine: true,
      });

      if (companyId) {
        try {
          const activity = createActivityLogRepository();
          await activity.append(companyId, {
            actor: uid,
            action: "inventory.motor_exported",
            target: `export:${Date.now()}`,
            metadata: { count: scoped.length },
          });
        } catch {
          // Activity log must not block export.
        }
      }
    } finally {
      setBusy(null);
    }
  }, [companyId, importExportPrefs.exportDateFormat, importExportPrefs.includeDeleted, importExportPrefs.includeSold, uid]);

  const importMotors = useCallback(
    async (file: File) => {
      if (!uid || !canEdit) {
        throw new Error("Импорт недоступен");
      }
      setBusy("import");
      try {
        await onImportFileRef.current(file);
      } finally {
        setBusy(null);
      }
    },
    [canEdit, uid],
  );

  useEffect(() => {
    registerMotorExcelHandlers({ exportMotors, importMotors });
    return () => registerMotorExcelHandlers(null);
  }, [exportMotors, importMotors, registerMotorExcelHandlers]);

  useEffect(() => {
    if (!uid || !canEdit) {
      setMotorExcelAvailability({ canExport: false, canImport: false, busy: null });
      return;
    }

    const canExport = motorsRef.current.some(
      (motor) => importExportPrefs.includeDeleted || !motor.deletedAt,
    );
    setMotorExcelAvailability({
      canExport,
      canImport: true,
      busy,
    });
  }, [busy, canEdit, importExportPrefs.includeDeleted, motors, setMotorExcelAvailability, uid]);

  useEffect(() => {
    return () => {
      setMotorExcelAvailability({ canExport: false, canImport: false, busy: null });
    };
  }, [setMotorExcelAvailability]);
}
