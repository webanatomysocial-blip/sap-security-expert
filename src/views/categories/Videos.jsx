import React from "react";
import SEO from "../../components/SEO";
import { VITE_SITE_URL } from "../../utils/env";
import CategoryLayout from "../../components/CategoryLayout";

const Videos = () => {
  return (
    <>
      <SEO
        title="SAP Security Video Library — Short Insights from Global Practitioners"
        description="Watch two-minute perspectives from SAP Security professionals on authorization design, GRC tools, BTP security, and real-world implementation challenges."
        url={`${VITE_SITE_URL}/videos`}
      />
      <CategoryLayout categorySlug="videos" displayName="Global Voices in SAP Security" />
    </>
  );
};

export default Videos;
