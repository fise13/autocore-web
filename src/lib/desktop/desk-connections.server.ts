import "server-only";

import type { DeskConnectionRecord, DeskConnectionsSnapshot } from "@autocore/types";
import { getAdminFirestore } from "@/infrastructure/firebase/admin";

const ACTIVE_FIELD = "deskActiveConnectionId";

function connectionsCollection(uid: string) {
  return getAdminFirestore().collection("users").doc(uid).collection("deskConnections");
}

function mapDoc(id: string, data: Record<string, unknown>): DeskConnectionRecord | null {
  const pluginId = String(data.pluginId ?? "").trim();
  const platform = String(data.platform ?? "").trim();
  const label = String(data.label ?? "").trim();
  if (!pluginId || !platform || !label) return null;

  return {
    id,
    pluginId,
    platform: platform as DeskConnectionRecord["platform"],
    label,
    storeName: typeof data.storeName === "string" ? data.storeName : undefined,
    accentColor: typeof data.accentColor === "string" ? data.accentColor : undefined,
    createdAt: String(data.createdAt ?? new Date().toISOString()),
    updatedAt: String(data.updatedAt ?? new Date().toISOString()),
  };
}

export async function listDeskConnections(uid: string): Promise<DeskConnectionsSnapshot> {
  const db = getAdminFirestore();
  const [snapshot, userDoc] = await Promise.all([
    connectionsCollection(uid).orderBy("updatedAt", "desc").get(),
    db.collection("users").doc(uid).get(),
  ]);

  const connections = snapshot.docs
    .map((doc) => mapDoc(doc.id, doc.data() as Record<string, unknown>))
    .filter((item): item is DeskConnectionRecord => item !== null);

  const activeConnectionId =
    typeof userDoc.data()?.[ACTIVE_FIELD] === "string"
      ? String(userDoc.data()?.[ACTIVE_FIELD])
      : null;

  return { connections, activeConnectionId };
}

export async function upsertDeskConnection(
  uid: string,
  connection: DeskConnectionRecord,
): Promise<DeskConnectionRecord> {
  const now = new Date().toISOString();
  const payload = {
    pluginId: connection.pluginId,
    platform: connection.platform,
    label: connection.label,
    storeName: connection.storeName ?? null,
    accentColor: connection.accentColor ?? null,
    createdAt: connection.createdAt || now,
    updatedAt: now,
  };

  await connectionsCollection(uid).doc(connection.id).set(payload, { merge: true });
  return mapDoc(connection.id, payload) as DeskConnectionRecord;
}

export async function deleteDeskConnection(uid: string, connectionId: string): Promise<void> {
  const db = getAdminFirestore();
  await connectionsCollection(uid).doc(connectionId).delete();

  const userRef = db.collection("users").doc(uid);
  const userDoc = await userRef.get();
  if (userDoc.data()?.[ACTIVE_FIELD] === connectionId) {
    await userRef.set({ [ACTIVE_FIELD]: null }, { merge: true });
  }
}

export async function setDeskActiveConnection(
  uid: string,
  connectionId: string | null,
): Promise<void> {
  await getAdminFirestore()
    .collection("users")
    .doc(uid)
    .set({ [ACTIVE_FIELD]: connectionId }, { merge: true });
}

export async function replaceDeskConnections(
  uid: string,
  connections: DeskConnectionRecord[],
  activeConnectionId: string | null,
): Promise<DeskConnectionsSnapshot> {
  const db = getAdminFirestore();
  const collection = connectionsCollection(uid);
  const existing = await collection.get();
  const batch = db.batch();

  for (const doc of existing.docs) {
    batch.delete(doc.ref);
  }

  for (const connection of connections) {
    const now = new Date().toISOString();
    batch.set(collection.doc(connection.id), {
      pluginId: connection.pluginId,
      platform: connection.platform,
      label: connection.label,
      storeName: connection.storeName ?? null,
      accentColor: connection.accentColor ?? null,
      createdAt: connection.createdAt || now,
      updatedAt: connection.updatedAt || now,
    });
  }

  batch.set(db.collection("users").doc(uid), { [ACTIVE_FIELD]: activeConnectionId }, { merge: true });
  await batch.commit();

  return { connections, activeConnectionId };
}
