import React from "react";
import SEO from "../../components/SEO";
import { VITE_SITE_URL } from "../../utils/env";
import CategoryLayout from "../../components/CategoryLayout";

const SapProcessControl = () => {
  return (
    <>
      <SEO
        title="SAP Process Control — Compliance, Internal Controls & Audit"
        description="Explore SAP Process Control for compliance management, internal controls, risk monitoring, control automation, and audit readiness with expert SAP insights."
        url={`${VITE_SITE_URL}/sap-process-control`}
      />
      <CategoryLayout categorySlug="sap-process-control" displayName="SAP Process Control" />
    </>
  );
};

export default SapProcessControl;
