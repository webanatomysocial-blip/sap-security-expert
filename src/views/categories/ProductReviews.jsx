import React from "react";
import SEO from "../../components/SEO";
import { VITE_SITE_URL } from "../../utils/env";
import CategoryLayout from "../../components/CategoryLayout";

const ProductReviews = () => {
  return (
    <>
      <SEO
        title="SAP GRC & Security Product Reviews — Independent Practitioner Analysis"
        description="Read honest, practitioner-written reviews of SAP GRC, IAG, access risk, and cybersecurity tools. Technical analysis to help you evaluate and select the right SAP security products."
        url={`${VITE_SITE_URL}/product-reviews`}
      />
      <CategoryLayout
        categorySlug="product-reviews"
        displayName="Product Reviews"
      />
    </>
  );
};

export default ProductReviews;
