import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
// next-disabled: import "../css/BecomeContributor.css";
import { Helmet } from "react-helmet-async";

const BecomeContributor = () => {
  const navigate = useNavigate();
  const [selectedRoleIndex, setSelectedRoleIndex] = useState(null);

  const roles = [
    {
      title: "LinkedIn Page & Community Engagement Manager",
      count: "2 (max)",
      commitment: "~2–3 hours per week",
      description:
        "Create and post engaging LinkedIn content, write impactful scripts, share posts in relevant groups, and grow reach organically.",
      howTo: [
        "Create and post engaging LinkedIn content based on newly published articles on sapsecurityexpert.com",
        "Write short, impactful post scripts with the right industry hooks and hashtags",
        "Share posts in relevant SAP Security, GRC, Audit, and Cybersecurity LinkedIn groups",
        "Help grow reach, engagement, and followers organically",
      ],
      idealFor:
        "Professionals who enjoy content amplification, community building, and thought leadership positioning.",
    },
    {
      title: "Useful Tools & Solutions Research Contributor",
      count: "2 (max)",
      description:
        "Identify SAP Security, GRC, Audit, or Compliance tools that bring real practitioner value.",
      howTo: [
        "Identify SAP Security, GRC, Audit, or Compliance tools that bring real practitioner value",
        "Understand the tool’s purpose, use cases, and differentiation",
        "Coordinate with the tool’s developer/company (vendor-neutral engagement)",
        "Publish an article, overview, or short video on the platform",
        "Ensure clear community disclaimer (non-promotional, informational content)",
      ],
      idealFor:
        "Consultants, analysts, and solution architects with strong evaluation skills.",
    },
    {
      title: "Social Media Channel Management (Multi-Platform)",
      count: "1 (max)",
      description:
        "Manage and publish content across platforms like LinkedIn, X (Twitter), and YouTube.",
      howTo: [
        "Manage and publish content across platforms like LinkedIn, X (Twitter), and YouTube",
        "Repurpose blogs into short posts, visuals, reels, or threads",
        "Maintain consistent community voice and posting cadence",
      ],
      idealFor:
        "Digital-savvy professionals who enjoy reach, storytelling, and engagement.",
    },
    {
      title: "Blog & Article Authors (Core Knowledge Contributors)",
      count: "10 (max)",
      description:
        "Write original blogs, tutorials, opinions, or deep-dives on SAP Security and related topics.",
      howTo: [
        "Write original blogs, tutorials, opinions, or deep-dives on SAP Security, SAP GRC, Audit automation, Compliance, etc.",
        "Share real-world experiences, lessons learned, or implementation insights",
      ],
      idealFor:
        "Practitioners who want to build credibility, visibility, and thought leadership.",
    },
    {
      title: "Podcast Creation & Publishing Support",
      count: "2 (max)",
      frequency: "1 podcast per month",
      description:
        "Assist in identifying industry leaders, coordinating scheduling, and helping with recording/editing.",
      howTo: [
        "Assist in identifying industry leaders, experts, and influencers",
        "Coordinate scheduling and content flow",
        "Help with recording, editing, publishing, and promotion",
        "Support episode summaries and highlights for social media",
      ],
      idealFor:
        "Those interested in storytelling, networking, and industry conversations.",
    },
    {
      title: "Product Review & Practitioner Analysis Contributor",
      count: "2 (max)",
      description:
        "Conduct detailed discussions with product development teams and publish vendor-neutral reviews.",
      howTo: [
        "Conduct detailed discussions with product development teams",
        "Gather functional, technical, and roadmap insights",
        "Publish vendor-neutral, practitioner-focused reviews",
        "Highlight strengths, limitations, and ideal use cases",
        "Ensure transparency and community-first disclosure",
      ],
      idealFor:
        "Senior consultants, auditors, and architects with evaluation experience.",
    },
    {
      title: "Community Moderation & Knowledge Curation",
      count: "2 (max)",
      description:
        "Review submitted content for relevance and quality, and help curate featured articles.",
      howTo: [
        "Review submitted content for relevance and quality",
        "Help curate featured articles or monthly highlights",
        "Assist in maintaining community standards and neutrality",
      ],
      idealFor:
        "Experienced professionals who want to shape industry conversations.",
    },
    {
      title: "Local Community Champion (Regional Lead)",
      count: "2 (max per region)",
      note: "Starting 5 regions as a pilot",
      description:
        "Act as a regional point of contact and promote community initiatives within your local geography.",
      howTo: [
        "Act as a regional point of contact for the SAP Security Expert community",
        "Promote community initiatives within your local geography (country / city / region)",
        "Encourage practitioners to contribute articles, case studies, and insights",
        "Support local meetups, roundtables, webinars, or virtual discussions (where feasible)",
        "Help surface region-specific challenges, trends, and regulatory perspectives",
      ],
      idealFor:
        "Senior practitioners and community-minded leaders who want to strengthen SAP Security & GRC collaboration in their local ecosystem.",
    },
    {
      title: "Community Manager (Global)",
      count: "2 (max)",
      description:
        "Act as the central coordination point for all contributors and community roles.",
      howTo: [
        "Act as the central coordination point for all contributors and community roles",
        "Onboard, guide, and support contributors across content, social, tools, and podcasts",
        "Define contribution guidelines, quality standards, and publishing cadence",
        "Coordinate content calendars across the website, LinkedIn, podcasts, and other channels",
        "Ensure consistency in tone, neutrality, and community-first principles",
        "Work closely with Local Community Champions to align regional and global initiatives",
      ],
      idealFor:
        "Highly organized professionals with strong leadership, communication, and ecosystem-building skills who want to shape and scale a global SAP Security & GRC community.",
    },
  ];

  const handleApplyNow = () => {
    if (selectedRoleIndex === null) return;
    const roleTitle = roles[selectedRoleIndex].title;
    navigate("/apply-contributor", { state: { role: roleTitle } });
  };

  return (
    <div className="become-contributor-page">
      <Helmet>
        <title>Become a Contributor | SAP Security Expert</title>
      </Helmet>

      {/* HERO SECTION */}
      <section className="contributor-hero">
        <div className="container">
          <h1>
            Join the SAP Security Expert Community as a Contributor / Volunteer
          </h1>
          <p className="hero-subtitle">
            SAP Security Expert (sapsecurityexpert.com) is a non-profit,
            vendor-neutral community built by practitioners, for practitioners
            in the SAP Security, GRC, and Risk & Compliance space.
          </p>
          <p className="hero-description">
            We’re inviting passionate professionals, consultants, and
            enthusiasts to contribute their time, skills, and expertise to help
            grow this global knowledge platform. Contributions are flexible,
            impactful, and recognition-driven - not commercial.
          </p>
        </div>
      </section>

      {/* ROLES SELECTOR SECTION */}
      <section className="roles-section">
        <div className="container">
          <h2>Ways You Can Contribute</h2>
          <p className="section-intro">
            Choose your area of interest and we will map accordingly.
          </p>

          <div className="role-selector-container">
            <div className="role-dropdown-wrapper">
              <label htmlFor="role-select">Select a Contributor Role:</label>
              <select
                id="role-select"
                className="role-dropdown"
                value={selectedRoleIndex === null ? "" : selectedRoleIndex}
                onChange={(e) => {
                  const val = e.target.value;
                  setSelectedRoleIndex(val === "" ? null : Number(val));
                }}
              >
                <option value="" disabled>
                  Select a Role...
                </option>
                {roles.map((role, index) => (
                  <option key={index} value={index}>
                    {role.title}
                  </option>
                ))}
              </select>
            </div>

            {selectedRoleIndex !== null && (
              <div className="role-details-card">
                <h3>{roles[selectedRoleIndex].title}</h3>

                <div className="role-meta">
                  {roles[selectedRoleIndex].count && (
                    <span className="meta-badge">
                      <i className="bi bi-people-fill"></i>{" "}
                      {roles[selectedRoleIndex].count}
                    </span>
                  )}
                  {roles[selectedRoleIndex].commitment && (
                    <span className="meta-badge">
                      <i className="bi bi-clock-fill"></i>{" "}
                      {roles[selectedRoleIndex].commitment}
                    </span>
                  )}
                  {roles[selectedRoleIndex].frequency && (
                    <span className="meta-badge">
                      <i className="bi bi-calendar-event-fill"></i>{" "}
                      {roles[selectedRoleIndex].frequency}
                    </span>
                  )}
                </div>

                <div className="role-content-split">
                  <div className="role-how-to">
                    <h4>How you contribute:</h4>
                    <ul>
                      {roles[selectedRoleIndex].howTo.map((item, idx) => (
                        <li key={idx}>{item}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="role-ideal-for">
                    <h4>Ideal for:</h4>
                    <p>{roles[selectedRoleIndex].idealFor}</p>
                  </div>
                </div>

                <div className="role-action">
                  <button onClick={handleApplyNow} className="btn-apply-role">
                    Apply for this Role
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* WHY CONTRIBUTE SECTION */}
      <section className="why-contribute-section">
        <div className="container">
          <h2>Why Contribute?</h2>
          <div className="benefits-grid">
            <div className="benefit-card">
              <i className="bi bi-star-fill"></i>
              <p>Build industry visibility & credibility</p>
            </div>
            <div className="benefit-card">
              <i className="bi bi-award-fill"></i>
              <p>Get recognized as a community contributor / author</p>
            </div>
            <div className="benefit-card">
              <i className="bi bi-globe"></i>
              <p>Expand your professional network globally</p>
            </div>
            <div className="benefit-card">
              <i className="bi bi-heart-fill"></i>
              <p>Give back to the SAP Security & GRC ecosystem</p>
            </div>
            <div className="benefit-card">
              <i className="bi bi-book-fill"></i>
              <p>Be part of the upcoming publications/books</p>
            </div>
            <div className="benefit-card">
              <i className="bi bi-shield-check"></i>
              <p>Be part of a trusted, non-commercial knowledge movement</p>
            </div>
          </div>
          <p className="closing-note">
            You don’t need to do everything—even one area of contribution makes
            a difference.
          </p>
        </div>
      </section>
    </div>
  );
};

export default BecomeContributor;
