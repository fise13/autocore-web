import { redirect } from "next/navigation";

/** Legacy overview URL — workspace lives at /home; / stays public for domain review. */
export default function LegacyOverviewPage() {
  redirect("/home");
}
