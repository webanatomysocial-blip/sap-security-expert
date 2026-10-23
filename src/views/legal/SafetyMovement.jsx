import React from "react";
import SEO from "../../components/SEO";
import { VITE_SITE_URL } from "../../utils/env";
import LegalLayout from "../../components/LegalLayout";

const SafetyMovement = () => {
  return (
    <LegalLayout title="Safety Movement">
      <SEO
        title="SAP Security Expert Safety Movement — Our Commitment to a Safe, Inclusive Community"
        description="Learn about the SAP Security Expert Safety Movement and our commitment to creating a safe, respectful, and inclusive environment for SAP Security practitioners worldwide."
        url={`${VITE_SITE_URL}/safety-movement`}
      />
      <p style={{ color: "#666", marginBottom: "40px" }}>
        Because a safe workplace is a strong workplace.
      </p>

      <section>
        <h3>A Commitment to Safety</h3>
        <p>
          At SAP Security Expert, we believe innovation can only thrive in an
          environment where people feel safe, valued, and supported, both
          physically and emotionally. Our Safety Movement is a community-wide
          commitment to creating a secure, inclusive, and respectful workplace
          for every team member and professional.
        </p>
      </section>

      <section>
        <h3>Safety isn’t a protocol: it’s a promise.</h3>
        <p>
          As your trusted partner for SAP Security and GRC, we help enterprises
          modernize with confidence. We build for scalability, compliance, and
          growth, ensuring that safety is embedded in every layer of your
          digital transformation.
        </p>
        <p>
          We advocate for robust security practices not just in technology, but
          in the culture of the organizations we serve.
        </p>
      </section>

      <section>
        <h3>Join the Movement</h3>
        <p>
          Explore our resources on SAP Security, GRC, and Cybersecurity to see
          how we are contributing to a safer digital world.
        </p>
      </section>
    </LegalLayout>
  );
};

export default SafetyMovement;
