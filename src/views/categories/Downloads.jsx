import React from "react";
import SEO from "../../components/SEO";
import { VITE_SITE_URL } from "../../utils/env";
import CategoryLayout from "../../components/CategoryLayout";

const Downloads = () => {
  return (
    <>
      <SEO
        title="SAP Security Downloads: Free Resources, Guides & Tools"
        description="Explore downloadable SAP security resources, from role design templates and SoD conflict matrices to audit tools and practical GRC configuration guides."
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
