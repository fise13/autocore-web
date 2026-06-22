"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

import { useWorkspace } from "@/components/layout/workspace-context";
import { AppLoadingScreen } from "@/components/ui/app-loading-screen";
import { scopedCategoryDocumentId } from "@/lib/specific/specific-sync-ids";
import { useAuth } from "@/components/providers/auth-provider";
import { normalizeCompanyId } from "@/lib/company-id";

export default function SpecificCategoryRedirectPage() {
  const params = useParams<{ categoryId: string }>();
  const router = useRouter();
  const { profile } = useAuth();
  const workspace = useWorkspace();
  const companyId = normalizeCompanyId(profile?.companyId);

  useEffect(() => {
    const rawId = params.categoryId;
    const scopedLocalId = Number(rawId.split("_").pop());
    const canonicalId =
      Number.isFinite(scopedLocalId) && companyId
        ? scopedCategoryDocumentId(companyId, scopedLocalId)
        : rawId;

    workspace.setSelectedSpecificCategoryId(canonicalId);
    workspace.setSelectedBrandLocalId(null);
    workspace.setSelectedEngineLocalId(null);
    router.replace("/motors");
  }, [companyId, params.categoryId, router, workspace]);

  return <AppLoadingScreen message="Загрузка…" />;
}
