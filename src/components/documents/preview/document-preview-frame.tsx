"use client";

import { ReactNode } from "react";

type DocumentPreviewFrameProps = {
  children: ReactNode;
  toolbar?: ReactNode;
};

export function DocumentPreviewFrame({ children, toolbar }: DocumentPreviewFrameProps) {
  return (
    <div className="documents-root min-h-screen bg-neutral-100">
      {toolbar ? (
        <div className="doc-preview-toolbar sticky top-0 z-10 border-b border-neutral-200 bg-white/95 px-4 py-3 backdrop-blur">
          {toolbar}
        </div>
      ) : null}
      <div className="flex justify-center px-4 py-8 print:bg-white print:p-0">{children}</div>
    </div>
  );
}
