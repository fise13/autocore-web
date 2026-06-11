import { redirect } from "next/navigation";

export default function RolesPage() {
  redirect("/settings/team?tab=roles");
}
