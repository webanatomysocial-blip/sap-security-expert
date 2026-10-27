import React from "react";
import SEO from "../../components/SEO";
import { VITE_SITE_URL } from "../../utils/env";
import CategoryLayout from "../../components/CategoryLayout";

const SapS4Hana = () => {
  return (
    <>
      <SEO
        title="SAP S/4HANA Security | Roles & Authorization Guides"
        description="Explore SAP S/4HANA Security guides covering roles, authorizations, access controls, audit readiness and practical best practices for secure SAP environments."
        keywords="SAP S/4HANA Security Best Practices, SAP S/4HANA Authorizations, SAP Role Management, SAP Access Controls, SAP Security Configuration"
        url={`${VITE_SITE_URL}/sap-s4hana-security`}
      />
      <CategoryLayout categorySlug="sap-s4hana-security" displayName="SAP S/4HANA Security" />
    </>
  );
};

export default SapS4Hana;
