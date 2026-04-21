import type { Metadata } from "next";
import { getLegalTranslations } from "@/lib/get-legal-translations";
import {
  LegalDocumentLayout,
  LegalList,
  LegalParagraph,
  LegalSection,
} from "@/components/legal/LegalDocumentLayout";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getLegalTranslations();
  return {
    title: t("privacyMetaTitle"),
    description: t("privacyMetaDescription"),
  };
}

export default async function LegalPrivacyPage() {
  const t = await getLegalTranslations();

  return (
    <LegalDocumentLayout title={t("privacyTitle")} updatedLine={t("updatedLine")}>
      <LegalParagraph>{t("privacyLead")}</LegalParagraph>

      <LegalSection title={t("privacyCollectTitle")}>
        <LegalParagraph>{t("privacyCollectP1")}</LegalParagraph>
        <LegalList
          items={[
            t("privacyCollectLi1"),
            t("privacyCollectLi2"),
            t("privacyCollectLi3"),
            t("privacyCollectLi4"),
            t("privacyCollectLi5"),
          ]}
        />
      </LegalSection>

      <LegalSection title={t("privacyUseTitle")}>
        <LegalParagraph>{t("privacyUseP1")}</LegalParagraph>
        <LegalParagraph>{t("privacyUseP2")}</LegalParagraph>
      </LegalSection>

      <LegalSection title={t("privacyDeleteTitle")}>
        <LegalParagraph>{t("privacyDeleteP1")}</LegalParagraph>
        <LegalParagraph>{t("privacyDeleteP2")}</LegalParagraph>
      </LegalSection>
    </LegalDocumentLayout>
  );
}
