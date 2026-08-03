import { CompanyAppConfig } from "@/domain/company-config";
import { createCompanyConfigRepository } from "@/infrastructure/firestore/company-config-repository";
import { createSpecificCategoryRepository } from "@/infrastructure/firestore/specific-category-repository";
import { getFirebaseAuth } from "@/infrastructure/firebase/client";
import { applyCompanyModulesToSidebar } from "@/lib/navigation/apply-company-modules";
import { readSidebarCustomization, writeSidebarCustomization } from "@/lib/navigation/sidebar-customization";

const configRepository = createCompanyConfigRepository();
const specificRepository = createSpecificCategoryRepository();

type SaveCompanyAppConfigInput = {
  companyId: string;
  config: CompanyAppConfig;
  userId: string;
  markOnboardingCompleted?: boolean;
};

async function saveCompanyAppConfigViaApi(
  companyId: string,
  config: CompanyAppConfig,
): Promise<CompanyAppConfig> {
  const user = getFirebaseAuth().currentUser;
  if (!user) {
    throw new Error("No active session");
  }

  const token = await user.getIdToken();
  const response = await fetch("/api/onboarding/complete-setup", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ companyId, config }),
  });

  const payload = (await response.json().catch(() => null)) as {
    config?: CompanyAppConfig;
    error?: string;
  } | null;

  if (!response.ok) {
    const error = new Error(payload?.error ?? "Could not save settings") as Error & {
      status?: number;
    };
    error.status = response.status;
    throw error;
  }

  return payload?.config ?? config;
}

function shouldFallbackToClient(error: unknown): boolean {
  if (!(error instanceof Error)) return true;
  const status = "status" in error ? Number((error as { status?: number }).status) : NaN;
  // Auth / validation failures should not silently retry under client rules.
  if (status === 400 || status === 401 || status === 403 || status === 404) return false;
  return true;
}

async function saveCompanyAppConfigClient(
  companyId: string,
  finalConfig: CompanyAppConfig,
  userId: string,
): Promise<void> {
  await configRepository.saveAppConfig(companyId, finalConfig, userId);

  let existingCategories = await specificRepository.fetchCategories(companyId);
  for (const category of finalConfig.specificCategories.filter((item) => item.mode === "tracked")) {
    const ensured = await specificRepository.upsertCategory(
      companyId,
      category.name,
      existingCategories,
      userId,
      category.groupId,
      category.subcategoryId,
    );
    if (!existingCategories.some((item) => item.id === ensured.id)) {
      existingCategories = [...existingCategories, ensured];
    }
  }
}

export async function saveCompanyAppConfig({
  companyId,
  config,
  userId,
  markOnboardingCompleted = false,
}: SaveCompanyAppConfigInput) {
  const finalConfig: CompanyAppConfig = {
    ...config,
    onboardingCompleted: markOnboardingCompleted ? true : config.onboardingCompleted,
  };

  // Onboarding finish: prefer Admin API so client Firestore rules cannot block the wizard.
  if (markOnboardingCompleted) {
    try {
      const saved = await saveCompanyAppConfigViaApi(companyId, finalConfig);
      const sidebar = applyCompanyModulesToSidebar(readSidebarCustomization(), saved);
      writeSidebarCustomization(sidebar);
      return saved;
    } catch (apiError) {
      if (!shouldFallbackToClient(apiError)) throw apiError;
      console.warn("[saveCompanyAppConfig] API path failed, using client:", apiError);
      await saveCompanyAppConfigClient(companyId, finalConfig, userId);
      const sidebar = applyCompanyModulesToSidebar(readSidebarCustomization(), finalConfig);
      writeSidebarCustomization(sidebar);
      return finalConfig;
    }
  }

  await saveCompanyAppConfigClient(companyId, finalConfig, userId);
  const sidebar = applyCompanyModulesToSidebar(readSidebarCustomization(), finalConfig);
  writeSidebarCustomization(sidebar);
  return finalConfig;
}
