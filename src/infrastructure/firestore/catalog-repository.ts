import { FirestoreError, collection, deleteDoc, doc, onSnapshot, query, serverTimestamp, setDoc, updateDoc, where } from "firebase/firestore";

import { normalizeCompanyId } from "@/lib/company-id";
import { notifyFirestoreSnapshotError } from "@/lib/firestore/snapshot-errors";
import { normalizeEngineCode } from "@/lib/motors/import-normalization";
import { getFirestoreDb } from "@/infrastructure/firebase/client";

export type BrandEntity = {
  id: string;
  localId: number;
  name: string;
  companyId: string;
};

export type EngineEntity = {
  id: string;
  localId: number;
  brandLocalId: number;
  code: string;
  companyId: string;
};

function readNumber(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function nextLocalId(items: { localId: number }[]): number {
  const max = items.reduce((acc, item) => Math.max(acc, item.localId), 0);
  return max + 1;
}

export type CatalogRepository = ReturnType<typeof createCatalogRepository>;

export function createCatalogRepository() {
  const db = getFirestoreDb();

  return {
    subscribeBrands(
      companyId: string,
      onData: (brands: BrandEntity[]) => void,
      onError?: (error: FirestoreError) => void,
    ) {
      const brandsQuery = query(
        collection(db, "brands"),
        where("companyId", "==", companyId),
      );

      return onSnapshot(
        brandsQuery,
        (snapshot) => {
          const brands = snapshot.docs
            .map((item) => {
              const data = item.data() as Record<string, unknown>;
              return {
                id: item.id,
                localId: readNumber(data.localId ?? data.id),
                name: String(data.name ?? ""),
                companyId: String(data.companyId ?? companyId),
              };
            })
            .filter((item) => item.name.trim().length > 0)
            .sort((a, b) => a.name.localeCompare(b.name, "ru"));
          onData(brands);
        },
        (error) => notifyFirestoreSnapshotError(error, onError),
      );
    },

    subscribeEngines(
      companyId: string,
      onData: (engines: EngineEntity[]) => void,
      onError?: (error: FirestoreError) => void,
    ) {
      const enginesQuery = query(
        collection(db, "engines"),
        where("companyId", "==", companyId),
      );

      return onSnapshot(
        enginesQuery,
        (snapshot) => {
          const engines = snapshot.docs
            .map((item) => {
              const data = item.data() as Record<string, unknown>;
              return {
                id: item.id,
                localId: readNumber(data.localId ?? data.id),
                brandLocalId: readNumber(data.brandId ?? data.brandLocalId),
                code: String(data.code ?? data.engineCode ?? ""),
                companyId: String(data.companyId ?? companyId),
              };
            })
            .filter((item) => item.code.trim().length > 0)
            .sort((a, b) => a.code.localeCompare(b.code, "ru"));
          onData(engines);
        },
        (error) => notifyFirestoreSnapshotError(error, onError),
      );
    },

    async upsertBrand(companyId: string, name: string, existingBrands: BrandEntity[]): Promise<BrandEntity> {
      const normalizedCompanyId = normalizeCompanyId(companyId);
      const normalizedName = name.trim();
      if (!normalizedName) {
        throw new Error("Пустое имя бренда");
      }

      const existing = existingBrands.find(
        (brand) => brand.name.localeCompare(normalizedName, "ru", { sensitivity: "accent" }) === 0,
      );
      if (existing) return existing;

      const localId = nextLocalId(existingBrands);
      const docId = `${normalizedCompanyId}_brand_${localId}`;
      await setDoc(
        doc(db, "brands", docId),
        {
          companyId: normalizedCompanyId,
          localId,
          name: normalizedName,
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );

      return {
        id: docId,
        localId,
        name: normalizedName,
        companyId: normalizedCompanyId,
      };
    },

    async upsertEngine(
      companyId: string,
      brandLocalId: number,
      code: string,
      existingEngines: EngineEntity[],
    ): Promise<EngineEntity> {
      const normalizedCompanyId = normalizeCompanyId(companyId);
      const normalizedCode = normalizeEngineCode(code);
      if (!normalizedCode) {
        throw new Error("Пустой код двигателя");
      }

      const existing = existingEngines.find(
        (engine) =>
          engine.brandLocalId === brandLocalId &&
          normalizeEngineCode(engine.code) === normalizedCode,
      );
      if (existing) return existing;

      const localId = nextLocalId(existingEngines);
      const docId = `${normalizedCompanyId}_engine_${localId}`;
      await setDoc(
        doc(db, "engines", docId),
        {
          companyId: normalizedCompanyId,
          localId,
          brandId: brandLocalId,
          brandLocalId,
          code: normalizedCode,
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );

      return {
        id: docId,
        localId,
        brandLocalId,
        code: normalizedCode,
        companyId: normalizedCompanyId,
      };
    },

    async updateBrandName(brand: BrandEntity, name: string, existingBrands: BrandEntity[]): Promise<void> {
      const normalizedName = name.trim();
      if (!normalizedName) {
        throw new Error("Пустое имя бренда");
      }

      const duplicate = existingBrands.find(
        (item) =>
          item.localId !== brand.localId &&
          item.name.localeCompare(normalizedName, "ru", { sensitivity: "accent" }) === 0,
      );
      if (duplicate) {
        throw new Error(`Бренд «${normalizedName}» уже существует`);
      }

      await updateDoc(doc(db, "brands", brand.id), {
        name: normalizedName,
        updatedAt: serverTimestamp(),
      });
    },

    async deleteBrand(brand: BrandEntity): Promise<void> {
      await deleteDoc(doc(db, "brands", brand.id));
    },

    async deleteEngine(engine: EngineEntity): Promise<void> {
      await deleteDoc(doc(db, "engines", engine.id));
    },
  };
}
