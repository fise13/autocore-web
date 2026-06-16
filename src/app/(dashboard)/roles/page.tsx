import { redirect } from "next/navigation";

export default function RolesPage() {
  redirect("/team?tab=roles");
}
