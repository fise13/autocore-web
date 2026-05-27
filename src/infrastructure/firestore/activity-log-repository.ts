import {
  addDoc,
  collection,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
} from "firebase/firestore";

import { ActivityAppendPayload } from "@/domain/activity-log";
import { ActivityLogEntry } from "@/domain/rbac";
import { UserRole } from "@/domain/user";
import { resolveActivityLabel } from "@/lib/mission-control/activity-labels";
import { toDateFromFirestore } from "@/lib/firestore-timestamp";
import { getFirestoreDb } from "@/infrastructure/firebase/client";

function mapActivityDoc(item: { id: string; data: () => Record<string, unknown> }, companyId: string): ActivityLogEntry {
  const data = item.data();
  const timestamp = toDateFromFirestore(data.timestamp);
  const action = String(data.action ?? "");
  const resolved = resolveActivityLabel(action);

  return {
    id: item.id,
    companyId: String(data.companyId ?? companyId),
    actor: String(data.actor ?? ""),
    actorName: data.actorName ? String(data.actorName) : undefined,
    actorRole: data.actorRole ? (String(data.actorRole) as UserRole) : undefined,
    action,
    module: data.module ? (String(data.module) as ActivityLogEntry["module"]) : resolved.module,
    target: String(data.target ?? ""),
    targetId: data.targetId ? String(data.targetId) : undefined,
    targetName: data.targetName ? String(data.targetName) : undefined,
    severity: data.severity
      ? (String(data.severity) as ActivityLogEntry["severity"])
      : resolved.severity,
    metadata: (data.metadata as Record<string, string | number | boolean | null>) ?? {},
    timestamp,
  };
}

export function createActivityLogRepository() {
  const db = getFirestoreDb();

  return {
    async append(companyId: string, payload: ActivityAppendPayload): Promise<void> {
      if (!companyId) return;

      const resolved = resolveActivityLabel(payload.action);
      const docPayload: Record<string, unknown> = {
        companyId,
        actor: payload.actor,
        action: payload.action,
        target: payload.target,
        module: payload.module ?? resolved.module,
        severity: payload.severity ?? resolved.severity,
        metadata: payload.metadata ?? {},
        timestamp: serverTimestamp(),
      };

      if (payload.actorName) docPayload.actorName = payload.actorName;
      if (payload.actorRole) docPayload.actorRole = payload.actorRole;
      if (payload.targetId) docPayload.targetId = payload.targetId;
      if (payload.targetName) docPayload.targetName = payload.targetName;

      await addDoc(collection(db, "companies", companyId, "activityLogs"), docPayload);
    },

    subscribe(
      companyId: string,
      onData: (entries: ActivityLogEntry[]) => void,
      onError?: (error: Error) => void,
      maxEntries = 100,
    ) {
      if (!companyId) {
        onData([]);
        return () => undefined;
      }

      const logsQuery = query(
        collection(db, "companies", companyId, "activityLogs"),
        orderBy("timestamp", "desc"),
        limit(maxEntries),
      );

      return onSnapshot(
        logsQuery,
        (snapshot) => {
          onData(snapshot.docs.map((item) => mapActivityDoc(item, companyId)));
        },
        (error) => onError?.(error),
      );
    },
  };
}
