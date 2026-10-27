import React from "react";
import SEO from "../../components/SEO";
import { VITE_SITE_URL } from "../../utils/env";
import CategoryLayout from "../../components/CategoryLayout";

const SapSac = () => {
  return (
    <>
      <SEO
        title="SAP SAC Security | Roles, Data Access & Best Practices"
        description="Explore SAP Analytics Cloud Security with guides on user access, roles, permissions, authentication, data protection and security governance best practices."
        keywords="SAP Analytics Cloud Security, SAP SAC Roles, SAP SAC Data Access Control, SAP SAC Model Security, SAP SAC Authorization"
        url={`${VITE_SITE_URL}/sap-sac-security`}
      />
      <CategoryLayout categorySlug="sap-sac-security" displayName="SAP SAC Security" />
    </>
  );
};

export default SapSac;
