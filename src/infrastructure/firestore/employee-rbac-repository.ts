import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";

import { Permission, ROLE_PERMISSIONS, UserRole } from "@/domain/user";
import { CompanyEmployee, RoleDefinition } from "@/domain/rbac";
import { toDateFromFirestore } from "@/lib/firestore-timestamp";
import { getFirestoreDb } from "@/infrastructure/firebase/client";
import { createActivityLogRepository } from "@/infrastructure/firestore/activity-log-repository";

function mapEmployee(companyId: string, id: string, data: Record<string, unknown>): CompanyEmployee {
  const photoURL =
    typeof data.photoURL === "string" && data.photoURL.trim() ? data.photoURL.trim() : null;
  return {
    id,
    uid: String(data.uid ?? id),
    companyId: String(data.companyId ?? companyId),
    email: String(data.email ?? ""),
    fullName: String(data.fullName ?? ""),
    photoURL,
    role: String(data.role ?? "employee") as UserRole,
    permissions: Array.isArray(data.permissions) ? (data.permissions as Permission[]) : [],
    invitedBy: String(data.invitedBy ?? ""),
    createdAt: toDateFromFirestore(data.createdAt),
    lastActiveAt: toDateFromFirestore(data.lastActiveAt),
    shiftOn: data.shiftOn !== false,
    isActive: Boolean(data.isActive ?? true),
  };
}

async function enrichEmployeesWithProfilePhotos(
  employees: CompanyEmployee[],
): Promise<CompanyEmployee[]> {
  const db = getFirestoreDb();
  return Promise.all(
    employees.map(async (employee) => {
      if (employee.photoURL) return employee;
      const uid = employee.uid?.trim();
      if (!uid) return employee;
      try {
        const userSnap = await getDoc(doc(db, "users", uid));
        const photoURL = userSnap.data()?.photoURL;
        if (typeof photoURL !== "string" || !photoURL.trim()) return employee;
        const nextPhotoURL = photoURL.trim();
        // Cache on employee doc so team lists stay in sync with account avatar.
        void updateDoc(doc(db, "companies", employee.companyId, "employees", employee.id), {
          photoURL: nextPhotoURL,
        }).catch(() => undefined);
        return { ...employee, photoURL: nextPhotoURL };
      } catch {
        return employee;
      }
    }),
  );
}

type InviteEmployeeInput = {
  uid: string;
  email: string;
  fullName: string;
  role: UserRole;
  invitedBy: string;
  permissions?: Permission[];
};

