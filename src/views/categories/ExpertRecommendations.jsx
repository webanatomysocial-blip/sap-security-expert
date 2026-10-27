import React from "react";
import SEO from "../../components/SEO";
import { VITE_SITE_URL } from "../../utils/env";
import CategoryLayout from "../../components/CategoryLayout";

const ExpertRecommendations = () => {
  return (
    <>
      <SEO
        title="SAP Security Expert Picks: Top Resources & Best Practices"
        description="Find practitioner-recommended SAP security articles, tools and guides covering access controls, GRC, compliance and practical security management."
        url={`${VITE_SITE_URL}/expert-recommendations`}
      />
      <CategoryLayout categorySlug="expert-recommendations" displayName="Expert Articles" />
    </>
  );
};

export default ExpertRecommendations;
