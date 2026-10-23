import React from "react";
import SEO from "../../components/SEO";
import { VITE_SITE_URL } from "../../utils/env";
import CategoryLayout from "../../components/CategoryLayout";

const ExpertPapers = () => {
  return (
    <>
      <SEO
        title="SAP Security Expert Papers — In-Depth Research & Technical Deep Dives"
        description="Read practitioner-authored papers on SAP GRC strategy, access risk frameworks, BTP security architecture, and enterprise security programme design. Detailed technical analysis, not vendor content."
        url={`${VITE_SITE_URL}/expert-papers`}
      />
      <CategoryLayout categorySlug="expert-papers" displayName="Expert Papers" />
    </>
  );
};

export default ExpertPapers;
