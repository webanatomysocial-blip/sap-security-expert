import React from "react";
import SEO from "../../components/SEO";
import { VITE_SITE_URL } from "../../utils/env";
import CategoryLayout from "../../components/CategoryLayout";

const ExpertPapers = () => {
  return (
    <>
      <SEO
        title="SAP Security Research Papers: Expert Insights & Analysis"
        description="Explore in-depth SAP security research on GRC strategy, access risk frameworks, BTP security architecture and enterprise security design from practitioners."
        url={`${VITE_SITE_URL}/expert-papers`}
      />
      <CategoryLayout categorySlug="expert-papers" displayName="Expert Papers" />
    </>
  );
};

export default ExpertPapers;
