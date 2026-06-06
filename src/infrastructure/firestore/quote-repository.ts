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
  where,
} from "firebase/firestore";

import { CreateQuoteInput, Quote, QuoteStatus } from "@/domain/quote";
import { getFirestoreDb } from "@/infrastructure/firebase/client";
import { normalizeCompanyId } from "@/lib/company-id";
import { toDateFromFirestore } from "@/lib/firestore-timestamp";
import { notifyFirestoreSnapshotError } from "@/lib/firestore/snapshot-errors";

const COLLECTION = "quotes";

function quotesRef(companyId: string) {
  return collection(getFirestoreDb(), "companies", normalizeCompanyId(companyId), COLLECTION);
}

function quoteRef(companyId: string, quoteId: string) {
  return doc(getFirestoreDb(), "companies", normalizeCompanyId(companyId), COLLECTION, quoteId);
}

function mapQuote(id: string, data: Record<string, unknown>): Quote {
  return {
    id,
    companyId: String(data.companyId ?? ""),
    clientId: String(data.clientId ?? ""),
    clientName: typeof data.clientName === "string" ? data.clientName : undefined,
    clientPhone: typeof data.clientPhone === "string" ? data.clientPhone : undefined,
    vehicleId: typeof data.vehicleId === "string" ? data.vehicleId : undefined,
    vehicleLabel: typeof data.vehicleLabel === "string" ? data.vehicleLabel : undefined,
    vin: typeof data.vin === "string" ? data.vin : undefined,
    licensePlate: typeof data.licensePlate === "string" ? data.licensePlate : undefined,
    mileage: data.mileage == null ? undefined : Number(data.mileage),
    comment: typeof data.comment === "string" ? data.comment : undefined,
    laborLines: Array.isArray(data.laborLines) ? (data.laborLines as Quote["laborLines"]) : [],
    partLines: Array.isArray(data.partLines) ? (data.partLines as Quote["partLines"]) : [],
    motorLines: Array.isArray(data.motorLines) ? (data.motorLines as Quote["motorLines"]) : [],
    pricing:
      typeof data.pricing === "object" && data.pricing != null
        ? (data.pricing as Quote["pricing"])
        : { laborTotal: 0, partsTotal: 0, motorsTotal: 0, discount: 0, grandTotal: 0 },
    status: (data.status as QuoteStatus) ?? "draft",
    validUntil: toDateFromFirestore(data.validUntil) ?? undefined,
    convertedWorkOrderId: typeof data.convertedWorkOrderId === "string" ? data.convertedWorkOrderId : undefined,
    documentInstanceId: typeof data.documentInstanceId === "string" ? data.documentInstanceId : undefined,
    createdByUserId: String(data.createdByUserId ?? ""),
    createdAt: toDateFromFirestore(data.createdAt) ?? new Date(),
    updatedAt: toDateFromFirestore(data.updatedAt) ?? new Date(),
  };
}

export type QuoteRepository = ReturnType<typeof createQuoteRepository>;

export function createQuoteRepository() {
  return {
    subscribe(companyId: string, onData: (quotes: Quote[]) => void, onError?: (error: Error) => void) {
      if (!companyId) {
        onData([]);
        return () => undefined;
      }
      const q = query(quotesRef(companyId), orderBy("updatedAt", "desc"), limit(100));
      return onSnapshot(
        q,
        (snapshot) => onData(snapshot.docs.map((item) => mapQuote(item.id, item.data() as Record<string, unknown>))),
        (error) => notifyFirestoreSnapshotError(error, onError),
      );
    },

    async getById(companyId: string, quoteId: string): Promise<Quote | null> {
      const snap = await getDoc(quoteRef(companyId, quoteId));
      if (!snap.exists()) return null;
      return mapQuote(snap.id, snap.data() as Record<string, unknown>);
    },

    async create(input: CreateQuoteInput): Promise<Quote> {
      const ref = input.id ? quoteRef(input.companyId, input.id) : doc(quotesRef(input.companyId));
      const payload: Record<string, unknown> = {
        ...input,
        companyId: normalizeCompanyId(input.companyId),
        status: input.status ?? "draft",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      delete payload.id;
      await setDoc(ref, payload);
      const snap = await getDoc(ref);
      return mapQuote(snap.id, snap.data() as Record<string, unknown>);
    },

    async updateStatus(companyId: string, quoteId: string, status: QuoteStatus, patch: Record<string, unknown> = {}) {
      await updateDoc(quoteRef(companyId, quoteId), {
        status,
        ...patch,
        updatedAt: serverTimestamp(),
      });
    },
  };
}
