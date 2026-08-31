import { cookies } from "next/headers";

import { AppLoadingScreen } from "@/components/ui/app-loading-screen";
import {
  PREFERRED_LOCALE_STORAGE_KEY,
  resolveAccountLocale,
} from "@/lib/locale/preferred-locale";

export default async function Loading() {
  const jar = await cookies();
  const locale = resolveAccountLocale({
    storedLocale: jar.get(PREFERRED_LOCALE_STORAGE_KEY)?.value,
  });

  return <AppLoadingScreen locale={locale} />;
}
