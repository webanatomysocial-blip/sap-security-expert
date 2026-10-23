import React from "react";
import SEO from "../../components/SEO";
import { VITE_SITE_URL } from "../../utils/env";
import CategoryLayout from "../../components/CategoryLayout";

const SapLicensing = () => {
  return (
    <>
      <SEO
        title="SAP Licensing Guide — User Types, Metrics & Compliance"
        description="Understand SAP licensing metrics, user types, indirect access rules, and contract optimisation strategies to manage costs and avoid audit risk."
        url={`${VITE_SITE_URL}/sap-licensing`}
      />
      <CategoryLayout categorySlug="sap-licensing" displayName="SAP Licensing" />
    </>
  );
};

export default SapLicensing;
