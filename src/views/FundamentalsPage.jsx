import React from 'react';
import { Link } from 'react-router-dom';
// next-disabled: import '../css/FundamentalsPage.css';
const FundamentalsPage = () => {
  return (
    <div className="fundamentals-page">
      {/* Hero Section */}
      <section className="fundamentals-hero">
        <div className="fundamentals-hero-content">
          <h1>SAP Security Fundamentals</h1>
          <p className="subtitle">
            New to SAP Security? Start with these essential concepts and build a strong foundation in access control, authorization, and compliance.
          </p>
          <a href="#learning-path" className="cta-button-orange">
            Explore Beginner Topics &rarr;
          </a>
        </div>
        
        <div className="wave-divider">
          <svg data-name="Layered Waves" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 200" preserveAspectRatio="none">
            <path d="M0,70 C300,160 800,180 1200,80 L1200,200 L0,200 Z" fill="rgba(255, 255, 255, 0.08)"></path>
            <path d="M0,120 C400,190 900,160 1200,60 L1200,200 L0,200 Z" fill="rgba(255, 255, 255, 0.15)"></path>
            <path d="M0,180 C400,195 800,120 1200,40 L1200,200 L0,200 Z" fill="#ffffff"></path>
          </svg>
        </div>
      </section>

      {/* Main Section - Learning Path */}
      <section id="learning-path" className="learning-path-section">
        <div className="container">
          <h2 className="learning-path-title">Learning Path for Beginners</h2>
          
          <div className="learning-path-new-grid">
            {/* Step 1 - Full Width */}
            <div className="step-card-horizontal">
              <div className="step-header">
                <span className="step-badge">Step 1</span>
                <h3>Understanding SAP Security</h3>
              </div>
              <div className="step-content">
                <Link to="/basics/what-is-sap-security">What is SAP Security? &rarr;</Link>
                <Link to="/basics/sap-security-architecture">SAP Security Architecture &rarr;</Link>
                <Link to="/basics/sap-security-landscape">SAP Security Landscape &rarr;</Link>
              </div>
            </div>

            {/* Grid Container for Steps 2-4 */}
            <div className="steps-bottom-grid">
              {/* Step 2 */}
              <div className="step-card-vertical">
                <div className="step-header">
                  <span className="step-badge">Step 2</span>
                  <h3>Authorization Basics</h3>
                </div>
                <div className="step-content-v">
                  <Link to="/basics/sap-authorization-concept">SAP Authorization Concept &rarr;</Link>
                  <Link to="/basics/authorization-objects-explained">Authorization Objects Explained &rarr;</Link>
                </div>
              </div>

              {/* Step 3 */}
              <div className="step-card-vertical">
                <div className="step-header">
                  <span className="step-badge">Step 3</span>
                  <h3>Users and Roles</h3>
                </div>
                <div className="step-content-v">
                  <Link to="/basics/sap-user-types">SAP User Types &rarr;</Link>
                  <Link to="/basics/sap-roles-vs-profiles">SAP Roles vs Profiles &rarr;</Link>
                  <Link to="/basics/sap-pfcg-role-design">SAP PFCG Role Design &rarr;</Link>
                </div>
              </div>

              {/* Step 4 Left */}
              <div className="step-card-vertical">
                <div className="step-header">
                  <span className="step-badge">Step 4</span>
                  <h3>Compliance Basics</h3>
                </div>
                <div className="step-content-v">
                  <Link to="/basics/sod-explained">Segregation of Duties Explained &rarr;</Link>
                  <Link to="/basics/sap-security-audit-basics">SAP Security Audit Basics &rarr;</Link>
                </div>
              </div>

              {/* Step 4 Right (Duplicate from image) */}
              <div className="step-card-vertical">
                <div className="step-header">
                  <span className="step-badge">Step 4</span>
                  <h3>Compliance Basics</h3>
                </div>
                <div className="step-content-v">
                  <Link to="/basics/sod-explained">Segregation of Duties Explained &rarr;</Link>
                  <Link to="/basics/sap-security-audit-basics">SAP Security Audit Basics &rarr;</Link>
                </div>
              </div>
            </div>
          </div>

          <div className="learning-path-footer">
            <Link to="/transactions" className="browse-transactions-link">
              Browse All Transactions &rarr;
            </Link>
          </div>
        </div>
      </section>

      {/* Recommended Articles Section */}
      <section className="recommended-section">
        <div className="container">
          <h2 className="learning-path-title">Recommended Articles</h2>
          <div className="articles-grid">
            <div className="article-card">
              <span className="beginner-pill">Beginner Friendly</span>
              <h4>SAP Authorization Concept Explained</h4>
              <span className="read-time">5 min read</span>
              <p>Learn about SAP's key authorization concepts including organizational levels, authorization objects, and fields.</p>
              <Link to="/basics/sap-authorization-concept" className="btn-read-article">
                Read Article &rarr;
              </Link>
            </div>

            <div className="article-card">
              <span className="beginner-pill">Beginner Friendly</span>
              <h4>SAP PFCG Role Design Basics</h4>
              <span className="read-time">6 min read</span>
              <p>A step-by-step guide to creating robust and scalable roles using the PFCG transaction in SAP.</p>
              <Link to="/basics/sap-pfcg-role-design" className="btn-read-article">
                Read Article &rarr;
              </Link>
            </div>

            <div className="article-card">
              <span className="beginner-pill">Beginner Friendly</span>
              <h4>Overview of SAP Security Architecture</h4>
              <span className="read-time">4 min read</span>
              <p>Understand the various layers of SAP security architecture from network to application levels.</p>
              <Link to="/basics/sap-security-architecture" className="btn-read-article">
                Read Article &rarr;
              </Link>
            </div>
          </div>
          <div className="learning-path-footer">
            <Link to="/transactions" className="browse-transactions-link">
              Browse All Transactions &rarr;
            </Link>
          </div>
        </div>
      </section>

      {/* Transactions Section */}
      <section className="transactions-section">
        <div className="container">
          <h2 className="learning-path-title">Important SAP Security Transactions</h2>
          <div className="transactions-container">
            <div className="transactions-list">
              <div className="t-code-item">
                <span className="t-code">SU01</span>
                <span className="t-desc">- User Maintenance</span>
              </div>
              <div className="t-code-item">
                <span className="t-code">SU53</span>
                <span className="t-desc">- Authorization Error</span>
              </div>
              <div className="t-code-item">
                <span className="t-code">SUIM</span>
                <span className="t-desc">- User Information System</span>
              </div>
              <div className="t-code-item">
                <span className="t-code">PFCG</span>
                <span className="t-desc">- Role Maintenance</span>
              </div>
            </div>

            <div className="icon-cards-grid">
              <div className="icon-card">
                <div className="icon-wrapper">
                  <i className="bi bi-lightbulb"></i>
                </div>
                <span>Authorization</span>
              </div>
              <div className="icon-card">
                <div className="icon-wrapper">
                  <i className="bi bi-database"></i>
                </div>
                <span>SAP GRC &rarr;</span>
              </div>
              <div className="icon-card">
                <div className="icon-wrapper">
                  <i className="bi bi-shield-lock-fill"></i>
                </div>
                <span>Cybersecurity</span>
              </div>
              <div className="icon-card">
                <div className="icon-wrapper">
                  <i className="bi bi-exclamation-triangle-fill" style={{ color: '#ee5e42' }}></i>
                </div>
                <span>Troubleshooting</span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default FundamentalsPage;
