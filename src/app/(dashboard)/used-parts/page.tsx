import { Suspense } from "react";

import { UsedPartsWorkspace } from "@/components/used-parts/used-parts-workspace";

export default function UsedPartsPage() {
  return (
    <Suspense fallback={null}>
      <UsedPartsWorkspace />
    </Suspense>
  );
}
