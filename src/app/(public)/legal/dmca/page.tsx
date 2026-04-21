import type { Metadata } from "next";
import { getLegalTranslations } from "@/lib/get-legal-translations";
import { LegalDocumentLayout, LegalParagraph, LegalSection } from "@/components/legal/LegalDocumentLayout";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getLegalTranslations();
  return {
    title: t("dmcaMetaTitle"),
    description: t("dmcaMetaDescription"),
  };
}

export default async function LegalDmcaPage() {
  const t = await getLegalTranslations();

  return (
    <LegalDocumentLayout title={t("dmcaTitle")} updatedLine={t("updatedLine")}>
      <LegalParagraph>{t("dmcaLead")}</LegalParagraph>

      <LegalSection title={t("dmcaSafeHarborTitle")}>
        <LegalParagraph>{t("dmcaSafeHarborP1")}</LegalParagraph>
      </LegalSection>

      <LegalSection title={t("dmcaProcessTitle")}>
        <LegalParagraph>{t("dmcaProcessP1")}</LegalParagraph>
        <LegalParagraph>{t("dmcaProcessP2")}</LegalParagraph>
      </LegalSection>

      <LegalSection title={t("dmcaTimelineTitle")}>
        <LegalParagraph>{t("dmcaTimelineP1")}</LegalParagraph>
      </LegalSection>

      <LegalSection title={t("dmcaRepeatTitle")}>
        <LegalParagraph>{t("dmcaRepeatP1")}</LegalParagraph>
      </LegalSection>
    </LegalDocumentLayout>
  );
}
