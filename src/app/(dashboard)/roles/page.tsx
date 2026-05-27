import { redirect } from "next/navigation";

export default function RolesPage() {
  redirect("/settings?section=roles");
}
