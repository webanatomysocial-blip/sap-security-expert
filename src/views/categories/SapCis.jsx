import React from "react";
import SEO from "../../components/SEO";
import { VITE_SITE_URL } from "../../utils/env";
import CategoryLayout from "../../components/CategoryLayout";

const SapCis = () => {
  return (
    <>
      <SEO
        title="SAP CIS Security | IAS, IPS & Identity Management Guides"
        description="Explore SAP Cloud Identity Services with expert guides on IAS, IPS, SSO, identity provisioning, authentication and secure user access across SAP landscapes."
        keywords="SAP CIS, SAP IAS, SAP IPS, SAP Identity Authentication Service, SAP Identity Provisioning Service"
        url={`${VITE_SITE_URL}/sap-cis`}
      />
      <CategoryLayout categorySlug="sap-cis" displayName="SAP CIS (IAS/IPS) Security" />
    </>
  );
};

export default SapCis;
