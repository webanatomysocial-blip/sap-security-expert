import React from "react";
import LegalLayout from "../../components/LegalLayout";

const PrivacyPolicy = () => {
  return (
    <LegalLayout title="Privacy & Cookie Policy">
      <p style={{ color: "#666", marginBottom: "40px" }}>
        Last Updated:{" "}
        {new Date().toLocaleDateString("en-US", {
          month: "long",
          day: "numeric",
          year: "numeric",
        })}
      </p>

      <section>
        <h3>Personal Data We Collect</h3>
        <p>
          We collect personal data that you voluntarily provide, such as your
          name, business email address, phone number, organization, job title,
          country, and any information submitted through forms or
          communications. We may also collect technical data, including IP
          address, browser type, device information, pages visited, and usage
          patterns, collected automatically when you interact with our Website.
        </p>
        <p>
          We do not knowingly collect sensitive personal data or information
          relating to children.
        </p>
      </section>

      <section>
        <h3>How We Use Personal Data</h3>
        <p>
          Personal data is used to respond to inquiries, provide requested
          content or services, manage client and prospect relationships, send
          relevant communications, improve our Website and offerings, comply
          with legal obligations, and protect the security and integrity of our
          systems. We do not sell personal data.
        </p>
      </section>

      <section>
        <h3>Cookies and Similar Technologies</h3>
        <p>
          Our Website uses cookies and similar technologies to ensure
          functionality, enhance user experience, analyze Website performance,
          and support marketing activities.
        </p>
        <p>
          Cookies are small text files placed on your device when you visit a
          website. Some cookies are essential for the Website to function
          properly, while others help us understand how visitors interact with
          the Website or support marketing and analytics activities.
        </p>
        <p>
          Where required by law, we obtain consent before placing non-essential
          cookies. You may manage or disable cookies through your browser
          settings. Please note that disabling certain cookies may affect
          Website functionality.
        </p>
      </section>

      <section>
        <h3>Types of Cookies Used</h3>
        <p>
          We may use a combination of essential cookies (required for Website
          operation), performance and analytics cookies (to understand Website
          usage and improve performance), and marketing or advertising cookies
          (to support communications and measure campaign effectiveness).
          Third-party service providers may place cookies on our behalf, subject
          to appropriate safeguards.
        </p>
      </section>

      <section>
        <h3>Data Sharing and Disclosure</h3>
        <p>
          Personal data may be shared with SAP Security Expert affiliates and
          trusted third-party service providers who assist with Website hosting,
          analytics, communications, marketing platforms, CRM systems, and
          service delivery. Such parties are contractually obligated to protect
          personal data and use it only for authorized purposes.
        </p>
        <p>
          Personal data may also be disclosed where required by law, regulation,
          legal process, or to protect SAP Security Expert’s rights and
          interests.
        </p>
      </section>

      <section>
        <h3>Your Rights</h3>
        <p>
          Depending on your jurisdiction, you may have rights to access,
          correct, delete, restrict, or object to the processing of your
          personal data, as well as rights related to data portability, consent
          withdrawal, and grievance redressal. Requests will be handled in
          accordance with applicable law and within required timelines.
        </p>
      </section>

      <section>
        <h3>Account Deletion and Data Retention</h3>
        <p>
          Users may request deletion of their account and associated personal
          data at any time through their{" "}
          <button
            onClick={() => {
              const event = new CustomEvent("open-profile-settings");
              window.dispatchEvent(event);
            }}
            style={{
              background: "none",
              border: "none",
              color: "#ee5e42",
              padding: 0,
              font: "inherit",
              cursor: "pointer",
              textDecoration: "underline",
            }}
          >
            Account Settings
          </button>
          , where available, or by contacting us at{" "}
          <a className="legal-links" href="mailto:hello@sap.webanatomy.in">
            hello@sap.webanatomy.in
          </a>
          .
        </p>
        <p>
          Upon receiving a valid request, SAP Security Expert will disable
          access to the account and initiate deletion of personal data within a
          reasonable timeframe, in accordance with applicable legal and
          regulatory requirements.
        </p>
        <p>
          Certain information may be retained for a limited period where
          required for compliance with legal obligations, dispute resolution,
          fraud prevention, or enforcement of agreements.
        </p>
        <p>
          Once the retention period expires, such data will be securely deleted
          or anonymized.
        </p>
      </section>

      <section>
        <h3>Data Breach Notification</h3>
        <p>
          In the event of a confirmed personal data breach, SAP Security Expert
          will take appropriate remedial action and notify affected parties and
          authorities as required by applicable law.
        </p>
      </section>

      <section>
        <h3>Contact</h3>
        <p>
          For privacy, data protection, or account-related requests (including
          data access or deletion), please contact us at{" "}
          <a className="legal-links" href="mailto:hello@sap.webanatomy.in">
            hello@sap.webanatomy.in
          </a>
        </p>
      </section>
    </LegalLayout>
  );
};

export default PrivacyPolicy;
