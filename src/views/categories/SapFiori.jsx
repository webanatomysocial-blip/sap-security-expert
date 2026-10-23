import React from "react";
import SEO from "../../components/SEO";
import { VITE_SITE_URL } from "../../utils/env";
import CategoryLayout from "../../components/CategoryLayout";

const SapFiori = () => {
  return (
    <>
      <SEO
        title="SAP Fiori Security: Roles, Authorization & Best Practices"
        description="Learn SAP Fiori Security with expert guides on roles, authorizations, authentication, Launchpad security, and best practices to secure your SAP Fiori environment."
        url={`${VITE_SITE_URL}/sap-fiori-security`}
      />
      <CategoryLayout categorySlug="sap-fiori-security" displayName="SAP Fiori Security" />
    </>
  );
};

export default SapFiori;
