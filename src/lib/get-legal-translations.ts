import { getLocale } from "next-intl/server";
import { getTranslations } from "next-intl/server";
import { resolveLegalContentLocale } from "@/lib/legal-content-locale";

export async function getLegalTranslations() {
  const appLocale = await getLocale();
  const legalLocale = resolveLegalContentLocale(appLocale);
  return getTranslations({ locale: legalLocale, namespace: "legal" });
}
