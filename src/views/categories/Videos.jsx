import React from "react";
import SEO from "../../components/SEO";
import { VITE_SITE_URL } from "../../utils/env";
import CategoryLayout from "../../components/CategoryLayout";

const Videos = () => {
  return (
    <>
      <SEO
        title="SAP Security Videos: Expert Tutorials & Practical Guides"
        description="Watch short video tutorials and practical perspectives from SAP Security and GRC practitioners around the world."
        url={`${VITE_SITE_URL}/videos`}
      />
      <CategoryLayout categorySlug="videos" displayName="Global Voices in SAP Security" />
    </>
  );
};

export default Videos;
