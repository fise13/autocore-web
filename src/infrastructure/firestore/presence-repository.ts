import { doc, serverTimestamp, updateDoc } from "firebase/firestore";

import { getFirestoreDb } from "@/infrastructure/firebase/client";

export function createPresenceRepository() {
  const db = getFirestoreDb();

  return {
    async touchLastActive(companyId: string, uid: string): Promise<void> {
      if (!companyId || !uid || companyId === "default") return;
      await updateDoc(doc(db, "companies", companyId, "employees", uid), {
        lastActiveAt: serverTimestamp(),
      });
    },
  };
}
