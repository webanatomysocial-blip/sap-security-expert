import React from "react";
import SEO from "../../components/SEO";
import { VITE_SITE_URL } from "../../utils/env";
import CategoryLayout from "../../components/CategoryLayout";

const SapIag = () => {
  return (
    <>
      <SEO
        title="SAP IAG: Identity Governance & Cloud IAM Best Practices"
        description="Explore SAP IAG guides on identity governance, access requests, user provisioning, risk analysis and cloud IAM to strengthen access security and compliance."
        keywords="SAP Identity Access Governance, SAP IAG Best Practices, SAP IAG Access Requests, SAP IAG User Provisioning, SAP IAG Risk Analysis"
        url={`${VITE_SITE_URL}/sap-iag`}
      />
      <CategoryLayout categorySlug="sap-iag" displayName="SAP IAG" />
    </>
  );
};

export default SapIag;
