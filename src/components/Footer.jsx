import React from "react";
import { Link } from "react-router-dom";
import Image from "next/image";
import { VITE_SITE_URL } from "../utils/env";
import { APP_VERSION } from "../config/appVersion";
// next-disabled: import "../css/Footer.css";
import whiteLogo from "../assets/sapsecurityexpert-white.png";
import {
  FaLinkedinIn,
  FaInstagram,
  FaTwitter,
  FaFacebookF,
} from "react-icons/fa";

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="footer-container">
      <div className="footer-content">
        {/* Branch 1 */}
        <div className="footer-brand">
          <div className="brand-header">
            <Image src={whiteLogo} alt="SAP Security Expert" width={200} height={50} style={{ width: 'auto', height: '50px', display: 'block' }} priority />
          </div>
          <p>
            The leading community for SAP Security, GRC, and BTP professionals.
            Join us to learn, share, and grow.
          </p>
          <div className="footer-social-links">
            <a
              href="https://www.linkedin.com/company/sapsecurityexpert/"
              className="footer-social-icon"
            >
              <FaLinkedinIn />
            </a>
            <a href="https://x.com/sapsecexpert" className="footer-social-icon">
              <FaTwitter />
            </a>
            <a
              href="https://www.instagram.com/sapsecurityexpert/"
              className="footer-social-icon"
            >
              <FaInstagram />
            </a>
          </div>
        </div>

        {/* Branch 2 */}
        <div className="footer-links-grid">
          <div className="footer-column">
            <h4>Resources</h4>
            <ul>
              <li>
                <Link to="/sap-security">SAP Security</Link>
              </li>
              <li>
                <Link to="/sap-grc">SAP GRC</Link>
              </li>
              <li>
                <Link to="/sap-iag">SAP IAG</Link>
              </li>
              <li>
                <Link to="/sap-btp-security">BTP Security</Link>
              </li>

              <li>
                <Link to="/sap-cybersecurity">SAP Cybersecurity</Link>
              </li>
            </ul>
          </div>

          <div className="footer-column">
            <h4>Explore</h4>
            <ul>
              <li>
                <Link to="/podcasts">Expert Voices/Podcasts</Link>
              </li>
              <li>
                <Link to="/product-reviews">Product Reviews</Link>
              </li>
              <li>
                <Link to="/expert-recommendations">Expert Articles</Link>
              </li>
              <li>
                <Link to="/become-a-contributor">Become a Contributor</Link>
              </li>
            </ul>
          </div>

          <div className="footer-column">
            <h4>Legal & Contact</h4>
            <ul>
              <li>
                <Link to="/contact-us">Contact Us</Link>
              </li>
              <li>
                <Link to="/privacy-policy">Privacy Policy</Link>
              </li>
              <li>
                <Link to="/terms-conditions">Terms & Conditions</Link>
              </li>
              <li>
                <Link to="/accessibility-statement">Accessibility</Link>
              </li>
              <li>
                <Link to="/safety-movement">Safety Movement</Link>
              </li>
              <li>
                <Link to="/security-compliance-overview">
                  Security & Compliance
                </Link>
              </li>
              <li>
                <Link to="/responsible-ai-automation-statement">
                  Responsible AI
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </div>

      <div className="footer-bottom">
        <p className="footer-disclaimer">
          SAP SE, SAP AG, or any of their affiliates ("SAP") has no affiliation,
          association, endorsement, sponsorship, or connection whatsoever with
          SAP Security Expert or the website{" "}
          <a
            href={
              VITE_SITE_URL
            }
          >
            {VITE_SITE_URL
              .replace("https://", "")
              .replace("http://", "")}
          </a>
          . This website is independently owned and operated by a third party
          and is not authorized, approved, or related in any manner to SAP. All
          content provided herein is for informational purposes only and does
          not represent the views, products, or services of SAP.
        </p>
        <p style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "10px", flexWrap: "wrap" }}>
          © {currentYear} SAP Security Expert. All rights reserved.
          <span style={{
            display: "inline-flex", alignItems: "center", gap: "5px",
            background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.25)",
            color: "#64748b", borderRadius: "20px", padding: "2px 10px",
            fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.04em",
          }}>
            <i className="bi bi-layers-fill" style={{ fontSize: "0.7rem" }} /> Platform v{APP_VERSION}
          </span>
        </p>
      </div>
    </footer>
  );
};

export default Footer;