export function createEmployeeRbacRepository() {
  const db = getFirestoreDb();
  const activity = createActivityLogRepository();

  return {
    subscribeEmployees(
      companyId: string,
      onData: (employees: CompanyEmployee[]) => void,
      onError?: (error: Error) => void,
    ) {
      if (!companyId) {
        onData([]);
        return () => undefined;
      }
      const employeesQuery = query(
        collection(db, "companies", companyId, "employees"),
        orderBy("fullName"),
      );
      return onSnapshot(
        employeesQuery,
        (snapshot) => {
          const employees = snapshot.docs.map((item) =>
            mapEmployee(companyId, item.id, item.data() as Record<string, unknown>),
          );
          onData(employees);
          void enrichEmployeesWithProfilePhotos(employees)
            .then((enriched) => {
              if (enriched.some((employee, index) => employee.photoURL !== employees[index]?.photoURL)) {
                onData(enriched);
              }
            })
            .catch(() => undefined);
        },
        (error) => onError?.(error),
      );
    },

    subscribeRoles(
      companyId: string,
      onData: (roles: RoleDefinition[]) => void,
      onError?: (error: Error) => void,
    ) {
      if (!companyId) {
        onData([]);
        return () => undefined;
      }
      const rolesQuery = query(collection(db, "companies", companyId, "roles"), orderBy("role"));
      return onSnapshot(
        rolesQuery,
        (snapshot) => {
          const roles: RoleDefinition[] = snapshot.docs.map((item) => {
            const data = item.data() as Record<string, unknown>;
            return {
              id: item.id,
              companyId: String(data.companyId ?? companyId),
              role: String(data.role ?? "employee") as UserRole,
              permissions: Array.isArray(data.permissions)
                ? (data.permissions as Permission[])
                : [],
              isSystem: Boolean(data.isSystem ?? false),
              updatedAt: toDateFromFirestore(data.updatedAt),
            };
          });
          onData(roles);
        },
        (error) => onError?.(error),
      );
    },

    async seedDefaultRoles(companyId: string, actorId: string): Promise<void> {
      for (const role of Object.keys(ROLE_PERMISSIONS) as UserRole[]) {
        await setDoc(
          doc(db, "companies", companyId, "roles", role),
          {
            companyId,
            role,
            permissions: ROLE_PERMISSIONS[role],
            isSystem: true,
            updatedAt: serverTimestamp(),
          },
          { merge: true },
        );
      }
      await activity.append(companyId, {
        actor: actorId,
        action: "roles.seeded",
        target: `company:${companyId}`,
        metadata: { roles: Object.keys(ROLE_PERMISSIONS).length },
      });
    },

    async inviteEmployee(companyId: string, input: InviteEmployeeInput): Promise<void> {
      let photoURL: string | null = null;
      try {
        const userSnap = await getDoc(doc(db, "users", input.uid));
        const fromUser = userSnap.data()?.photoURL;
        if (typeof fromUser === "string" && fromUser.trim()) photoURL = fromUser.trim();
      } catch {
        // Best-effort avatar sync.
      }

      await setDoc(
        doc(db, "companies", companyId, "employees", input.uid),
        {
          uid: input.uid,
          companyId,
          email: input.email,
          fullName: input.fullName,
          ...(photoURL ? { photoURL } : {}),
          role: input.role,
          permissions: input.permissions ?? [],
          invitedBy: input.invitedBy,
          isActive: true,
          createdAt: serverTimestamp(),
          lastActiveAt: serverTimestamp(),
        },
        { merge: true },
      );
      await setDoc(
        doc(db, "users", input.uid),
        {
          companyId,
          role: input.role,
          permissions: input.permissions ?? [],
          isActive: true,
          name: input.fullName,
          email: input.email,
        },
        { merge: true },
      );
      await activity.append(companyId, {
        actor: input.invitedBy,
        action: "employee.invited",
        target: `employee:${input.uid}`,
        metadata: { role: input.role },
      });
    },

    async setEmployeeRole(
      companyId: string,
      actorId: string,
      employeeId: string,
      role: UserRole,
    ): Promise<void> {
      await updateDoc(doc(db, "companies", companyId, "employees", employeeId), {
        role,
        updatedAt: serverTimestamp(),
      });
      await updateDoc(doc(db, "users", employeeId), {
        role,
      });
      await activity.append(companyId, {
        actor: actorId,
        action: "employee.role_changed",
        target: `employee:${employeeId}`,
        metadata: { role },
      });
    },

    async setPermissionOverrides(
      companyId: string,
      actorId: string,
      employeeId: string,
      permissions: Permission[],
    ): Promise<void> {
      await updateDoc(doc(db, "companies", companyId, "employees", employeeId), {
        permissions,
        updatedAt: serverTimestamp(),
      });
      await updateDoc(doc(db, "users", employeeId), {
        permissions,
      });
      await activity.append(companyId, {
        actor: actorId,
        action: "employee.permissions_changed",
        target: `employee:${employeeId}`,
        metadata: { permissionsCount: permissions.length },
      });
    },

    async setEmployeeActive(
      companyId: string,
      actorId: string,
      employeeId: string,
      isActive: boolean,
    ): Promise<void> {
      await postOrgMemberAction("/api/org/members/set-active", {
        companyId,
        userId: employeeId,
        isActive,
      });
    },

    async setEmployeeShiftOn(
      companyId: string,
      employeeId: string,
      shiftOn: boolean,
    ): Promise<void> {
      await updateDoc(doc(db, "companies", companyId, "employees", employeeId), {
        shiftOn,
        updatedAt: serverTimestamp(),
      });
    },

    async removeEmployee(companyId: string, actorId: string, employeeId: string): Promise<void> {
      void actorId;
      await postOrgMemberAction("/api/org/members/remove", {
        companyId,
        userId: employeeId,
      });
    },
  };
}

async function postOrgMemberAction(path: string, body: Record<string, unknown>): Promise<void> {
  const { getFirebaseAuth } = await import("@/infrastructure/firebase/client");
  const token = await getFirebaseAuth().currentUser?.getIdToken();
  if (!token) {
    throw new Error("Требуется авторизация");
  }

  const response = await fetch(path, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

  const payload = (await response.json()) as { error?: string };
  if (!response.ok) {
    throw new Error(payload.error ?? "Не удалось выполнить действие");
  }
}

