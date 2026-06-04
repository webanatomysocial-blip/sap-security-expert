import React from "react";
import LegalLayout from "../../components/LegalLayout";

const TermsConditions = () => {
  return (
    <LegalLayout title="Terms & Conditions">
      <p style={{ color: "#666", marginBottom: "40px" }}>
        Last Updated:{" "}
        {new Date().toLocaleDateString("en-US", {
          month: "long",
          day: "numeric",
          year: "numeric",
        })}
      </p>

      <section>
        <h3>Use of Website and Services</h3>
        <p>
          You may use the Website solely for lawful purposes and in accordance
          with these Terms. You agree not to misuse the Website or Services in a
          manner that could damage, disable, overburden, or impair SAP Security
          Expert’s systems, security posture, or intellectual property. Any
          attempt to gain unauthorized access, introduce malicious code,
          interfere with system operations, or misrepresent affiliation with SAP
          Security Expert is strictly prohibited.
        </p>
        <p>
          SAP Security Expert reserves the right to suspend or restrict access
          to the Website or Services where continued use poses legal, security,
          or compliance risks.
        </p>
      </section>

      <section>
        <h3>Services and Contractual Relationship</h3>
        <p>
          SAP Security Expert provides enterprise technology services including
          SAP Security and GRC solutions, automation and analytics platforms,
          AI-enabled products, cybersecurity and data protection solutions, as
          well as consulting, implementation, managed services, and support in
          SAP and other technologies.
        </p>
        <p>
          The information provided on this Website is for general informational
          purposes only and does not constitute a binding commercial offer. Any
          engagement for Services shall be governed by written agreements such
          as a Master Services Agreement, Statement of Work, Data Processing
          Agreement, or other enterprise procurement documents executed between
          SAP Security Expert and the client. In the event of any inconsistency,
          the terms of such written agreements shall prevail over these Website
          Terms.
        </p>
      </section>

      <section>
        <h3>Intellectual Property</h3>
        <p>
          All content, software, designs, methodologies, trademarks, logos,
          documentation, and other materials made available through the Website
          or Services are the exclusive intellectual property of SAP Security
          Expert or its licensors. Nothing in these Terms grants you ownership
          or any proprietary interest in such intellectual property.
        </p>
        <p>
          Subject to contractual agreement, clients are granted a limited,
          non-exclusive, non-transferable right to use deliverables solely for
          their internal business purposes. Any copying, modification, reverse
          engineering, resale, sublicensing, or creation of derivative works
          without prior written consent is prohibited.
        </p>
      </section>

      <section>
        <h3>Data Protection and Privacy</h3>
        <p>
          SAP Security Expert is committed to protecting personal data and
          processes information in accordance with applicable global data
          protection and privacy laws, including the General Data Protection
          Regulation (GDPR), UK GDPR, the Digital Personal Data Protection Act
          (India), the Singapore PDPA, and relevant United States privacy
          regulations where applicable.
        </p>
        <p>
          Depending on the nature of the engagement, SAP Security Expert may act
          as a data processor, service provider, or data controller. Personal
          data is processed only for lawful purposes, based on contractual
          necessity, legal obligation, legitimate business interest, or consent
          where required. We implement reasonable technical and organizational
          safeguards designed to protect data against unauthorized access, loss,
          or misuse; however, no system can guarantee absolute security.
        </p>
        <p>
          Where required, SAP Security Expert supports data subject rights,
          including access, correction, deletion, restriction, objection, and
          grievance redressal, in accordance with applicable law. In the event
          of a confirmed personal data breach, we will notify affected clients
          without undue delay and provide reasonable cooperation to support
          regulatory or statutory obligations.
        </p>
        <p>
          Cross-border data transfers, where applicable, are conducted using
          legally recognized transfer mechanisms and safeguards.
        </p>
        <p>
          Further details regarding personal data processing are available in
          our Privacy Policy and applicable Data Processing Agreements.
        </p>
      </section>

      <section>
        <h3>Third Parties and Subcontractors</h3>
        <p>
          SAP Security Expert may engage affiliates or third-party service
          providers to support delivery of the Services. We remain responsible
          for ensuring that such parties are contractually bound to appropriate
          confidentiality, security, and data protection obligations consistent
          with these Terms and applicable law.
        </p>
        <p>
          The Website may contain links to third-party websites or resources.
          SAP Security Expert does not control or endorse such third-party
          content and is not responsible for their practices.
        </p>
      </section>

      <section>
        <h3>Contact Information</h3>
        <p>
          For any inquiries regarding these Terms, please contact us at{" "}
          <a className="legal-links" href="mailto:hello@sap.kaphi.in">
            hello@sap.kaphi.in
          </a>
        </p>
        <p>
          Official Website:{" "}
          <a className="legal-links" href="https://sap.kaphi.in">
            sap.kaphi.in
          </a>
          .
        </p>
      </section>
    </LegalLayout>
  );
};

export default TermsConditions;
