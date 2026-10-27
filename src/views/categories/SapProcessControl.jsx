import React from "react";
import SEO from "../../components/SEO";
import { VITE_SITE_URL } from "../../utils/env";
import CategoryLayout from "../../components/CategoryLayout";

const SapProcessControl = () => {
  return (
    <>
      <SEO
        title="SAP Process Control | Automate Controls & Reduce Risks"
        description="Explore SAP Process Control guides on control monitoring, risk assessment, compliance testing, automated controls and audit readiness to strengthen governance."
        keywords="SAP Process Control, SAP GRC Process Control, SAP Internal Controls, SAP Control Monitoring, SAP Risk Assessment, SAP Compliance Testing"
        url={`${VITE_SITE_URL}/sap-process-control`}
      />
      <CategoryLayout categorySlug="sap-process-control" displayName="SAP Process Control" />
    </>
  );
};

export default SapProcessControl;
