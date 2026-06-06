import {
  collection,
  doc,
  getDoc,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";

import { ClientEntity, CreateClientInput, UpdateClientInput } from "@/domain/client";
import { createClientSchema } from "@/domain/schemas";
import { getFirestoreDb } from "@/infrastructure/firebase/client";
import { normalizeCompanyId } from "@/lib/company-id";
import { toDateFromFirestore } from "@/lib/firestore-timestamp";
import { notifyFirestoreSnapshotError } from "@/lib/firestore/snapshot-errors";

const COLLECTION = "clients";

function clientsRef(companyId: string) {
  return collection(getFirestoreDb(), "companies", normalizeCompanyId(companyId), COLLECTION);
}

function clientRef(companyId: string, clientId: string) {
  return doc(getFirestoreDb(), "companies", normalizeCompanyId(companyId), COLLECTION, clientId);
}

function mapClient(id: string, data: Record<string, unknown>): ClientEntity {
  return {
    id,
    companyId: String(data.companyId ?? ""),
    fullName: String(data.fullName ?? ""),
    phone: String(data.phone ?? ""),
    email: typeof data.email === "string" ? data.email : undefined,
    notes: typeof data.notes === "string" ? data.notes : undefined,
    createdAt: toDateFromFirestore(data.createdAt) ?? undefined,
    updatedAt: toDateFromFirestore(data.updatedAt) ?? undefined,
    createdByUserId: typeof data.createdByUserId === "string" ? data.createdByUserId : undefined,
    updatedByUserId: typeof data.updatedByUserId === "string" ? data.updatedByUserId : undefined,
  };
}

export type ClientRepository = ReturnType<typeof createClientRepository>;

export function createClientRepository() {
  return {
    subscribe(companyId: string, onData: (clients: ClientEntity[]) => void, onError?: (error: Error) => void) {
      if (!companyId) {
        onData([]);
        return () => undefined;
      }

      const q = query(clientsRef(companyId), orderBy("updatedAt", "desc"), limit(300));
      return onSnapshot(
        q,
        (snapshot) => onData(snapshot.docs.map((item) => mapClient(item.id, item.data() as Record<string, unknown>))),
        (error) => notifyFirestoreSnapshotError(error, onError),
      );
    },

    async getById(companyId: string, clientId: string): Promise<ClientEntity | null> {
      const snapshot = await getDoc(clientRef(companyId, clientId));
      if (!snapshot.exists()) return null;
      return mapClient(snapshot.id, snapshot.data() as Record<string, unknown>);
    },

    async create(input: CreateClientInput): Promise<ClientEntity> {
      const validated = createClientSchema.parse({
        ...input,
        companyId: normalizeCompanyId(input.companyId),
      });
      const targetRef = validated.id ? clientRef(validated.companyId, validated.id) : doc(clientsRef(validated.companyId));
      const payload: Record<string, unknown> = { ...validated };
      delete payload.id;
      await setDoc(targetRef, {
        ...payload,
        email: payload.email || null,
        notes: payload.notes || null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      const snapshot = await getDoc(targetRef);
      return mapClient(snapshot.id, snapshot.data() as Record<string, unknown>);
    },

    async update(companyId: string, clientId: string, input: UpdateClientInput) {
      await updateDoc(clientRef(companyId, clientId), {
        ...input,
        updatedAt: serverTimestamp(),
      });
    },

    collectionRef: clientsRef,
    docRef: clientRef,
    mapClient,
  };
}
