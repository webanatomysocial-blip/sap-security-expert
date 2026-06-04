import React from "react";
import { Link } from "react-router-dom";
// next-disabled: import "../css/NotFound.css";
const NotFound = () => {
  return (
    <div className="not-found-wrapper">
      <div className="not-found-content">
        <h1>404</h1>
        <h2>Page Not Found</h2>
        <p>The page you're looking for doesn't exist or has been moved.</p>
        <Link to="/" className="btn-home">
          Go Back Home
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
