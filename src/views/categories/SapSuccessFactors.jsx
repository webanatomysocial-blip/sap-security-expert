import React from "react";
import SEO from "../../components/SEO";
import { VITE_SITE_URL } from "../../utils/env";
import CategoryLayout from "../../components/CategoryLayout";

const SapSuccessFactors = () => {
  return (
    <>
      <SEO
        title="SAP SuccessFactors Security — RBP, IAM & HR Data Protection"
        description="Learn SAP SuccessFactors Security best practices for roles, permissions, identity management, authentication, data protection, and secure HR access governance."
        url={`${VITE_SITE_URL}/sap-successfactors-security`}
      />
      <CategoryLayout categorySlug="sap-successfactors-security" displayName="SAP SuccessFactors Security" />
    </>
  );
};

export default SapSuccessFactors;
