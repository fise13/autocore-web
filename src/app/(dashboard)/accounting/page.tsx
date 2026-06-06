import { Suspense } from "react";

import { AccountingWorkspace } from "@/components/accounting/accounting-workspace";

export default function AccountingPage() {
  return (
    <Suspense fallback={null}>
      <AccountingWorkspace />
    </Suspense>
  );
}
