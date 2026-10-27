import React from "react";
import SEO from "../../components/SEO";
import { VITE_SITE_URL } from "../../utils/env";
import CategoryLayout from "../../components/CategoryLayout";

const ProductReviews = () => {
  return (
    <>
      <SEO
        title="SAP Security Product Reviews: Expert Insights & Analysis"
        description="Explore independent SAP GRC and security product reviews with expert analysis of IAG, access risk and cybersecurity tools to help you make informed choices."
        keywords="SAP GRC Product Reviews, SAP Security Tools, SAP IAG Tools, SAP Access Risk Analysis, SAP Cybersecurity Tools, SAP GRC Solutions"
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
