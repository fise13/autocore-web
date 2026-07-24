"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useMemo } from "react";
import { motion, useReducedMotion } from "motion/react";
import {
  CarIcon,
  EyeIcon,
  FileStackIcon,
  FileTextIcon,
  HistoryIcon,
  PaletteIcon,
  ReceiptIcon,
  WrenchIcon,
} from "lucide-react";

import { DocumentsHistoryPanel } from "@/components/documents/documents-history-panel";
import { EnterpriseAnimatedPanel } from "@/components/layout/enterprise-animated-panel";
import { EnterpriseWorkspaceNav } from "@/components/layout/enterprise-workspace-nav";
import { EnterpriseWorkspaceShell } from "@/components/layout/enterprise-workspace-shell";
import { useAuth } from "@/components/providers/auth-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DOCUMENT_DEFINITIONS,
  type DocumentDefinition,
  type DocumentSlug,
} from "@/lib/documents/document-types";
import {
  documentTemplatePreviewPath,
  openDocumentPreviewInNewTab,
} from "@/lib/documents/open-document-preview";
import { canManageSettings } from "@/lib/auth/permissions";
import { cn } from "@/lib/utils";
import { userCopy } from "@/lib/user-copy";

type DocumentCategory = "all" | "service" | "sales" | "engine" | "history";

const CATEGORY_NAV: {
  id: DocumentCategory;
  icon: typeof FileStackIcon;
  match?: (doc: DocumentDefinition) => boolean;
}[] = [
  { id: "all", icon: FileStackIcon, match: () => true },
  {
    id: "service",
    icon: WrenchIcon,
    match: (doc) =>
      ["work-order", "service-act", "vehicle-intake-act"].includes(doc.slug),
  },
  {
    id: "sales",
    icon: ReceiptIcon,
    match: (doc) =>
      ["invoice", "sales-receipt", "commercial-proposal"].includes(doc.slug),
  },
  {
    id: "engine",
    icon: CarIcon,
    match: (doc) =>
      ["engine-warranty", "engine-waybill", "service-tag"].includes(doc.slug),
  },
  {
    id: "history",
    icon: HistoryIcon,
  },
];

function resolveCategory(value: string | null): DocumentCategory {
  if (value === "service" || value === "sales" || value === "engine" || value === "history") {
    return value;
  }
  return "all";
}

function categoryLabel(id: DocumentCategory): string {
  return userCopy.documents.categories[id];
}

function DocumentsWorkspaceContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { profile } = useAuth();
  const canManage = canManageSettings(profile);
  const reduceMotion = useReducedMotion();
  const category = resolveCategory(searchParams.get("category"));
  const isHistory = category === "history";

  const filteredDocuments = useMemo(() => {
    if (isHistory) return [];
    const matcher = CATEGORY_NAV.find((item) => item.id === category)?.match ?? (() => true);
    return DOCUMENT_DEFINITIONS.filter(matcher);
  }, [category, isHistory]);

  function setCategory(next: DocumentCategory) {
    const params = new URLSearchParams(searchParams.toString());
    if (next === "all") params.delete("category");
    else params.set("category", next);
    params.delete("doc");
    const query = params.toString();
    router.replace(query ? `/documents?${query}` : "/documents", { scroll: false });
  }

  function openPreview(slug: DocumentSlug) {
    openDocumentPreviewInNewTab(documentTemplatePreviewPath(slug));
  }

  return (
    <EnterpriseWorkspaceShell
      title={userCopy.documents.title}
      description={
        isHistory
          ? userCopy.documents.descriptionHistory
          : userCopy.documents.descriptionTemplates
      }
      meta={
        <div className="flex flex-wrap gap-2">
          {isHistory ? (
            <Badge variant="secondary">{userCopy.documents.historyBadge}</Badge>
          ) : (
            <>
              <Badge variant="secondary">{userCopy.documents.templatesCount(DOCUMENT_DEFINITIONS.length)}</Badge>
              <Badge variant="outline">{userCopy.documents.inSection(filteredDocuments.length)}</Badge>
            </>
          )}
        </div>
      }
      action={
        canManage ? (
          <Button variant="outline" render={<Link href="/settings?section=branding" />} nativeButton={false}>
            <PaletteIcon data-icon="inline-start" />
            {userCopy.settings.branding}
          </Button>
        ) : null
      }
    >
      <div className="flex flex-col gap-5">
        <EnterpriseWorkspaceNav
          layoutId="documents-workspace-nav"
          items={CATEGORY_NAV.map(({ id, icon }) => ({
            id,
            label: categoryLabel(id),
            icon,
          }))}
          activeId={category}
          onSelect={(id) => setCategory(id as DocumentCategory)}
        />

        <EnterpriseAnimatedPanel panelKey={category}>
          {isHistory ? (
            <DocumentsHistoryPanel />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {filteredDocuments.map((document, index) => (
                <motion.div
                  key={document.slug}
                  initial={reduceMotion ? false : { opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: 0.24,
                    delay: reduceMotion ? 0 : Math.min(index, 8) * 0.04,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                >
                  <Card
                    className={cn(
                      "group h-full cursor-pointer gap-0 overflow-hidden shadow-none transition-[border-color,box-shadow] duration-200 ease-out dark:ring-0 motion-reduce:transition-none",
                      "hover:border-primary/30 hover:shadow-md",
                    )}
                    onClick={() => openPreview(document.slug)}
                  >
                    <CardHeader className="border-b bg-muted/15 pb-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex size-11 items-center justify-center rounded-xl border bg-background shadow-sm transition-[border-color,box-shadow] duration-200 group-hover:border-primary/25 group-hover:shadow-md">
                          <FileTextIcon className="size-4 text-muted-foreground transition-colors duration-200 group-hover:text-foreground" />
                        </div>
                        <Badge variant="secondary" className="tabular-nums">
                          {document.pageSize === "A4" ? "A4" : "70×100"}
                        </Badge>
                      </div>
                      <CardTitle className="mt-3 text-base">{document.title}</CardTitle>
                      <CardDescription className="line-clamp-2">{document.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="flex items-center justify-between gap-2 p-4">
                      <span className="text-xs text-muted-foreground">{userCopy.documents.preview.opensInNewTab}</span>
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        onClick={(event) => {
                          event.stopPropagation();
                          openPreview(document.slug);
                        }}
                      >
                        <EyeIcon data-icon="inline-start" />
                        {userCopy.documents.preview.open}
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </EnterpriseAnimatedPanel>
      </div>
    </EnterpriseWorkspaceShell>
  );
}

export function DocumentsWorkspace() {
  return (
    <Suspense fallback={null}>
      <DocumentsWorkspaceContent />
    </Suspense>
  );
}
