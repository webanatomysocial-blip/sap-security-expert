import React from "react";
import { Link } from "react-router-dom";
import BlogSidebar from "./BlogSidebar";
// next-disabled: import "../css/CategoryPage.css";
// next-disabled: import "../css/blog-post.css";
const LegalLayout = ({ title, children }) => {
  return (
    <div className="category-page-wrapper">
      {/* Header - Matching Category Style */}
      <div className="category-header-section">
        <div className="container">
          <div className="breadcrumbs">
            <Link to="/">Home</Link> &gt; <span>{title}</span>
          </div>
          <h1 className="blog-title" style={{ margin: 0, fontSize: "42px" }}>
            {title}
          </h1>
        </div>
      </div>

      <div className="category-content container">
        <div className="legal-layout-grid">
          {/* Main Content Column */}
          <div>
            <article className="blog-content-body">{children}</article>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LegalLayout;
