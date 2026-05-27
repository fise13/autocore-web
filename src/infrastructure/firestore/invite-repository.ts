import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
  where,
} from "firebase/firestore";

import { InviteDocument } from "@/domain/rbac";
import { UserRole } from "@/domain/user";
import { toDateFromFirestore } from "@/lib/firestore-timestamp";
import { getFirestoreDb } from "@/infrastructure/firebase/client";

const INVITE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function generateInviteCode(length = 6): string {
  let code = "";
  for (let index = 0; index < length; index += 1) {
    code += INVITE_ALPHABET[Math.floor(Math.random() * INVITE_ALPHABET.length)];
  }
  return code;
}

function mapInviteDoc(id: string, companyId: string, data: Record<string, unknown>): InviteDocument | null {
  const expiresAt = toDateFromFirestore(data.expiresAt);
  if (!expiresAt) return null;
  return {
    id,
    code: String(data.code ?? ""),
    companyId: String(data.companyId ?? companyId),
    role: String(data.role ?? "employee") as UserRole,
    createdAt: toDateFromFirestore(data.createdAt),
    expiresAt,
    createdBy: String(data.createdBy ?? ""),
    used: Boolean(data.used ?? false),
  };
}

export function createInviteRepository() {
  const db = getFirestoreDb();

  return {
    subscribeInvites(
      companyId: string,
      onData: (invites: InviteDocument[]) => void,
      onError?: (error: Error) => void,
    ) {
      if (!companyId) {
        onData([]);
        return () => undefined;
      }
      const invitesQuery = query(
        collection(db, "invites"),
        where("companyId", "==", companyId),
        orderBy("createdAt", "desc"),
        limit(50),
      );
      return onSnapshot(
        invitesQuery,
        (snapshot) => {
          const invites = snapshot.docs
            .map((item) => mapInviteDoc(item.id, companyId, item.data() as Record<string, unknown>))
            .filter((item): item is InviteDocument => item != null);
          onData(invites);
        },
        (error) => onError?.(error),
      );
    },

    async createInvite(input: {
      companyId: string;
      role: UserRole;
      createdBy: string;
      ttlHours: number;
    }): Promise<InviteDocument> {
      const ttlMs = Math.max(input.ttlHours, 1) * 3600 * 1000;
      const expiresAt = new Date(Date.now() + ttlMs);

      for (let attempt = 0; attempt < 8; attempt += 1) {
        const code = generateInviteCode();
        const existing = await getDocs(
          query(collection(db, "invites"), where("code", "==", code), limit(1)),
        );
        if (!existing.empty) continue;

        const ref = await addDoc(collection(db, "invites"), {
          code,
          companyId: input.companyId,
          role: input.role,
          createdAt: serverTimestamp(),
          expiresAt: Timestamp.fromDate(expiresAt),
          createdBy: input.createdBy,
          used: false,
        });

        return {
          id: ref.id,
          code,
          companyId: input.companyId,
          role: input.role,
          expiresAt,
          createdBy: input.createdBy,
          used: false,
        };
      }

      throw new Error("Не удалось сгенерировать уникальный код приглашения, попробуйте ещё раз");
    },

    async deleteInvite(inviteId: string): Promise<void> {
      await deleteDoc(doc(db, "invites", inviteId));
    },
  };
}
