import {
  collection,
  doc,
  getDocs,
  limit,
  query,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";

import type { CompanyDomainEntry, CompanyDomainMap } from "@/lib/domain/company-dictionary";
import type { DomainCategory } from "@/lib/domain/types";
import { getFirestoreDb } from "@/infrastructure/firebase/client";
import { normalizeCompanyId } from "@/lib/company-id";

const COLLECTION = "domainDictionary";

function mapEntry(id: string, data: Record<string, unknown>): CompanyDomainEntry | null {
  const domainCategory = String(data.domainCategory ?? "") as DomainCategory;
  const name = String(data.name ?? "").trim();
  if (!domainCategory || !name) return null;
  return {
    id,
    name,
    category: typeof data.category === "string" ? data.category : "Мои значения",
    domainCategory,
    type: domainCategory,
    custom: true,
    brand: typeof data.brand === "string" ? data.brand : undefined,
    aliases: Array.isArray(data.aliases) ? data.aliases.map(String) : undefined,
    createdAt: typeof data.createdAt === "number" ? data.createdAt : undefined,
    createdByUserId: typeof data.createdByUserId === "string" ? data.createdByUserId : undefined,
  };
}

export function createDomainCompanyDictionaryRepository() {
  return {
    async listAll(companyId: string): Promise<CompanyDomainMap> {
      const normalized = normalizeCompanyId(companyId);
      if (!normalized) return {};
      const snap = await getDocs(
        query(collection(getFirestoreDb(), "companies", normalized, COLLECTION), limit(1000)),
      );
      const map: CompanyDomainMap = {};
      for (const item of snap.docs) {
        const entry = mapEntry(item.id, item.data() as Record<string, unknown>);
        if (!entry) continue;
        const list = map[entry.domainCategory] ?? [];
        list.push(entry);
        map[entry.domainCategory] = list;
      }
      return map;
    },

    async upsert(companyId: string, entry: CompanyDomainEntry, actorUserId?: string): Promise<void> {
      const normalized = normalizeCompanyId(companyId);
      if (!normalized) return;
      const ref = doc(getFirestoreDb(), "companies", normalized, COLLECTION, entry.id);
      await setDoc(
        ref,
        {
          companyId: normalized,
          name: entry.name,
          category: entry.category,
          domainCategory: entry.domainCategory,
          type: entry.domainCategory,
          custom: true,
          brand: entry.brand ?? null,
          aliases: entry.aliases ?? [],
          createdAt: entry.createdAt ?? Date.now(),
          createdByUserId: actorUserId ?? entry.createdByUserId ?? null,
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );
    },
  };
}
