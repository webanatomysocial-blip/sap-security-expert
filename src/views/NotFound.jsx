import { Link, useNavigate } from "react-router-dom";
import SEO from "../components/SEO";
// next-disabled: import "../css/NotFound.css";

const NotFound = ({ message = "The page you're looking for doesn't exist or may have been moved." }) => {
  const navigate = useNavigate();

  return (
    <div className="not-found-wrapper">
      <SEO title="Page Not Found | SAP Security Expert" description={message} />
      <div className="not-found-content">
        <div className="not-found-badge">404</div>
        <h1 className="not-found-title">Page Not Found</h1>
        <p className="not-found-desc">{message}</p>
        <div className="not-found-actions">
          <Link to="/" className="btn-nf-primary">
            <i className="bi bi-house-door"></i> Go Home
          </Link>
          <button className="btn-nf-secondary" onClick={() => navigate(-1)}>
            <i className="bi bi-arrow-left"></i> Go Back
          </button>
        </div>
        <div className="not-found-links">
          <span>Try one of these:</span>
          <Link to="/sap-security">SAP Security</Link>
          <Link to="/sap-grc">SAP GRC</Link>
          <Link to="/sap-btp-security">BTP Security</Link>
          <Link to="/blogs">All Blogs</Link>
          <Link to="/learning-hub">Learning Hub</Link>
          <Link to="/contact-us">Contact Us</Link>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
