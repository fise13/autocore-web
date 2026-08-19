import { defaultCompanyAppConfig } from "@/domain/company-config";
import { saveCompanyAppConfig } from "@/lib/onboarding/save-company-app-config";
import { markWizardCompleted } from "@/lib/performance/session-flags";

/** Skip the setup wizard and open `/migration` with a sensible default workspace. */
export async function skipOnboardingForBusinessImport(companyId: string, userId: string) {
  markWizardCompleted(companyId);
  await saveCompanyAppConfig({
    companyId,
    config: {
      ...defaultCompanyAppConfig(),
      onboardingCompleted: true,
    },
    userId,
    markOnboardingCompleted: true,
  });
}
