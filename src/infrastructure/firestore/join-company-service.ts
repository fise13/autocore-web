import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";

import { UserRole, USER_ROLES } from "@/domain/user";
import { getFirestoreDb } from "@/infrastructure/firebase/client";
import { recordUserCompanyMembership } from "@/infrastructure/firestore/user-company-membership-service";
import { canSwitchCompanyViaInvite } from "@/lib/company-id";
import { mapAuthError } from "@/lib/user-copy";

function normalizeRole(role: string): UserRole {
  const normalized = role === "viewer" ? "employee" : role;
  return USER_ROLES.includes(normalized as UserRole) ? (normalized as UserRole) : "employee";
}

function normalizeInviteCode(input: string): string {
  const map: Record<string, string> = {
    А: "A", В: "B", С: "C", Е: "E", Н: "H", К: "K", М: "M", О: "O",
    Р: "P", Т: "T", У: "Y", Х: "X",
    а: "A", в: "B", с: "C", е: "E", н: "H", к: "K", м: "M", о: "O",
    р: "P", т: "T", у: "Y", х: "X",
  };
  return input
    .trim()
    .toUpperCase()
    .split("")
    .map((char) => map[char] ?? char)
    .join("");
}

function rethrowStep(step: string, error: unknown): never {
  const code =
    typeof error === "object" && error !== null && "code" in error
      ? String((error as { code?: string }).code)
      : "";
  if (code === "permission-denied") {
    throw new Error(step);
  }
  const friendly = mapAuthError(error, { surface: "onboarding" });
  if (friendly && friendly !== step && !friendly.includes("Не удалось выполнить действие")) {
    throw new Error(friendly);
  }
  throw new Error(step);
}

async function ensureUserProfile(
  userRef: ReturnType<typeof doc>,
  userData: Record<string, unknown>,
): Promise<void> {
  const snap = await getDoc(userRef);
  if (snap.exists()) {
    return;
  }
  await setDoc(userRef, {
    name: String(userData.name ?? ""),
    email: String(userData.email ?? ""),
    role: "employee",
    companyId: "",
    permissions: [],
    isActive: true,
    onboardingCompleted: true,
    createdAt: serverTimestamp(),
  });
}

async function linkUserProfile(
  userRef: ReturnType<typeof doc>,
  companyId: string,
  role: UserRole,
): Promise<void> {
  const payload = {
    companyId,
    role,
    permissions: [] as string[],
    isActive: true,
  };
  const snap = await getDoc(userRef);
  if (snap.exists()) {
    await updateDoc(userRef, payload);
    return;
  }
  await setDoc(userRef, payload, { merge: true });
}

type InviteJoinInput = {
  inviteDocId: string;
  invite: Record<string, unknown>;
  expectedEmail?: string;
};

async function joinCompanyWithInviteRecord(uid: string, input: InviteJoinInput): Promise<void> {
  const db = getFirestoreDb();
  const invite = input.invite;
  const companyId = String(invite.companyId ?? "");
  const role = normalizeRole(String(invite.role ?? "employee"));
  if (!companyId) {
    throw new Error("Некорректные данные приглашения");
  }

  const userRef = doc(db, "users", uid);
  const userSnap = await getDoc(userRef);
  const userData = (userSnap.data() ?? {}) as Record<string, unknown>;
  await ensureUserProfile(userRef, userData);
  const userEmail = String(userData.email ?? "").trim().toLowerCase();
  const existingCompanyId = String(userData.companyId ?? "").trim();

  const inviteEmail = typeof invite.email === "string" ? invite.email.trim().toLowerCase() : "";
  if (inviteEmail && userEmail && inviteEmail !== userEmail) {
    throw new Error("Это приглашение отправлено на другой email. Войдите под указанным адресом.");
  }
  if (input.expectedEmail && userEmail && input.expectedEmail.trim().toLowerCase() !== userEmail) {
    throw new Error("Войдите под email, на который пришло приглашение.");
  }

  if (existingCompanyId === companyId) {
    return;
  }
  if (!canSwitchCompanyViaInvite(existingCompanyId)) {
    throw new Error("Вы уже привязаны к другой компании. Выйдите и войдите другим аккаунтом.");
  }

  const employeeRef = doc(db, "companies", companyId, "employees", uid);
  const employeeSnap = await getDoc(employeeRef);
  const inviteAlreadyUsed = invite.used === true;

  if (inviteAlreadyUsed && !employeeSnap.exists()) {
    throw new Error("Приглашение уже использовано");
  }
  if (!inviteAlreadyUsed) {
    const expiresAtRaw = invite.expiresAt as { toDate?: () => Date } | undefined;
    const expiresAt = expiresAtRaw?.toDate?.();
    if (!expiresAt || expiresAt.getTime() <= Date.now()) {
      throw new Error("Срок действия приглашения истёк");
    }
  }

  if (!employeeSnap.exists()) {
    try {
      await setDoc(
        employeeRef,
        {
          uid,
          companyId,
          email: String(userData.email ?? ""),
          fullName: String(userData.name ?? ""),
          role,
          permissions: [],
          invitedBy: String(invite.createdBy ?? ""),
          inviteId: input.inviteDocId,
          isActive: true,
          createdAt: serverTimestamp(),
          lastActiveAt: serverTimestamp(),
        },
        { merge: false },
      );
    } catch (error) {
      rethrowStep("Не удалось создать профиль сотрудника", error);
    }
  }

  if (!inviteAlreadyUsed) {
    try {
      await updateDoc(doc(db, "invites", input.inviteDocId), { used: true, status: "used" });
    } catch (error) {
      rethrowStep("Не удалось подтвердить приглашение", error);
    }
  }

  try {
    await linkUserProfile(userRef, companyId, role);
    await recordUserCompanyMembership(uid, companyId, role);
  } catch (error) {
    rethrowStep("Не удалось привязать аккаунт к компании", error);
  }

  const verifySnap = await getDoc(userRef);
  const linkedCompanyId = String(verifySnap.data()?.companyId ?? "").trim();
  if (linkedCompanyId !== companyId) {
    throw new Error("Не удалось привязать аккаунт к компании (профиль не обновился)");
  }
}

export async function joinCompanyWithInviteCode(uid: string, rawCode: string): Promise<void> {
  const db = getFirestoreDb();
  const inviteCode = normalizeInviteCode(rawCode);
  if (!inviteCode) {
    throw new Error("Укажите код приглашения");
  }

  const snapshot = await getDocs(
    query(collection(db, "invites"), where("code", "==", inviteCode), limit(1)),
  );
  if (snapshot.empty) {
    throw new Error("Код приглашения не найден. Проверьте правильность кода и попробуйте снова.");
  }

  const inviteDoc = snapshot.docs[0]!;
  await joinCompanyWithInviteRecord(uid, {
    inviteDocId: inviteDoc.id,
    invite: inviteDoc.data(),
  });
}

export async function joinCompanyWithInviteToken(uid: string, rawToken: string): Promise<void> {
  const db = getFirestoreDb();
  const token = rawToken.trim();
  if (!token) {
    throw new Error("Некорректная ссылка приглашения");
  }

  const snapshot = await getDocs(
    query(collection(db, "invites"), where("token", "==", token), limit(1)),
  );
  if (snapshot.empty) {
    throw new Error("Ссылка приглашения не найдена или устарела.");
  }

  const inviteDoc = snapshot.docs[0]!;
  await joinCompanyWithInviteRecord(uid, {
    inviteDocId: inviteDoc.id,
    invite: inviteDoc.data(),
  });
}
