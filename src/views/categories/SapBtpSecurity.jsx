import React from "react";
import SEO from "../../components/SEO";
import { VITE_SITE_URL } from "../../utils/env";
import CategoryLayout from "../../components/CategoryLayout";

const SapBtpSecurity = () => {
  return (
    <>
      <SEO
        title="SAP BTP Security | Access Control & Security Guides"
        description="Learn SAP BTP Security through practical guides on identity management, role collections, authorizations, cloud application security and secure integrations."
        keywords="SAP BTP Access Control, SAP BTP Identity Management, SAP BTP Role Collections, SAP BTP Authorization, SAP BTP"
        url={`${VITE_SITE_URL}/sap-btp-security`}
      />
      <CategoryLayout categorySlug="sap-btp-security" displayName="SAP BTP Security" />
    </>
  );
};

export default SapBtpSecurity;
