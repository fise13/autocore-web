import { NextResponse } from "next/server";

import { getAdminFirestore } from "@/infrastructure/firebase/admin";
import type { SystemStatusComponentId, SystemStatusLevel } from "@/lib/product/product-status";

export const runtime = "nodejs";

type ComponentStatus = {
  id: SystemStatusComponentId;
  status: SystemStatusLevel;
  message?: string;
};

type StatusResponse = {
  overall: SystemStatusLevel;
  checkedAt: string;
  components: ComponentStatus[];
};

const CHECK_TIMEOUT_MS = 4000;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("timeout")), ms);
    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((error) => {
        clearTimeout(timer);
        reject(error);
      });
  });
}

function worstStatus(levels: SystemStatusLevel[]): SystemStatusLevel {
  if (levels.includes("outage")) return "outage";
  if (levels.includes("degraded")) return "degraded";
  return "operational";
}

async function checkFirestore(): Promise<ComponentStatus> {
  try {
    const db = getAdminFirestore();
    await withTimeout(db.collection("companies").limit(1).get(), CHECK_TIMEOUT_MS);
    return { id: "firestore", status: "operational" };
  } catch (error) {
    const message = error instanceof Error ? error.message : "check failed";
    return {
      id: "firestore",
      status: message.includes("timeout") ? "degraded" : "degraded",
      message: "Проверка базы данных не завершилась",
    };
  }
}

async function checkAuth(): Promise<ComponentStatus> {
  try {
    const { getAdminAuth } = await import("@/infrastructure/firebase/admin");
    const auth = getAdminAuth();
    await withTimeout(auth.listUsers(1), CHECK_TIMEOUT_MS);
    return { id: "auth", status: "operational" };
  } catch {
    return {
      id: "auth",
      status: "degraded",
      message: "Проверка авторизации недоступна в этой среде",
    };
  }
}

async function checkStorage(): Promise<ComponentStatus> {
  try {
    const { getAdminStorage, getStorageBucketName } = await import("@/infrastructure/firebase/admin");
    const bucket = getAdminStorage().bucket(getStorageBucketName());
    await withTimeout(bucket.exists(), CHECK_TIMEOUT_MS);
    return { id: "storage", status: "operational" };
  } catch {
    return {
      id: "storage",
      status: "degraded",
      message: "Проверка хранилища недоступна в этой среде",
    };
  }
}

export async function GET() {
  const checkedAt = new Date().toISOString();

  const [firestore, auth, storage] = await Promise.all([
    checkFirestore(),
    checkAuth(),
    checkStorage(),
  ]);

  const app: ComponentStatus = { id: "app", status: "operational" };
  const components = [app, firestore, auth, storage];
  const overall = worstStatus(components.map((component) => component.status));

  const body: StatusResponse = {
    overall,
    checkedAt,
    components,
  };

  return NextResponse.json(body, {
    headers: {
      "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60",
    },
  });
}
