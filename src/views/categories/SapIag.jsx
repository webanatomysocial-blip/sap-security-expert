import React from "react";
import SEO from "../../components/SEO";
import { VITE_SITE_URL } from "../../utils/env";
import CategoryLayout from "../../components/CategoryLayout";

const SapIag = () => {
  return (
    <>
      <SEO
        title="SAP IAG: Identity Access Governance & Cloud IAM Best Practices"
        description="Explore SAP IAG with expert guides on identity access governance, user provisioning, access requests, risk analysis, IAM, and secure SAP cloud access."
        url={`${VITE_SITE_URL}/sap-iag`}
      />
      <CategoryLayout categorySlug="sap-iag" displayName="SAP IAG" />
    </>
  );
};

export default SapIag;
