import React from "react";
import SEO from "../../components/SEO";
import { VITE_SITE_URL } from "../../utils/env";
import CategoryLayout from "../../components/CategoryLayout";

const Downloads = () => {
  return (
    <>
      <SEO
        title="Free SAP Security Downloads — Templates, Checklists & Audit Tools"
        description="Download practitioner-curated SAP security resources: role design templates, SoD conflict matrices, GRC configuration guides, security audit checklists, and ABAP security frameworks."
        url={`${VITE_SITE_URL}/downloads`}
      />
      <CategoryLayout
        categorySlug="downloads"
        displayName="Downloads"
      />
    </>
  );
};

export default Downloads;
