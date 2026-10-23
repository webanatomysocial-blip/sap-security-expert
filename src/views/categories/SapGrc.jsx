import React from "react";
import SEO from "../../components/SEO";
import { VITE_SITE_URL } from "../../utils/env";
import CategoryLayout from "../../components/CategoryLayout";

const SapGrc = () => {
  return (
    <>
      <SEO
        title="SAP GRC Guide: Access Control & Risk Management"
        description="Explore SAP GRC solutions with expert guides on Access Control, SoD analysis, risk management, compliance, workflows, and SAP security best practices."
        url={`${VITE_SITE_URL}/sap-grc`}
      />
      <CategoryLayout categorySlug="sap-grc" displayName="SAP GRC & IAG" />
    </>
  );
};

export default SapGrc;
