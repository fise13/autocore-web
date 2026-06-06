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

  const inviteDoc = snapshot.docs[0];
  const invite = inviteDoc.data();
  const companyId = String(invite.companyId ?? "");
  const role = normalizeRole(String(invite.role ?? "employee"));
  if (!companyId) {
    throw new Error("Некорректные данные приглашения");
  }

  const userRef = doc(db, "users", uid);
  const userSnap = await getDoc(userRef);
  const userData = (userSnap.data() ?? {}) as Record<string, unknown>;
  await ensureUserProfile(userRef, userData);
  const existingCompanyId = String(userData.companyId ?? "").trim();

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
    throw new Error("Код приглашения уже использован");
  }
  if (!inviteAlreadyUsed) {
    const expiresAt = invite.expiresAt?.toDate?.() as Date | undefined;
    if (!expiresAt || expiresAt.getTime() <= Date.now()) {
      throw new Error("Срок действия кода истёк");
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
          inviteId: inviteDoc.id,
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
      await updateDoc(inviteDoc.ref, { used: true });
    } catch (error) {
      rethrowStep("Не удалось подтвердить код приглашения", error);
    }
  }

  try {
    await linkUserProfile(userRef, companyId, role);
  } catch (error) {
    rethrowStep("Не удалось привязать аккаунт к компании", error);
  }

  const verifySnap = await getDoc(userRef);
  const linkedCompanyId = String(verifySnap.data()?.companyId ?? "").trim();
  if (linkedCompanyId !== companyId) {
    throw new Error("Не удалось привязать аккаунт к компании (профиль не обновился)");
  }
}
