import { UserEntity } from "@/domain/user";

export function canManageBilling(user: UserEntity | null | undefined): boolean {
  if (!user) return false;
  return user.role === "owner" || user.role === "admin";
}
