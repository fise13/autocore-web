import type { Locale } from "date-fns";
import { enUS, ru } from "date-fns/locale";

import { getActiveUserCopyLocale } from "@/lib/user-copy";

/** date-fns locale matching the active UI language (month names, "5 minutes ago"). */
export function dateFnsLocale(): Locale {
  return getActiveUserCopyLocale() === "ru" ? ru : enUS;
}
