import React from "react";
import SEO from "../../components/SEO";
import { VITE_SITE_URL } from "../../utils/env";
import CategoryLayout from "../../components/CategoryLayout";

const SapPublicCloud = () => {
  return (
    <>
      <SEO
        title="SAP Public Cloud Security Guide — S/4HANA Cloud Edition"
        description="Learn SAP S/4HANA Cloud Public Edition security, including IAM, IAS/IPS, user access, business catalogs, integrations, audit strategies, and best practices."
        url={`${VITE_SITE_URL}/sap-public-cloud`}
      />
      <CategoryLayout categorySlug="sap-public-cloud" displayName="SAP Public Cloud" />
    </>
  );
};

export default SapPublicCloud;
