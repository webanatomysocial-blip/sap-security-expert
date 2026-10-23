import React from "react";
import SEO from "../../components/SEO";
import { VITE_SITE_URL } from "../../utils/env";
import CategoryLayout from "../../components/CategoryLayout";

const SapAccessControl = () => {
  return (
    <>
      <SEO
        title="SAP Access Control: Roles, SoD & Risk Management"
        description="Learn SAP Access Control best practices for user access, roles, SoD analysis, risk management, approvals, and governance to secure SAP environments."
        url={`${VITE_SITE_URL}/sap-access-control`}
      />
      <CategoryLayout categorySlug="sap-access-control" displayName="SAP Access Control" />
    </>
  );
};

export default SapAccessControl;
