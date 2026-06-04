import React from "react";
import LegalLayout from "../../components/LegalLayout";

const ResponsibleAi = () => {
  return (
    <LegalLayout title="Responsible AI & Automation Statement">
      <p style={{ color: "#666", marginBottom: "40px" }}>
        Last updated:{" "}
        {new Date().toLocaleDateString("en-US", {
          month: "long",
          day: "numeric",
          year: "numeric",
        })}
      </p>

      <section>
        <h3>Purpose and Scope</h3>
        <p>
          This statement applies to AI-enabled features, analytics, automation
          frameworks, and intelligent decision-support capabilities developed or
          delivered by SAP Security Expert. It is intended to provide
          transparency to customers, partners, and stakeholders regarding how AI
          and automation are designed, governed, and applied within our
          solutions.
        </p>
      </section>

      <section>
        <h3>Human-Centric Design</h3>
        <p>
          SAP Security Expert follows a human-in-the-loop approach. AI and
          automation are used to assist, augment, and accelerate
          decision-making, not to make irreversible or material decisions
          without appropriate human oversight. Final accountability for
          business, compliance, and risk decisions remains with the customer.
        </p>
      </section>

      <section>
        <h3>Contact</h3>
        <p>
          For inquiries regarding Responsible AI, please contact{" "}
          <a className="legal-links" href="mailto:hello@sapsecurityexpert.com">
            hello@sapsecurityexpert.com
          </a>
          .
        </p>
      </section>
    </LegalLayout>
  );
};

export default ResponsibleAi;
