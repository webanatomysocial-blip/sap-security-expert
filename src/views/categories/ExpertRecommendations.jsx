import React from "react";
import SEO from "../../components/SEO";
import { VITE_SITE_URL } from "../../utils/env";
import CategoryLayout from "../../components/CategoryLayout";

const ExpertRecommendations = () => {
  return (
    <>
      <SEO
        title="SAP Security Expert Picks — Curated Resources Recommended by Practitioners"
        description="Articles, tools, and resources hand-picked by SAP Security practitioners. The best practical guidance on authorization, GRC, compliance, and SAP security operations — vetted by the community."
        url={`${VITE_SITE_URL}/expert-recommendations`}
      />
      <CategoryLayout categorySlug="expert-recommendations" displayName="Expert Articles" />
    </>
  );
};

export default ExpertRecommendations;
