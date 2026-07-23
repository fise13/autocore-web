import { cookies } from "next/headers";

import { AppLoadingScreen } from "@/components/ui/app-loading-screen";
import {
  coerceAppLocale,
  PREFERRED_LOCALE_STORAGE_KEY,
} from "@/lib/locale/preferred-locale";

export default async function Loading() {
  const jar = await cookies();
  const locale = coerceAppLocale(jar.get(PREFERRED_LOCALE_STORAGE_KEY)?.value);

  return <AppLoadingScreen locale={locale} />;
}
