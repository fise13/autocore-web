import { CSSProperties, ReactNode } from "react";

import { cn } from "@/lib/utils";

import { docPage, docPageA4, docPageTag } from "./document-tokens";

type DocumentPageProps = {
  children: ReactNode;
  size?: "A4" | "service-tag";
  className?: string;
  style?: CSSProperties;
};

export function DocumentPage({ children, size = "A4", className, style }: DocumentPageProps) {
  return (
    <div
      className={cn(
        docPage,
        size === "A4" ? docPageA4 : docPageTag,
        size === "service-tag" && "service-tag-page",
        className,
      )}
      style={style}
    >
      {children}
    </div>
  );
}
