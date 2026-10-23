import React from "react";
import SEO from "../../components/SEO";
import { VITE_SITE_URL } from "../../utils/env";
import CategoryLayout from "../../components/CategoryLayout";

const SapOther = () => {
  return (
    <>
      <SEO
        title="Advanced SAP Security — ABAP, Interfaces & Governance"
        description="Explore SAP Security resources covering ABAP secure coding, interface security, governance, compliance, and best practices to strengthen SAP landscapes."
        url={`${VITE_SITE_URL}/sap-security-other`}
      />
      <CategoryLayout categorySlug="sap-security-other" displayName="Other SAP Security" />
    </>
  );
};

export default SapOther;
