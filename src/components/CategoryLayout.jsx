import React, { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import Image from "next/image";
// Removed static metadata import
import BlogSidebar from "./BlogSidebar";
// next-disabled: import "../css/CategoryPage.css";
import { getBlogs, getCommunityStats } from "../services/api";

const CATEGORY_META = {
  "sap-security": {
    description: "Stay ahead of evolving threats with expert insights, best practices, and deep-dives across the SAP security landscape.",
    icon: (
      <svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="60" cy="60" r="56" stroke="rgba(255,255,255,0.08)" strokeWidth="2"/>
        <path d="M60 18L82 30V54C82 69 72 82 60 87C48 82 38 69 38 54V30L60 18Z" fill="rgba(238,94,66,0.18)" stroke="rgba(238,94,66,0.7)" strokeWidth="2"/>
        <path d="M52 60l6 6 12-12" stroke="#ee5e42" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
        <circle cx="60" cy="57" r="3" fill="rgba(238,94,66,0.5)"/>
        <path d="M30 90 Q60 105 90 90" stroke="rgba(255,255,255,0.06)" strokeWidth="1.5"/>
        <circle cx="25" cy="45" r="4" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.1)" strokeWidth="1"/>
        <circle cx="95" cy="75" r="6" fill="rgba(238,94,66,0.06)" stroke="rgba(238,94,66,0.2)" strokeWidth="1"/>
      </svg>
    ),
  },
  "sap-cybersecurity": {
    description: "Stay ahead of evolving threats and protect your SAP ecosystem. Explore expert insights, best practices, and tools to strengthen your cybersecurity posture.",
    icon: (
      <svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="60" cy="60" r="56" stroke="rgba(255,255,255,0.06)" strokeWidth="1.5"/>
        <rect x="36" y="44" width="48" height="36" rx="6" fill="rgba(238,94,66,0.12)" stroke="rgba(238,94,66,0.5)" strokeWidth="1.5"/>
        <path d="M48 44V36a12 12 0 0124 0v8" stroke="rgba(238,94,66,0.6)" strokeWidth="2" strokeLinecap="round"/>
        <circle cx="60" cy="62" r="5" fill="rgba(238,94,66,0.7)"/>
        <path d="M60 67v7" stroke="rgba(238,94,66,0.7)" strokeWidth="2" strokeLinecap="round"/>
        <circle cx="88" cy="30" r="8" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.1)" strokeWidth="1"/>
        <circle cx="28" cy="88" r="5" fill="rgba(238,94,66,0.06)" stroke="rgba(238,94,66,0.18)" strokeWidth="1"/>
        <path d="M80 20 L92 20 M86 14 L86 26" stroke="rgba(255,255,255,0.08)" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),
  },
  "sap-grc": {
    description: "Master SAP GRC with in-depth coverage of Access Control, Process Control, Risk Management, and Identity & Access Governance.",
    icon: (
      <svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="60" cy="60" r="56" stroke="rgba(255,255,255,0.06)" strokeWidth="1.5"/>
        <rect x="30" y="38" width="22" height="22" rx="4" fill="rgba(238,94,66,0.12)" stroke="rgba(238,94,66,0.5)" strokeWidth="1.5"/>
        <rect x="68" y="38" width="22" height="22" rx="4" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5"/>
        <rect x="49" y="68" width="22" height="22" rx="4" fill="rgba(238,94,66,0.08)" stroke="rgba(238,94,66,0.35)" strokeWidth="1.5"/>
        <path d="M52 49h16M60 49v-6M60 68V60M41 60h38" stroke="rgba(255,255,255,0.12)" strokeWidth="1.5" strokeLinecap="round"/>
        <path d="M36 47l6 6-6 6" stroke="rgba(238,94,66,0.6)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
  "sap-btp-security": {
    description: "Secure your SAP Business Technology Platform deployments with expert guidance on identity, integration, and cloud-native security.",
    icon: (
      <svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="60" cy="60" r="56" stroke="rgba(255,255,255,0.06)" strokeWidth="1.5"/>
        <ellipse cx="60" cy="52" rx="28" ry="14" fill="rgba(238,94,66,0.1)" stroke="rgba(238,94,66,0.45)" strokeWidth="1.5"/>
        <path d="M32 52v16c0 7.7 12.5 14 28 14s28-6.3 28-14V52" stroke="rgba(255,255,255,0.12)" strokeWidth="1.5"/>
        <path d="M32 60c0 7.7 12.5 14 28 14s28-6.3 28-14" stroke="rgba(238,94,66,0.3)" strokeWidth="1.5"/>
        <path d="M50 52c0-5.5 4.5-10 10-10s10 4.5 10 10" stroke="rgba(238,94,66,0.6)" strokeWidth="2" strokeLinecap="round"/>
        <circle cx="60" cy="52" r="4" fill="rgba(238,94,66,0.8)"/>
      </svg>
    ),
  },
  "sap-s4hana-security": {
    description: "Protect your S/4HANA environment with authorizations, role design, migration security, and compliance best practices.",
    icon: (
      <svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="60" cy="60" r="56" stroke="rgba(255,255,255,0.06)" strokeWidth="1.5"/>
        <rect x="28" y="34" width="64" height="52" rx="6" fill="rgba(238,94,66,0.07)" stroke="rgba(238,94,66,0.3)" strokeWidth="1.5"/>
        <rect x="34" y="40" width="52" height="10" rx="3" fill="rgba(238,94,66,0.2)" stroke="rgba(238,94,66,0.45)" strokeWidth="1"/>
        <rect x="34" y="56" width="24" height="6" rx="2" fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.15)" strokeWidth="1"/>
        <rect x="34" y="66" width="16" height="6" rx="2" fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.15)" strokeWidth="1"/>
        <rect x="62" y="56" width="24" height="16" rx="3" fill="rgba(238,94,66,0.12)" stroke="rgba(238,94,66,0.4)" strokeWidth="1"/>
        <path d="M69 64l4 4 6-8" stroke="#ee5e42" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
  "sap-fiori-security": {
    description: "Secure SAP Fiori apps with proper authorizations, launchpad configuration, and OData service protection strategies.",
    icon: (
      <svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="60" cy="60" r="56" stroke="rgba(255,255,255,0.06)" strokeWidth="1.5"/>
        <rect x="28" y="30" width="64" height="44" rx="8" fill="rgba(238,94,66,0.08)" stroke="rgba(238,94,66,0.35)" strokeWidth="1.5"/>
        <rect x="34" y="36" width="52" height="32" rx="4" fill="rgba(255,255,255,0.03)" stroke="rgba(255,255,255,0.08)" strokeWidth="1"/>
        <circle cx="44" cy="52" r="7" fill="rgba(238,94,66,0.2)" stroke="rgba(238,94,66,0.5)" strokeWidth="1.5"/>
        <circle cx="60" cy="52" r="7" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.12)" strokeWidth="1.5"/>
        <circle cx="76" cy="52" r="7" fill="rgba(238,94,66,0.1)" stroke="rgba(238,94,66,0.3)" strokeWidth="1.5"/>
        <rect x="48" y="74" width="24" height="16" rx="3" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.1)" strokeWidth="1"/>
        <path d="M36 90h48" stroke="rgba(255,255,255,0.08)" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),
  },
  "sap-public-cloud": {
    description: "Navigate security in SAP's public cloud offerings — from role management to identity federation and compliance controls.",
    icon: (
      <svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="60" cy="60" r="56" stroke="rgba(255,255,255,0.06)" strokeWidth="1.5"/>
        <path d="M82 68a16 16 0 00-4-31 20 20 0 00-36 8 14 14 0 000 28z" fill="rgba(238,94,66,0.1)" stroke="rgba(238,94,66,0.4)" strokeWidth="1.5"/>
        <path d="M52 68v18M60 68v14M68 68v18" stroke="rgba(238,94,66,0.5)" strokeWidth="1.5" strokeLinecap="round"/>
        <path d="M44 86h32" stroke="rgba(238,94,66,0.3)" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),
  },
  "sap-sac-security": {
    description: "Secure SAP Analytics Cloud with governance, data access controls, and tenant security configuration best practices.",
    icon: (
      <svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="60" cy="60" r="56" stroke="rgba(255,255,255,0.06)" strokeWidth="1.5"/>
        <polyline points="28,85 45,60 60,70 78,42 92,55" fill="none" stroke="rgba(238,94,66,0.5)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <circle cx="45" cy="60" r="3.5" fill="rgba(238,94,66,0.7)"/>
        <circle cx="60" cy="70" r="3.5" fill="rgba(238,94,66,0.5)"/>
        <circle cx="78" cy="42" r="3.5" fill="rgba(238,94,66,0.7)"/>
        <path d="M28 35h64M28 35v58" stroke="rgba(255,255,255,0.08)" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),
  },
  "sap-cis": {
    description: "Explore SAP Cloud Identity Services — Identity Authentication Service and Identity Provisioning Service — and how to secure them.",
    icon: (
      <svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="60" cy="60" r="56" stroke="rgba(255,255,255,0.06)" strokeWidth="1.5"/>
        <circle cx="60" cy="50" r="14" fill="rgba(238,94,66,0.12)" stroke="rgba(238,94,66,0.45)" strokeWidth="1.5"/>
        <path d="M60 64c-16 0-26 8-26 16h52c0-8-10-16-26-16z" fill="rgba(238,94,66,0.08)" stroke="rgba(238,94,66,0.3)" strokeWidth="1.5"/>
        <circle cx="60" cy="50" r="5" fill="rgba(238,94,66,0.6)"/>
        <path d="M82 28 Q90 36 86 46" stroke="rgba(238,94,66,0.35)" strokeWidth="1.5" strokeLinecap="round"/>
        <path d="M38 28 Q30 36 34 46" stroke="rgba(238,94,66,0.35)" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),
  },
  "sap-access-control": {
    description: "Deep-dive into SAP Access Control — from role design and SoD conflict resolution to automated compliance and remediation.",
    icon: (
      <svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="60" cy="60" r="56" stroke="rgba(255,255,255,0.06)" strokeWidth="1.5"/>
        <path d="M42 56V46a18 18 0 0136 0v10" stroke="rgba(238,94,66,0.5)" strokeWidth="2" strokeLinecap="round"/>
        <rect x="36" y="56" width="48" height="32" rx="6" fill="rgba(238,94,66,0.1)" stroke="rgba(238,94,66,0.4)" strokeWidth="1.5"/>
        <circle cx="60" cy="72" r="6" fill="rgba(238,94,66,0.6)"/>
        <path d="M60 78v6" stroke="rgba(238,94,66,0.6)" strokeWidth="2" strokeLinecap="round"/>
      </svg>
    ),
  },
  "sap-process-control": {
    description: "Automate compliance and control monitoring in SAP Process Control with expert guidance on configuration and reporting.",
    icon: (
      <svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="60" cy="60" r="56" stroke="rgba(255,255,255,0.06)" strokeWidth="1.5"/>
        <rect x="30" y="30" width="60" height="60" rx="8" fill="rgba(238,94,66,0.07)" stroke="rgba(238,94,66,0.25)" strokeWidth="1.5"/>
        <path d="M42 50h36M42 60h28M42 70h20" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5" strokeLinecap="round"/>
        <circle cx="78" cy="70" r="10" fill="rgba(238,94,66,0.15)" stroke="rgba(238,94,66,0.5)" strokeWidth="1.5"/>
        <path d="M73 70l4 4 7-8" stroke="#ee5e42" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
  "sap-iag": {
    description: "Unlock SAP Identity and Access Governance for cloud-ready access management, role lifecycle, and audit compliance.",
    icon: (
      <svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="60" cy="60" r="56" stroke="rgba(255,255,255,0.06)" strokeWidth="1.5"/>
        <circle cx="42" cy="48" r="10" fill="rgba(238,94,66,0.1)" stroke="rgba(238,94,66,0.4)" strokeWidth="1.5"/>
        <circle cx="78" cy="48" r="10" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.12)" strokeWidth="1.5"/>
        <path d="M52 48h16" stroke="rgba(238,94,66,0.4)" strokeWidth="1.5" strokeLinecap="round"/>
        <path d="M30 76c0-8 5-14 12-14h36c7 0 12 6 12 14" fill="rgba(238,94,66,0.06)" stroke="rgba(238,94,66,0.25)" strokeWidth="1.5"/>
        <path d="M58 54v8M62 54v8" stroke="rgba(238,94,66,0.5)" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),
  },
  "sap-successfactors-security": {
    description: "Secure your SAP SuccessFactors HCM suite with permission roles, data privacy, and integration security best practices.",
    icon: (
      <svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="60" cy="60" r="56" stroke="rgba(255,255,255,0.06)" strokeWidth="1.5"/>
        <path d="M60 28l8 16 18 3-13 13 3 18-16-9-16 9 3-18L34 47l18-3z" fill="rgba(238,94,66,0.12)" stroke="rgba(238,94,66,0.45)" strokeWidth="1.5" strokeLinejoin="round"/>
        <path d="M60 38l5 10 11 2-8 8 2 11-10-6-10 6 2-11-8-8 11-2z" fill="rgba(238,94,66,0.25)"/>
        <path d="M36 82h48" stroke="rgba(255,255,255,0.06)" strokeWidth="1.5" strokeLinecap="round"/>
        <path d="M42 88h36" stroke="rgba(255,255,255,0.04)" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),
  },
  "sap-security-other": {
    description: "Explore broader SAP security topics — patches, audits, hardening guides, and cross-platform security considerations.",
    icon: (
      <svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="60" cy="60" r="56" stroke="rgba(255,255,255,0.06)" strokeWidth="1.5"/>
        <circle cx="60" cy="60" r="22" fill="rgba(238,94,66,0.08)" stroke="rgba(238,94,66,0.35)" strokeWidth="1.5"/>
        <path d="M60 38v6M60 76v6M38 60h6M76 60h6" stroke="rgba(238,94,66,0.45)" strokeWidth="2" strokeLinecap="round"/>
        <path d="M44.7 44.7l4.2 4.2M71.1 71.1l4.2 4.2M44.7 75.3l4.2-4.2M71.1 48.9l4.2-4.2" stroke="rgba(255,255,255,0.12)" strokeWidth="1.5" strokeLinecap="round"/>
        <circle cx="60" cy="60" r="7" fill="rgba(238,94,66,0.3)" stroke="rgba(238,94,66,0.6)" strokeWidth="1.5"/>
      </svg>
    ),
  },
  "expert-recommendations": {
    description: "Handpicked articles and insights curated by our SAP security experts — the must-reads for every SAP professional.",
    icon: (
      <svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="60" cy="60" r="56" stroke="rgba(255,255,255,0.06)" strokeWidth="1.5"/>
        <path d="M60 28l8 16 18 3-13 13 3 18-16-9-16 9 3-18L34 47l18-3z" fill="rgba(238,94,66,0.15)" stroke="rgba(238,94,66,0.5)" strokeWidth="1.5" strokeLinejoin="round"/>
        <circle cx="60" cy="56" r="8" fill="rgba(238,94,66,0.4)"/>
        <path d="M36 84h48M42 90h36" stroke="rgba(255,255,255,0.06)" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),
  },
  "product-reviews": {
    description: "Honest, in-depth reviews of SAP security tools, GRC platforms, and cybersecurity solutions from practitioners who use them.",
    icon: (
      <svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="60" cy="60" r="56" stroke="rgba(255,255,255,0.06)" strokeWidth="1.5"/>
        <rect x="30" y="34" width="60" height="52" rx="8" fill="rgba(238,94,66,0.08)" stroke="rgba(238,94,66,0.3)" strokeWidth="1.5"/>
        <path d="M42 52h36M42 62h24M42 72h16" stroke="rgba(255,255,255,0.12)" strokeWidth="1.5" strokeLinecap="round"/>
        <path d="M72 68l6 6-6 6" stroke="rgba(238,94,66,0.6)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <circle cx="81" cy="74" r="0" fill="none"/>
        <path d="M66 52l4 4-4 4" stroke="rgba(238,94,66,0.4)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
  "podcasts": {
    description: "Listen to conversations with SAP security leaders, GRC practitioners, and cybersecurity innovators shaping the industry.",
    icon: (
      <svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="60" cy="60" r="56" stroke="rgba(255,255,255,0.06)" strokeWidth="1.5"/>
        <rect x="50" y="28" width="20" height="36" rx="10" fill="rgba(238,94,66,0.12)" stroke="rgba(238,94,66,0.45)" strokeWidth="1.5"/>
        <path d="M38 58c0 12 10 22 22 22s22-10 22-22" stroke="rgba(238,94,66,0.5)" strokeWidth="2" strokeLinecap="round"/>
        <path d="M60 80v12M50 92h20" stroke="rgba(238,94,66,0.4)" strokeWidth="2" strokeLinecap="round"/>
        <circle cx="60" cy="46" r="4" fill="rgba(238,94,66,0.5)"/>
      </svg>
    ),
  },
  "videos": {
    description: "Watch expert-led video tutorials, walkthroughs, and webinars covering SAP security, GRC, and BTP security topics.",
    icon: (
      <svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="60" cy="60" r="56" stroke="rgba(255,255,255,0.06)" strokeWidth="1.5"/>
        <rect x="24" y="38" width="56" height="44" rx="8" fill="rgba(238,94,66,0.08)" stroke="rgba(238,94,66,0.3)" strokeWidth="1.5"/>
        <path d="M80 52l16-10v36l-16-10V52z" fill="rgba(238,94,66,0.12)" stroke="rgba(238,94,66,0.4)" strokeWidth="1.5" strokeLinejoin="round"/>
        <path d="M46 52l18 8-18 8V52z" fill="rgba(238,94,66,0.4)" stroke="rgba(238,94,66,0.6)" strokeWidth="1.5" strokeLinejoin="round"/>
      </svg>
    ),
  },
};

const DEFAULT_META = {
  description: "Explore expert articles, tutorials, and best practices from SAP Security professionals.",
  icon: (
    <svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="60" cy="60" r="56" stroke="rgba(255,255,255,0.06)" strokeWidth="1.5"/>
      <path d="M60 18L82 30V54C82 69 72 82 60 87C48 82 38 69 38 54V30L60 18Z" fill="rgba(238,94,66,0.12)" stroke="rgba(238,94,66,0.5)" strokeWidth="1.5"/>
      <path d="M52 60l6 6 12-12" stroke="#ee5e42" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
};

const CATEGORY_IMAGES = {
  "sap-security": "/assets/images/sap-security.png",
  "sap-cybersecurity": "/assets/images/sap-security-banner-illustration.png",
  "sap-grc": "/assets/images/sap-grc.png",
  "sap-btp-security": "/assets/images/sap-btp-security.png",
  "sap-s4hana-security": "/assets/images/sap-security.png",
  "sap-fiori-security": "/assets/images/sap-security-banner-illustration.png",
  "sap-public-cloud": "/assets/images/sap-btp-security.png",
  "sap-sac-security": "/assets/images/sap-grc.png",
  "sap-cis": "/assets/images/sap-btp-security.png",
  "sap-access-control": "/assets/images/sap-grc.png",
  "sap-process-control": "/assets/images/sap-grc.png",
  "sap-iag": "/assets/images/sap-grc.png",
  "sap-successfactors-security": "/assets/images/sap-security.png",
  "sap-security-other": "/assets/images/sap-security.png",
  "expert-recommendations": "/assets/images/sap-security.png",
  "product-reviews": "/assets/images/sap-grc.png",
  "podcasts": "/assets/images/sap-security-banner-illustration.png",
  "videos": "/assets/images/sap-security-banner-illustration.png"
};

const CategoryLayout = ({ categorySlug, displayName }) => {
  const meta = CATEGORY_META[categorySlug] || DEFAULT_META;
  const [blogs, setBlogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [communityStats, setCommunityStats] = useState({ members: null, comments: null });

  // Fetch blogs from API
  useEffect(() => {
    const fetchBlogsData = async () => {
      try {
        setLoading(true);
        const res = await getBlogs();
        if (Array.isArray(res.data)) {
          const cleaned = res.data.map((blog) => {
            let authorImg = blog.author_image ? blog.author_image.trim() : "";
            if (authorImg.toUpperCase() === "NULL" || authorImg === "") {
              authorImg = null;
            }
            return {
              ...blog,
              author_image: authorImg,
            };
          });
          setBlogs(cleaned);
        } else {
          setBlogs([]);
        }
      } catch (err) {
        console.error("Error fetching blogs:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchBlogsData();
  }, []);

  // Filter blogs by category slug
  const categoryBlogs = useMemo(() => {
    if (!blogs.length) return [];

    return blogs
      .filter((blog) => {
        // Date check for public scheduling - allow today (midnight local)
        const postDate = new Date(blog.date || blog.created_at);
        const now = new Date();
        const isLive = postDate.setHours(0,0,0,0) <= now.setHours(23,59,59,999);
        if (!isLive) return false;

        // Status safety check
        if (!['approved', 'published', 'active'].includes(blog.status)) return false;

        const secCats = Array.isArray(blog.secondary_categories)
          ? blog.secondary_categories
          : (() => { try { return JSON.parse(blog.secondary_categories || "[]"); } catch { return []; } })();

        // Parent category logic: sap-security shows its sub-categories AND itself
        if (categorySlug === "sap-security") {
          const sapSecGroup = ["sap-security", "sap-btp-security", "sap-public-cloud", "sap-fiori-security", "sap-s4hana-security"];
          return sapSecGroup.includes(blog.category) || sapSecGroup.some((s) => secCats.includes(s));
        }
        if (categorySlug === "sap-grc") {
          const grcGroup = ["sap-grc", "sap-access-control", "sap-process-control", "sap-iag"];
          return (
            grcGroup.includes(blog.category) ||
            grcGroup.includes(blog.subCategory) ||
            grcGroup.some((s) => secCats.includes(s))
          );
        }
        // Direct category, legacy subCategory, or secondary_categories match
        return (
          blog.category === categorySlug ||
          blog.subCategory === categorySlug ||
          secCats.includes(categorySlug)
        );
      })
      .sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [blogs, categorySlug]);

  // Fetch real community stats (members + total comments site-wide)
  useEffect(() => {
    getCommunityStats()
      .then((res) => {
        const data = res.data;
        if (data) {
          const fmt = (n) => {
            const v = parseInt(n) || 0;
            return v >= 1000 ? (v / 1000).toFixed(1).replace(/\.0$/, "") + "K+" : String(v);
          };
          setCommunityStats({
            members: fmt(data.total_members),
            comments: fmt(data.total_comments),
          });
        }
      })
      .catch(() => {});
  }, []);

  // Derive per-category stats directly from loaded blogs — no fake offsets
  const categoryArticleCount = categoryBlogs.length;
  const categoryContributorCount = useMemo(
    () => new Set(categoryBlogs.map((b) => b.author_name).filter(Boolean)).size,
    [categoryBlogs]
  );

  return (
    <div className="category-page-wrapper">
      {/* Header */}
      <div className="cat-hero">
        <div className="container">
          <nav className="blog-breadcrumb cat-hero-breadcrumb" aria-label="Breadcrumb">
            <Link to="/" className="breadcrumb-link">Home</Link>
            <span className="breadcrumb-sep"><i className="bi bi-chevron-right" /></span>
            <span className="breadcrumb-current">{displayName}</span>
          </nav>
          
          <div className="cat-hero-inner">
            <div className="cat-hero-text">
              <h1 className="cat-hero-title">{displayName.toUpperCase()}</h1>
              <p className="cat-hero-desc">{meta.description}</p>
              
              <div className="cat-stats-row">
                <div className="cat-stat-item">
                  <div className="cat-stat-icon-wrap">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                    </svg>
                  </div>
                  <div className="cat-stat-info">
                    <span className="cat-stat-number">{loading ? "—" : categoryArticleCount}</span>
                    <span className="cat-stat-label">Articles</span>
                  </div>
                </div>
                
                <div className="cat-stat-divider"></div>
                
                <div className="cat-stat-item">
                  <div className="cat-stat-icon-wrap">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                      <path d="m9 11 2 2 4-4" />
                    </svg>
                  </div>
                  <div className="cat-stat-info">
                    <span className="cat-stat-number">{loading ? "—" : categoryContributorCount}</span>
                    <span className="cat-stat-label">Expert Contributors</span>
                  </div>
                </div>
                
                <div className="cat-stat-divider"></div>
                
                <div className="cat-stat-item">
                  <div className="cat-stat-icon-wrap">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                      <circle cx="9" cy="7" r="4" />
                      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                    </svg>
                  </div>
                  <div className="cat-stat-info">
                    <span className="cat-stat-number">{communityStats.members || "—"}</span>
                    <span className="cat-stat-label">Community Members</span>
                  </div>
                </div>
                
                <div className="cat-stat-divider"></div>
                
                <div className="cat-stat-item">
                  <div className="cat-stat-icon-wrap">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                    </svg>
                  </div>
                  <div className="cat-stat-info">
                    <span className="cat-stat-number">{communityStats.comments || "—"}</span>
                    <span className="cat-stat-label">Discussions</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="cat-hero-illustration-new">
              <img src={CATEGORY_IMAGES[categorySlug] || "/assets/images/sap-security.png"} alt={displayName} />
            </div>
          </div>
        </div>
      </div>

      <div className="category-content container">
        <div className="category-layout-grid">
          {/* Main Content: Blog Grid */}
          <div className="category-main-column">
            {loading ? (
              <div className="loading-state">
                <p>Loading blogs...</p>
              </div>
            ) : error ? (
              <div className="error-state">
                <p>Error loading blogs: {error}</p>
                <Link to="/" className="btn-primary">
                  Go Home
                </Link>
              </div>
            ) : categoryBlogs.length === 0 ? (
              <div className="no-posts">
                <p className="no-posts-text">
                  No posts found in this category.
                </p>
                <Link to="/" className="btn-primary go-home-btn">
                  Go Home
                </Link>
              </div>
            ) : (
              <div className="blog-grid-2-col">
                {categoryBlogs.map((blog) => (
                  <div key={blog.id} className="blog-grid-card">
                    <div className="blog-card-image">
                      <Link to={`/${blog.category}/${blog.slug}`}>
                        <Image
                          src={
                            blog.image ||
                            "https://placehold.co/600x400?text=No+Image"
                          }
                          alt={blog.title}
                          fill
                          sizes="(max-width: 768px) 100vw, 300px"
                          style={{ objectFit: 'cover' }}
                        />
                        {blog.is_premium == 1 && (
                          <div className="exclusive-badge" style={{ background: "#d97706" }}>
                            <i className="bi bi-star-fill"></i> Paid Article
                          </div>
                        )}
                        {blog.is_members_only == 1 && blog.is_premium != 1 && (
                          <div className="exclusive-badge">
                            <i className="bi bi-lock-fill"></i> Exclusive
                          </div>
                        )}
                      </Link>
                    </div>
                    <div className="blog-card-content">
                      <div className="blog-meta-top">
                        <span
                          className="blog-author"
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                          }}
                        >
                          {blog.author_image ? (
                            <Image
                              src={blog.author_image}
                              alt={blog.author_name || blog.author}
                              width={24}
                              height={24}
                              style={{
                                borderRadius: "50%",
                                objectFit: "cover",
                                border: "1px solid #e2e8f0",
                                flexShrink: 0,
                              }}
                              onError={(e) => {
                                e.currentTarget.src =
                                  "https://placehold.co/100x100?text=Author";
                              }}
                            />
                          ) : (
                            <i className="bi bi-person-circle"></i>
                          )}
                          {blog.author_name || "Guest Author"}
                        </span>
                        <span className="blog-date">
                          <i className="bi bi-calendar3"></i>{" "}
                          {(() => {
                            const d = new Date(blog.date);
                            return isNaN(d.getTime())
                              ? blog.date
                              : d.toLocaleDateString("en-US", {
                                  month: "long",
                                  day: "numeric",
                                  year: "numeric",
                                });
                          })()}
                        </span>
                      </div>

                      <Link
                        to={`/${blog.category}/${blog.slug}`}
                        className="blog-title-link"
                      >
                        <h3>{blog.title}</h3>
                      </Link>

                      {blog.excerpt && (
                        <p className="blog-excerpt">{blog.excerpt}</p>
                      )}

                      <Link
                        to={`/${blog.category}/${blog.slug}`}
                        className="read-more-link"
                      >
                        Read More &rarr;
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="category-sidebar-column">
            <BlogSidebar />
          </div>
        </div>
      </div>
    </div>
  );
};

export default CategoryLayout;
