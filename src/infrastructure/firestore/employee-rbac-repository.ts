import {
  collection,
  deleteDoc,
  doc,
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
          const employees: CompanyEmployee[] = snapshot.docs.map((item) => {
            const data = item.data() as Record<string, unknown>;
            return {
              id: item.id,
              uid: String(data.uid ?? item.id),
              companyId: String(data.companyId ?? companyId),
              email: String(data.email ?? ""),
              fullName: String(data.fullName ?? ""),
              role: (String(data.role ?? "employee") as UserRole),
              permissions: Array.isArray(data.permissions)
                ? (data.permissions as Permission[])
                : [],
              invitedBy: String(data.invitedBy ?? ""),
              createdAt: toDateFromFirestore(data.createdAt),
              lastActiveAt: toDateFromFirestore(data.lastActiveAt),
              isActive: Boolean(data.isActive ?? true),
            };
          });
          onData(employees);
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
      await setDoc(
        doc(db, "companies", companyId, "employees", input.uid),
        {
          uid: input.uid,
          companyId,
          email: input.email,
          fullName: input.fullName,
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
      await updateDoc(doc(db, "companies", companyId, "employees", employeeId), {
        isActive,
        updatedAt: serverTimestamp(),
      });
      await updateDoc(doc(db, "users", employeeId), {
        isActive,
      });
      await activity.append(companyId, {
        actor: actorId,
        action: isActive ? "employee.activated" : "employee.deactivated",
        target: `employee:${employeeId}`,
      });
    },

    async removeEmployee(companyId: string, actorId: string, employeeId: string): Promise<void> {
      await deleteDoc(doc(db, "companies", companyId, "employees", employeeId));
      await updateDoc(doc(db, "users", employeeId), {
        companyId: "",
        role: "employee",
        permissions: [],
        isActive: false,
      });
      await activity.append(companyId, {
        actor: actorId,
        action: "employee.removed",
        target: `employee:${employeeId}`,
      });
    },
  };
}

