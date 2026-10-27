import React from "react";
import SEO from "../../components/SEO";
import { VITE_SITE_URL } from "../../utils/env";
import CategoryLayout from "../../components/CategoryLayout";

const Podcasts = () => {
  return (
    <>
      <SEO
        title="SAP Security Podcast: Expert Insights & Real Conversations"
        description="Listen to SAP security experts discuss access risk, BTP, GRC implementation, and enterprise compliance through practical insights and real-world experience."
        keywords="SAP Security Podcasts, SAP Security Expert Interviews, SAP Access Risk Management, SAP BTP Security, SAP Cybersecurity"
        url={`${VITE_SITE_URL}/podcasts`}
      />
      <CategoryLayout categorySlug="podcasts" displayName="Expert Voices/Podcasts" />
    </>
  );
};

export default Podcasts;
