"use client";

import { ReactNode } from "react";

type DocumentPreviewFrameProps = {
  children: ReactNode;
  toolbar?: ReactNode;
};

export function DocumentPreviewFrame({ children, toolbar }: DocumentPreviewFrameProps) {
  return (
    <div className="documents-root documents-preview-dark min-h-screen bg-[#0a0a0a] text-neutral-100">
      {toolbar ? (
        <div className="doc-preview-toolbar sticky top-0 z-20 border-b border-white/10 bg-[#111111]/95 px-4 py-3 backdrop-blur">
          {toolbar}
        </div>
      ) : null}
      <div className="flex justify-center px-4 py-8 print:bg-white print:p-0">{children}</div>
    </div>
  );
}
