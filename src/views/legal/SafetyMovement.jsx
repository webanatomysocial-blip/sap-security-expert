import React from "react";
import LegalLayout from "../../components/LegalLayout";

const SafetyMovement = () => {
  return (
    <LegalLayout title="Safety Movement">
      <p style={{ color: "#666", marginBottom: "40px" }}>
        Because a safe workplace is a strong workplace.
      </p>

      <section>
        <h3>A Commitment to Safety</h3>
        <p>
          At SAP Security Expert, we believe innovation can only thrive in an
          environment where people feel safe, valued, and supported — both
          physically and emotionally. Our Safety Movement is a community-wide
          commitment to creating a secure, inclusive, and respectful workplace
          for every team member and professional.
        </p>
      </section>

      <section>
        <h3>Safety isn’t a protocol — it’s a promise.</h3>
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
