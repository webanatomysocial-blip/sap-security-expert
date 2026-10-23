import React from "react";
import SEO from "../../components/SEO";
import { VITE_SITE_URL } from "../../utils/env";
import CategoryLayout from "../../components/CategoryLayout";

const SapSac = () => {
  return (
    <>
      <SEO
        title="SAP Analytics Cloud Security — Permissions, Roles & Data Protection"
        description="Explore SAP Analytics Cloud Security with expert guides on user access, roles, permissions, authentication, data protection, and security governance best practices."
        url={`${VITE_SITE_URL}/sap-sac-security`}
      />
      <CategoryLayout categorySlug="sap-sac-security" displayName="SAP SAC Security" />
    </>
  );
};

export default SapSac;
