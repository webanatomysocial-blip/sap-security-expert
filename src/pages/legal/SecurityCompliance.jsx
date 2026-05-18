import React from "react";
import LegalLayout from "../../components/LegalLayout";

const SecurityCompliance = () => {
  return (
    <LegalLayout title="Security & Compliance Overview">
      <p style={{ color: "#666", marginBottom: "40px" }}>
        Security and compliance are foundational to how we design, build, and
        operate.
      </p>

      <section>
        <h3>Our Security Philosophy</h3>
        <p>
          SAP Security Expert follows a security-by-design and
          compliance-by-default approach. Security considerations are embedded
          across the entire solution lifecycle – from architecture and
          development to deployment, operations, and support. Our controls are
          designed to reduce risk, support regulatory compliance, and align with
          enterprise governance expectations.
        </p>
      </section>

      <section>
        <h3>Information Security Governance</h3>
        <p>
          We maintain internal security governance structures that define
          accountability for information security, risk management, and
          compliance. Security policies and procedures are reviewed periodically
          and updated to reflect evolving threats, regulatory requirements, and
          industry best practices.
        </p>
        <p>
          Access to systems and data is granted strictly on a need-to-know
          basis, supported by role-based access controls and segregation of
          duties.
        </p>
      </section>

      <section>
        <h3>Secure Development and Engineering Practices</h3>
        <p>
          Security is integrated into our development lifecycle. This includes
          secure coding standards, controlled use of third-party components,
          environment segregation, and review processes designed to identify and
          mitigate security risks early.
        </p>
        <p>
          Changes to production systems follow defined approval and deployment
          procedures to maintain stability, traceability, and integrity.
        </p>
      </section>

      <section>
        <h3>Data Protection and Privacy Controls</h3>
        <p>
          We process data in accordance with applicable global data protection
          laws, including GDPR, UK GDPR, DPDPA (India), Singapore PDPA, and
          relevant US privacy regulations.
        </p>
        <p>
          We apply appropriate safeguards to protect data confidentiality,
          integrity, and availability. Personal and customer data is processed
          only for legitimate business purposes and in accordance with
          contractual obligations.
        </p>
      </section>

      <section>
        <h3>Monitoring, Logging, and Incident Management</h3>
        <p>
          We implement logging and monitoring mechanisms appropriate to the
          nature of our solutions to support operational visibility and security
          oversight. Security incidents are handled through defined response
          procedures designed to assess impact, contain risk, and support timely
          remediation.
        </p>
        <p>
          In the event of a confirmed data breach, we follow established
          notification and cooperation obligations as required by applicable law
          and contractual commitments.
        </p>
      </section>

      <section>
        <h3>Third-Party and Sub processor Management</h3>
        <p>
          We may engage trusted third-party service providers or sub processors
          to support service delivery. Such parties are subject to contractual
          security, confidentiality, and data protection obligations aligned
          with our own standards.
        </p>
        <p>
          We remain accountable for the security and compliance posture of
          services delivered through approved sub processors.
        </p>
      </section>

      <section>
        <h3>Contact</h3>
        <p>
          For security and compliance enquiries, please contact{" "}
          <a className="legal-links" href="mailto:hello@sapsecurityexpert.com">
            hello@sapsecurityexpert.com
          </a>
          .
        </p>
      </section>
    </LegalLayout>
  );
};

export default SecurityCompliance;
