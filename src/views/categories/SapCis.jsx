import React from "react";
import SEO from "../../components/SEO";
import { VITE_SITE_URL } from "../../utils/env";
import CategoryLayout from "../../components/CategoryLayout";

const SapCis = () => {
  return (
    <>
      <SEO
        title="SAP Cloud Identity Services — IAS, IPS & Identity Management"
        description="Explore SAP Cloud Identity Services with expert guides on IAS, IPS, identity management, authentication, provisioning, and secure access governance."
        url={`${VITE_SITE_URL}/sap-cis`}
      />
      <CategoryLayout categorySlug="sap-cis" displayName="SAP CIS (IAS/IPS) Security" />
    </>
  );
};

export default SapCis;
