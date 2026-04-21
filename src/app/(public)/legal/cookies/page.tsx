import type { Metadata } from "next";
import { getLegalTranslations } from "@/lib/get-legal-translations";
import { LegalDocumentLayout, LegalParagraph, LegalSection } from "@/components/legal/LegalDocumentLayout";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getLegalTranslations();
  return {
    title: t("cookiesMetaTitle"),
    description: t("cookiesMetaDescription"),
  };
}

export default async function LegalCookiesPage() {
  const t = await getLegalTranslations();

  return (
    <LegalDocumentLayout title={t("cookiesTitle")} updatedLine={t("updatedLine")}>
      <LegalParagraph>{t("cookiesLead")}</LegalParagraph>

      <LegalSection title={t("cookiesSessionTitle")}>
        <LegalParagraph>{t("cookiesSessionP1")}</LegalParagraph>
      </LegalSection>

      <LegalSection title={t("cookiesStorageTitle")}>
        <LegalParagraph>{t("cookiesStorageP1")}</LegalParagraph>
        <LegalParagraph>{t("cookiesStorageP2")}</LegalParagraph>
      </LegalSection>
    </LegalDocumentLayout>
  );
}
