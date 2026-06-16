import React from "react";
import { Link } from "react-router-dom";
import {
  LuShield,
  LuNetwork,
  LuLock,
  LuFileCheck,
  LuCloud,
  LuKeyRound,
  LuAward,
  LuTarget,
} from "react-icons/lu";
import { IoMdCheckmarkCircleOutline } from "react-icons/io";
import { HiArrowRight } from "react-icons/hi";
import FeaturedInsights from "../components/FeaturedInsights";
import CommunitySection from "../components/CommunitySection";
import TrendingStrip from "../components/TrendingStrip";
// next-disabled: import "../css/Home.css";
// Dummy data for visual layout
import SEO from "../components/SEO";

export default function Home() {
  return (
    <div className="home-wrapper">
      <SEO
        title="Home"
        description="The leading community for SAP Security, GRC, and BTP professionals. Get the latest insights, tutorials, and best practices."
        url={window.location.href}
      />

      <TrendingStrip />

      {/* Community Section - Three Column Layout */}
      <CommunitySection />

      {/* Featured Insights with Tabs - Dynamic from metadata */}
      <FeaturedInsights id="featured-insights" />

      <div className="container main-layout">
        {/* Explore by Expertise */}
        <section className="expertise-section">
          <div className="section-header-centered">
            <h2>Explore by Expertise</h2>
            <p>
              Deep-dive into specialized SAP security domains with
              expert-curated content.
            </p>
          </div>
          <div className="expertise-grid">
            <Link to="/sap-security" className="expertise-card-new soft-shadow">
              <div className="expertise-row">
                <div className="expertise-icon">
                  <LuShield />
                </div>
                <h3>SAP Security</h3>
              </div>
              <div className="expertise-info">
                <p>Core security, roles, authorizations, and auditing.</p>
                <span className="article-count">
                  Articles <HiArrowRight />
                </span>
              </div>
            </Link>
            <Link to="/sap-grc" className="expertise-card-new soft-shadow">
              <div className="expertise-row">
                <div className="expertise-icon">
                  <LuFileCheck />
                </div>
                <h3>SAP GRC & IAG</h3>
              </div>
              <div className="expertise-info">
                <p>Access Control, Process Control, and Risk Management.</p>
                <span className="article-count">
                  Articles <HiArrowRight />
                </span>
              </div>
            </Link>
            <Link
              to="/sap-cybersecurity"
              className="expertise-card-new soft-shadow"
            >
              <div className="expertise-row">
                <div className="expertise-icon">
                  <LuLock />
                </div>
                <h3>SAP Cybersecurity</h3>
              </div>
              <div className="expertise-info">
                <p>
                  Threat detection, monitoring, and infrastructure security.
                </p>
                <span className="article-count">
                  Articles <HiArrowRight />
                </span>
              </div>
            </Link>
            <Link
              to="/sap-licensing"
              className="expertise-card-new soft-shadow"
            >
              <div className="expertise-row">
                <div className="expertise-icon">
                  <LuKeyRound />
                </div>
                <h3>SAP Licensing</h3>
              </div>
              <div className="expertise-info">
                <p>
                  Audit readiness, usage analysis, and license optimization.
                </p>
                <span className="article-count">
                  Articles <HiArrowRight />
                </span>
              </div>
            </Link>
            <Link
              to="/sap-s4hana-security"
              className="expertise-card-new soft-shadow"
            >
              <div className="expertise-row">
                <div className="expertise-icon">
                  <LuCloud />
                </div>
                <h3>SAP S/4HANA Security</h3>
              </div>
              <div className="expertise-info">
                <p>Security for S/4HANA Finance, Supply Chain, and Cloud.</p>
                <span className="article-count">
                  Articles <HiArrowRight />
                </span>
              </div>
            </Link>
            <Link to="/sap-iag" className="expertise-card-new soft-shadow">
              <div className="expertise-row">
                <div className="expertise-icon">
                  <LuNetwork />
                </div>
                <h3>SAP IAG</h3>
              </div>
              <div className="expertise-info">
                <p>Identity Access Governance and Cloud Identity services.</p>
                <span className="article-count">
                  Articles <HiArrowRight />
                </span>
              </div>
            </Link>
          </div>
        </section>
      </div>

      {/* Why SAP Professionals Trust Us */}
      <section className="trust-section-new">
        <div className="container">
          <div className="section-header-centered white">
            <h2>Why SAP Professionals Trust Us</h2>
            <p>Built by SAP security experts, for SAP security experts.</p>
          </div>
          <div className="trust-grid-new">
            <div className="trust-card-new">
              <div className="trust-icon-box">
                <IoMdCheckmarkCircleOutline />
                {/* <CircleCheckBig /> */}
              </div>
              <h3>Real-World Experience</h3>
              <p>
                Content authored by practitioners with hands-on SAP security
                implementation experience across Fortune 500 companies.
              </p>
            </div>
            <div className="trust-card-new">
              <div className="trust-icon-box">
                <LuAward />
              </div>
              <h3>Vendor Neutral</h3>
              <p>
                Unbiased insights without commercial influence. We recommend
                solutions based on merit, not partnerships.
              </p>
            </div>
            <div className="trust-card-new">
              <div className="trust-icon-box">
                <LuTarget />
              </div>
              <h3>Actionable Frameworks</h3>
              <p>
                Ready-to-use templates, checklists, and step-by-step guides you
                can implement immediately.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Stay Ahead of the Curve (Newsletter) */}
      <section className="newsletter-section-new">
        <div className="container">
          <div className="section-header-centered">
            <h2>Stay Ahead of the Curve</h2>
            <p>
              Subscribe to our newsletter for the latest SAP security news,
              <br />
              analysis, and expert commentary delivered to your inbox.
            </p>
          </div>
          <div className="newsletter-form-container">
            <div className="newsletter-signup-box">
              <div className="newsletter-signup-icon">
                <i className="bi bi-shield-lock-fill"></i>
              </div>
              <h3>Join the SAP Security Expert Community</h3>
              <p>Get exclusive access to premium articles, expert insights, and the latest SAP security updates — all in one place.</p>
              <div className="newsletter-signup-actions">
                <Link to="/member/signup" className="btn-newsletter-primary">
                  Create Free Account <i className="bi bi-arrow-right"></i>
                </Link>
                <Link to="/member/login" className="btn-newsletter-secondary">
                  Already a member? Sign in
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
