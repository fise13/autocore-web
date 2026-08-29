import { redirect } from "next/navigation";

export default function EngineIntakePage() {
  redirect("/motors?collection=engines");
}
