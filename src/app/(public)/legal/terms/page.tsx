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
    title: t("termsMetaTitle"),
    description: t("termsMetaDescription"),
  };
}

export default async function LegalTermsPage() {
  const t = await getLegalTranslations();

  return (
    <LegalDocumentLayout title={t("termsTitle")} updatedLine={t("updatedLine")}>
      <LegalParagraph>{t("termsLead")}</LegalParagraph>

      <LegalSection title={t("termsHostingTitle")}>
        <LegalParagraph>{t("termsHostingP1")}</LegalParagraph>
        <LegalParagraph>{t("termsHostingP2")}</LegalParagraph>
        <LegalParagraph>{t("termsHostingP3")}</LegalParagraph>
      </LegalSection>

      <LegalSection title={t("termsEligibilityTitle")}>
        <LegalParagraph>{t("termsEligibilityP1")}</LegalParagraph>
        <LegalParagraph>{t("termsEligibilityP2")}</LegalParagraph>
      </LegalSection>

      <LegalSection title={t("termsAccountsTitle")}>
        <LegalParagraph>{t("termsAccountsP1")}</LegalParagraph>
        <LegalParagraph>{t("termsAccountsP2")}</LegalParagraph>
      </LegalSection>

      <LegalSection title={t("termsZenTitle")}>
        <LegalParagraph>{t("termsZenP1")}</LegalParagraph>
        <LegalParagraph>{t("termsZenP2")}</LegalParagraph>
        <LegalParagraph>{t("termsZenP3")}</LegalParagraph>
        <LegalParagraph>{t("termsZenP4")}</LegalParagraph>
      </LegalSection>

      <LegalSection title={t("termsConductTitle")}>
        <LegalParagraph>{t("termsConductP1")}</LegalParagraph>
        <LegalList
          items={[
            t("termsConductLi1"),
            t("termsConductLi2"),
            t("termsConductLi3"),
            t("termsConductLi4"),
            t("termsConductLi5"),
            t("termsConductLi6"),
          ]}
        />
      </LegalSection>

      <LegalSection title={t("termsTerminationTitle")}>
        <LegalParagraph>{t("termsTerminationP1")}</LegalParagraph>
        <LegalParagraph>{t("termsTerminationP2")}</LegalParagraph>
      </LegalSection>
    </LegalDocumentLayout>
  );
}
