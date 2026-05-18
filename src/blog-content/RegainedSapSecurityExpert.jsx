import React from "react";
import BlogLayout from "../components/BlogLayout";
import featuredImage from "../assets/blogs/regained-sap-security-expert.jpg";

const RegainedSapSecurityExpert = () => {
  return (
    <BlogLayout
      category="SAP GRC"
      title="Regained SAP Security Expert!"
      date="January 5, 2026"
      author="Raghu Boddu"
      image={featuredImage}
      description="We regained our domain! sapsecurityexpert.com is back. Read about our journey and what to expect from the community moving forward."
      content={
        <>
          <p>
            After a long and unexpected hiatus, SAP Security Expert is finally
            back home.
          </p>
          <p>
            This platform began in 2005 as a space to share practical SAP
            Security and SAP GRC knowledge—grounded in real implementations,
            audit realities, and lessons learned in the field. Over time, it
            became a trusted reference for SAP practitioners, consultants, and
            auditors.
          </p>
          <p>
            Life happened. The domain was lost. The content went silent. But the
            purpose never changed.
          </p>
          <p>
            Today, I’m reclaiming this space—not as a fresh start, but as a
            continuation of the journey.
          </p>
          <p>
            In the coming weeks, I will be adding new and original content,
            including:
          </p>
          <ul>
            <li>SAP GRC & SAP Security deep dives</li>
            <li>SAP BTP security architecture and controls</li>
            <li>SAP IAG (Identity Access Governance) insights</li>
            <li>SAP Public Cloud security and governance considerations</li>
            <li>Practical guidance drawn from real-world programs</li>
          </ul>
          <p>
            In addition, this platform will host podcasts and
            conversations—featuring my perspectives as well as insights from
            eminent practitioners and speakers across the SAP security and
            governance ecosystem.
          </p>
          <p>This is not a restart. It’s a regain.</p>
        </>
      }
    />
  );
};

export default RegainedSapSecurityExpert;
