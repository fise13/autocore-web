"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  CarIcon,
  EyeIcon,
  FileStackIcon,
  FileTextIcon,
  PaletteIcon,
  ReceiptIcon,
  WrenchIcon,
} from "lucide-react";

import { DocumentPreviewDialog } from "@/components/documents/document-preview-dialog";
import { RenderDocument } from "@/components/documents/registry/render-document";
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
import { demoDocumentContext } from "@/lib/marketing/demo-document-context";
import { canManageSettings } from "@/lib/auth/permissions";
import { cn } from "@/lib/utils";

type DocumentCategory = "all" | "service" | "sales" | "engine";

const CATEGORY_NAV: {
  id: DocumentCategory;
  label: string;
  icon: typeof FileStackIcon;
  match: (doc: DocumentDefinition) => boolean;
}[] = [
  { id: "all", label: "Все шаблоны", icon: FileStackIcon, match: () => true },
  {
    id: "service",
    label: "Сервис",
    icon: WrenchIcon,
    match: (doc) =>
      ["work-order", "service-act", "vehicle-intake-act"].includes(doc.slug),
  },
  {
    id: "sales",
    label: "Продажи",
    icon: ReceiptIcon,
    match: (doc) =>
      ["invoice", "sales-receipt", "commercial-proposal"].includes(doc.slug),
  },
  {
    id: "engine",
    label: "Двигатель",
    icon: CarIcon,
    match: (doc) =>
      ["engine-warranty", "engine-waybill", "service-tag"].includes(doc.slug),
  },
];

function resolveCategory(value: string | null): DocumentCategory {
  if (value === "service" || value === "sales" || value === "engine") return value;
  return "all";
}

function DocumentsWorkspaceContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { profile } = useAuth();
  const canManage = canManageSettings(profile);
  const reduceMotion = useReducedMotion();
  const selectedSlug = searchParams.get("doc");
  const category = resolveCategory(searchParams.get("category"));
  const [previewSlug, setPreviewSlug] = useState<DocumentSlug | null>(
    selectedSlug && DOCUMENT_DEFINITIONS.some((doc) => doc.slug === selectedSlug)
      ? (selectedSlug as DocumentSlug)
      : null,
  );

  const filteredDocuments = useMemo(() => {
    const matcher = CATEGORY_NAV.find((item) => item.id === category)?.match ?? (() => true);
    return DOCUMENT_DEFINITIONS.filter(matcher);
  }, [category]);

  function setCategory(next: DocumentCategory) {
    const params = new URLSearchParams(searchParams.toString());
    if (next === "all") params.delete("category");
    else params.set("category", next);
    params.delete("doc");
    setPreviewSlug(null);
    const query = params.toString();
    router.replace(query ? `/documents?${query}` : "/documents", { scroll: false });
  }

  function openPreview(slug: DocumentSlug) {
    setPreviewSlug(slug);
    const params = new URLSearchParams(searchParams.toString());
    params.set("doc", slug);
    router.replace(`/documents?${params.toString()}`, { scroll: false });
  }

  function closePreview() {
    setPreviewSlug(null);
    const params = new URLSearchParams(searchParams.toString());
    params.delete("doc");
    const query = params.toString();
    router.replace(query ? `/documents?${query}` : "/documents", { scroll: false });
  }

  const previewDefinition = previewSlug
    ? DOCUMENT_DEFINITIONS.find((document) => document.slug === previewSlug) ?? null
    : null;

  return (
    <EnterpriseWorkspaceShell
      title="Документы"
      description="PDF-шаблоны для заказ-нарядов, актов, гарантий и продаж — с фирменным брендингом компании."
      meta={
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary">{DOCUMENT_DEFINITIONS.length} шаблонов</Badge>
          <Badge variant="outline">{filteredDocuments.length} в разделе</Badge>
        </div>
      }
      action={
        canManage ? (
          <Button variant="outline" render={<Link href="/settings?section=branding" />} nativeButton={false}>
            <PaletteIcon data-icon="inline-start" />
            Брендинг PDF
          </Button>
        ) : null
      }
    >
      <div className="flex flex-col gap-5">
        <EnterpriseWorkspaceNav
          layoutId="documents-workspace-nav"
          items={CATEGORY_NAV.map(({ id, label, icon }) => ({ id, label, icon }))}
          activeId={category}
          onSelect={(id) => setCategory(id as DocumentCategory)}
        />

        <EnterpriseAnimatedPanel panelKey={category}>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {filteredDocuments.map((document, index) => {
              const active = selectedSlug === document.slug;
              return (
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
                      active && "border-primary/40 ring-1 ring-primary/20",
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
                      <span className="text-xs text-muted-foreground">Нажмите для превью</span>
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
                        Открыть
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </EnterpriseAnimatedPanel>
      </div>

      <DocumentPreviewDialog
        open={previewSlug != null}
        onOpenChange={(open) => !open && closePreview()}
        title={previewDefinition?.title ?? "Превью документа"}
        description={previewDefinition?.description}
        pageLabel={previewDefinition?.pageSize === "A4" ? "A4" : "70×100"}
      >
        {previewSlug ? <RenderDocument slug={previewSlug} context={demoDocumentContext} /> : null}
      </DocumentPreviewDialog>
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
