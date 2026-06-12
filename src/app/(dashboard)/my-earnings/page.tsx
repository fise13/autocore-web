import { Suspense } from "react";

import { MyEarningsWorkspace } from "@/components/my-earnings/my-earnings-workspace";

export default function MyEarningsPage() {
  return (
    <Suspense fallback={null}>
      <MyEarningsWorkspace />
    </Suspense>
  );
}
