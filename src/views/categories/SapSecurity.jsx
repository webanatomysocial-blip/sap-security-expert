import React from "react";
import SEO from "../../components/SEO";
import { VITE_SITE_URL } from "../../utils/env";
import CategoryLayout from "../../components/CategoryLayout";

const SapSecurity = () => {
  return (
    <>
      <SEO
        title="SAP Security Guide: Roles, Authorizations & Best Practices"
        description="Explore SAP Security tutorials, role management, authorizations, auditing, compliance, and best practices to secure your SAP landscape with expert insights."
        keywords="SAP Security Guides, SAP Roles and Authorizations, SAP PFCG, SAP Access Control, SAP Security Best Practices, SAP Security Audit"
        url={`${VITE_SITE_URL}/sap-security`}
      />
      <CategoryLayout categorySlug="sap-security" displayName="SAP Security" />
    </>
  );
};

export default SapSecurity;
