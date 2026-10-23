import React from "react";
import SEO from "../../components/SEO";
import { VITE_SITE_URL } from "../../utils/env";
import CategoryLayout from "../../components/CategoryLayout";

const SapBtpSecurity = () => {
  return (
    <>
      <SEO
        title="SAP BTP Security: Best Practices & Expert Guides"
        description="Explore SAP BTP Security with expert guides on identity and access management, authentication, authorization, cloud security, and best practices."
        url={`${VITE_SITE_URL}/sap-btp-security`}
      />
      <CategoryLayout categorySlug="sap-btp-security" displayName="SAP BTP Security" />
    </>
  );
};

export default SapBtpSecurity;
