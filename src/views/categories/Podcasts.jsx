import React from "react";
import SEO from "../../components/SEO";
import { VITE_SITE_URL } from "../../utils/env";
import CategoryLayout from "../../components/CategoryLayout";

const Podcasts = () => {
  return (
    <>
      <SEO
        title="SAP Security Podcast — Expert Interviews & Practitioner Conversations"
        description="Listen to SAP security practitioners discuss access risk, GRC implementation, BTP security, and enterprise compliance challenges. Real conversations from the field."
        url={`${VITE_SITE_URL}/podcasts`}
      />
      <CategoryLayout categorySlug="podcasts" displayName="Expert Voices/Podcasts" />
    </>
  );
};

export default Podcasts;
