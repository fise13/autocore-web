import { Suspense } from "react";

import { RowMediaViewer } from "@/components/grid/row-media-viewer";

export default function MediaViewerPage() {
  return (
    <Suspense fallback={null}>
      <RowMediaViewer />
    </Suspense>
  );
}
