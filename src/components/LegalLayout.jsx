import { Link } from "react-router-dom";
// next-disabled: import "../css/CategoryPage.css";
// next-disabled: import "../css/blog-post.css";
const LegalLayout = ({ title, children }) => {
  return (
    <div className="category-page-wrapper">
      {/* Header - Matching Category Style */}
      <div className="category-header-section">
        <div className="container">
          <div className="blog-breadcrumb" style={{ marginBottom: 12 }}>
            <Link to="/" className="breadcrumb-link">Home</Link>
            <span className="breadcrumb-sep"> &gt; </span>
            <span className="breadcrumb-current">{title}</span>
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
