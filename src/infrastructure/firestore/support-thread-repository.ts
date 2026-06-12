import {
  addDoc,
  collection,
  doc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";

import {
  SupportMessage,
  SupportMessageRole,
  SupportThread,
  SupportThreadStatus,
} from "@/domain/support-thread";
import { getFirestoreDb } from "@/infrastructure/firebase/client";
import { normalizeCompanyId } from "@/lib/company-id";
import { toDateFromFirestore } from "@/lib/firestore-timestamp";
import { notifyFirestoreSnapshotError } from "@/lib/firestore/snapshot-errors";

const COLLECTION = "supportThreads";

function threadsRef(companyId: string) {
  return collection(getFirestoreDb(), "companies", normalizeCompanyId(companyId), COLLECTION);
}

function threadRef(companyId: string, threadId: string) {
  return doc(getFirestoreDb(), "companies", normalizeCompanyId(companyId), COLLECTION, threadId);
}

function messagesRef(companyId: string, threadId: string) {
  return collection(
    getFirestoreDb(),
    "companies",
    normalizeCompanyId(companyId),
    COLLECTION,
    threadId,
    "messages",
  );
}

function mapThread(id: string, data: Record<string, unknown>): SupportThread {
  return {
    id,
    companyId: String(data.companyId ?? ""),
    userId: String(data.userId ?? ""),
    userName: String(data.userName ?? ""),
    userEmail: String(data.userEmail ?? ""),
    status: (data.status as SupportThreadStatus) ?? "open",
    createdAt: toDateFromFirestore(data.createdAt) ?? new Date(),
    updatedAt: toDateFromFirestore(data.updatedAt) ?? new Date(),
    lastMessageAt: toDateFromFirestore(data.lastMessageAt) ?? new Date(),
  };
}

function mapMessage(id: string, data: Record<string, unknown>): SupportMessage {
  return {
    id,
    role: (data.role as SupportMessageRole) ?? "user",
    text: String(data.text ?? ""),
    createdAt: toDateFromFirestore(data.createdAt) ?? new Date(),
    authorId: typeof data.authorId === "string" ? data.authorId : undefined,
  };
}

export type SupportThreadRepository = ReturnType<typeof createSupportThreadRepository>;

export function createSupportThreadRepository() {
  return {
    subscribeThreads(
      companyId: string,
      onData: (threads: SupportThread[]) => void,
      onError?: (error: Error) => void,
    ) {
      if (!companyId) {
        onData([]);
        return () => undefined;
      }

      const q = query(threadsRef(companyId), orderBy("lastMessageAt", "desc"), limit(100));
      return onSnapshot(
        q,
        (snapshot) =>
          onData(snapshot.docs.map((item) => mapThread(item.id, item.data() as Record<string, unknown>))),
        (error) => notifyFirestoreSnapshotError(error, onError),
      );
    },

    subscribeUserThread(
      companyId: string,
      userId: string,
      onData: (thread: SupportThread | null) => void,
      onError?: (error: Error) => void,
    ) {
      if (!companyId || !userId) {
        onData(null);
        return () => undefined;
      }

      const q = query(threadsRef(companyId), where("userId", "==", userId), limit(1));
      return onSnapshot(
        q,
        (snapshot) => {
          const first = snapshot.docs[0];
          onData(first ? mapThread(first.id, first.data() as Record<string, unknown>) : null);
        },
        (error) => notifyFirestoreSnapshotError(error, onError),
      );
    },

    subscribeMessages(
      companyId: string,
      threadId: string,
      onData: (messages: SupportMessage[]) => void,
      onError?: (error: Error) => void,
    ) {
      if (!companyId || !threadId) {
        onData([]);
        return () => undefined;
      }

      const q = query(messagesRef(companyId, threadId), orderBy("createdAt", "asc"), limit(200));
      return onSnapshot(
        q,
        (snapshot) =>
          onData(snapshot.docs.map((item) => mapMessage(item.id, item.data() as Record<string, unknown>))),
        (error) => notifyFirestoreSnapshotError(error, onError),
      );
    },

    async findOrCreateThread(input: {
      companyId: string;
      userId: string;
      userName: string;
      userEmail: string;
    }): Promise<SupportThread> {
      const existing = await getDocs(
        query(threadsRef(input.companyId), where("userId", "==", input.userId), limit(1)),
      );
      const found = existing.docs[0];
      if (found) {
        return mapThread(found.id, found.data() as Record<string, unknown>);
      }

      const ref = await addDoc(threadsRef(input.companyId), {
        companyId: normalizeCompanyId(input.companyId),
        userId: input.userId,
        userName: input.userName,
        userEmail: input.userEmail,
        status: "bot",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        lastMessageAt: serverTimestamp(),
      });

      return mapThread(ref.id, {
        companyId: input.companyId,
        userId: input.userId,
        userName: input.userName,
        userEmail: input.userEmail,
        status: "bot",
        createdAt: new Date(),
        updatedAt: new Date(),
        lastMessageAt: new Date(),
      });
    },

    async addMessage(input: {
      companyId: string;
      threadId: string;
      role: SupportMessageRole;
      text: string;
      authorId?: string;
    }) {
      await addDoc(messagesRef(input.companyId, input.threadId), {
        role: input.role,
        text: input.text.trim(),
        authorId: input.authorId ?? null,
        createdAt: serverTimestamp(),
      });
      await updateDoc(threadRef(input.companyId, input.threadId), {
        updatedAt: serverTimestamp(),
        lastMessageAt: serverTimestamp(),
      });
    },

    async updateStatus(companyId: string, threadId: string, status: SupportThreadStatus) {
      await updateDoc(threadRef(companyId, threadId), {
        status,
        updatedAt: serverTimestamp(),
        lastMessageAt: serverTimestamp(),
      });
    },
  };
}
