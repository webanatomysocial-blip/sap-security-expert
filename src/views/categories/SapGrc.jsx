import React from "react";
import SEO from "../../components/SEO";
import { VITE_SITE_URL } from "../../utils/env";
import CategoryLayout from "../../components/CategoryLayout";

const SapGrc = () => {
  return (
    <>
      <SEO
        title="SAP GRC Security | Reduce Risks & Improve Compliance"
        description="Discover SAP GRC best practices for managing access risks, preventing SoD violations, strengthening controls and improving audit readiness across SAP systems."
        keywords="SAP GRC Security, SAP GRC Access Control, SAP GRC Risk Analysis, SAP Segregation of Duties (SoD), SAP GRC Compliance, SAP GRC Audit Controls"
        url={`${VITE_SITE_URL}/sap-grc`}
      />
      <CategoryLayout categorySlug="sap-grc" displayName="SAP GRC & IAG" />
    </>
  );
};

export default SapGrc;
