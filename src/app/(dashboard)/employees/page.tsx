import { redirect } from "next/navigation";

export default function EmployeesPage() {
  redirect("/settings?section=company");
}
