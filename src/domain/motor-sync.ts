export type MotorSyncStatus = "idle" | "syncing" | "error" | "conflict";

export type MotorSyncState = {
  status: MotorSyncStatus;
  localDirty: boolean;
  remotePending: boolean;
  lastSyncedAt: Date | null;
  errorMessage: string | null;
};

export type MotorSyncMeta = {
  lastPulledAt: Date | null;
  lastPushedAt: Date | null;
  companyId: string;
};

export const initialMotorSyncState: MotorSyncState = {
  status: "idle",
  localDirty: false,
  remotePending: false,
  lastSyncedAt: null,
  errorMessage: null,
};
