import { Suspense } from "react";

import { SupportInboxWorkspace } from "@/components/support/support-inbox-workspace";

export default function SupportInboxThreadPage() {
  return (
    <Suspense fallback={null}>
      <SupportInboxWorkspace />
    </Suspense>
  );
}
