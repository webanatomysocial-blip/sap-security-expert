import React from "react";
import SEO from "../../components/SEO";
import { VITE_SITE_URL } from "../../utils/env";
import CategoryLayout from "../../components/CategoryLayout";

const SapS4Hana = () => {
  return (
    <>
      <SEO
        title="SAP S/4HANA Security: Roles, HANA DB & Best Practices"
        description="Learn SAP S/4HANA Security with expert guides on roles, authorizations, Fiori security, HANA database security, and best practices for protecting your SAP landscape."
        url={`${VITE_SITE_URL}/sap-s4hana-security`}
      />
      <CategoryLayout categorySlug="sap-s4hana-security" displayName="SAP S/4HANA Security" />
    </>
  );
};

export default SapS4Hana;
