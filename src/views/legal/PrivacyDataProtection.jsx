import React from "react";
import { Link } from "react-router-dom";
import LegalLayout from "../../components/LegalLayout";

const PrivacyDataProtection = () => {
  return (
    <LegalLayout title="Your Rights &amp; Data Privacy">
      <p style={{ color: "#666", marginBottom: "40px" }}>Last Updated: 28 Aug 2026</p>

      <section>
        <p>
          At SAP Security Expert we believe that being a member of a professional
          community should not mean giving up control of your personal information.
        </p>
        <p>
          Whether you are a member, contributor, podcast guest, learner, visitor or
          simply someone who has interacted with our platform, you should know what
          information we hold about you, why we use it and how you can ask us to
          change it or remove it.
        </p>
        <p>
          On this page we explain your privacy rights and most importantly, how to
          ask for access to, correction of, deletion of or removal of your personal
          information from SAP Security Expert.
        </p>
        <p>
          Read this page along with our{" "}
          <Link className="legal-links" to="/privacy-policy">Privacy Policy</Link>
          {" "}&amp;{" "}
          <Link className="legal-links" to="/terms-conditions">Terms &amp; Conditions</Link>.
        </p>
      </section>

      <section>
        <h3>1. Your Information is Yours</h3>
        <p>
          We may collect your name, email address, professional information,
          membership details, profile information, contributions, comments, learning
          activity, or other information you choose to provide when you create an
          account or interact with SAP Security Expert.
        </p>
        <p>We use this information to operate and improve the SAP Security Expert community and to provide services such as:</p>
        <ul>
          <li>Account management and member registration</li>
          <li>Communications with the community, articles, comments and expert contributions</li>
          <li>Profiles of contributors and podcasts</li>
          <li>Learning and assessment activities, resources and downloads for members</li>
          <li>Credits, reputation and involvement in the community</li>
          <li>Administration, security and fraud prevention of the platform</li>
        </ul>
        <p>We seek only to collect and use information that is relevant to these purposes.</p>
      </section>

      <section>
        <h3>2. Your Rights Regarding Privacy</h3>
        <p>Depending on where you live and what laws apply to you, you may have rights relating to your personal information. These may include the right to:</p>
        <ul>
          <li><strong>Request access to your information</strong> — You can request a copy of the personal information we hold about you.</li>
          <li><strong>Correct your information</strong> — If your information is inaccurate, incomplete or out of date, you may ask us to correct or update it.</li>
          <li><strong>Delete your information</strong> — When appropriate, you can ask us to delete or erase your personal information. Deletion is not a right that may be exercised at will, and may be limited by legal, regulatory, security, dispute resolution or other applicable retention requirements.</li>
          <li><strong>Withdraw your consent</strong> — If we process your information based on your consent, you may withdraw it. Withdrawal does not affect processing lawfully done before withdrawal.</li>
          <li><strong>Object to certain processing</strong> — Where your personal information is processed for certain purposes, including certain types of direct marketing, you have the right to object, if required by applicable law.</li>
          <li><strong>Restriction of processing</strong> — Where applicable and allowed under applicable law, you may request that we restrict the use of your information.</li>
          <li><strong>Request data portability</strong> — You have the right to ask for a copy of your personal information in a structured, commonly used and machine-readable format, if applicable law allows.</li>
        </ul>
        <p>These rights are subject to applicable law and may vary depending on your location and the type of information or processing involved.</p>
      </section>

      <section>
        <h3>3. How to Delete Your SAP Security Expert Account?</h3>
        <p>
          You can request deletion of your SAP Security Expert account directly from
          your member dashboard.
        </p>
        <p>See: Profile → Security &amp; Privacy → Delete Account</p>
        <img
          src="/assets/help/delete-account-menu.png"
          alt="Member menu showing Security & Privacy expanded, with Delete Account highlighted"
          style={{ maxWidth: "320px", width: "100%", display: "block", margin: "16px 0", borderRadius: "8px", border: "1px solid #e5e7eb" }}
        />
        <p>
          Before completing the deletion, we may ask you to confirm your identity or
          account credentials to help prevent others from deleting your account
          without your authorization.
        </p>
        <p><strong>What is the impact of deleting my account?</strong></p>
        <p>
          Once we confirm your request to delete, we will start the process of
          deleting or anonymizing personal information linked to your account,
          subject to applicable legal, regulatory, security and retention
          requirements. This could include:
        </p>
        <ul>
          <li>Your profile as a member</li>
          <li>Contact and account information</li>
          <li>Information relating to membership</li>
          <li>Some activity on your account</li>
          <li>Any other personal information related to your account</li>
        </ul>
        <p><em>Note: Account deletion is permanent and may not be reversible.</em></p>
      </section>

      <section>
        <h3>4. Deleting Your Account</h3>
        <p>If you delete your account, you may lose access to:</p>
        <ul>
          <li>Articles for members only</li>
          <li>Articles previously unlocked</li>
          <li>Credit and credit history</li>
          <li>Teaching materials</li>
          <li>Community features</li>
          <li>Your profile as a member</li>
          <li>Other membership benefits related to accounts</li>
        </ul>
        <p>
          If you have contributed articles, comments, expert papers, podcast
          appearances or other content to SAP Security Expert, please be aware that
          your account deletion may not automatically delete previously published
          content.
        </p>
        <p>
          Contributor information, where appropriate, can be anonymized or the
          specific content can be reviewed separately for removal.
        </p>
        <p>
          If you want a particular contribution to be reviewed for removal, please
          contact:{" "}
          <a className="legal-links" href="mailto:privacy@sapsecurityexpert.com">privacy@sapsecurityexpert.com</a>.
        </p>
      </section>

      <section>
        <h3>5. Request Access, Correction, or Other Privacy Assistance</h3>
        <p>Not every privacy request is about deleting an account. If you wish to:</p>
        <ul>
          <li>Update your personal information</li>
          <li>Correct or update your information</li>
          <li>Where applicable, withdraw consent</li>
          <li>Request removal or anonymization of specific content</li>
          <li>Pose a question on privacy</li>
          <li>Report a privacy issue</li>
        </ul>
        <p>Contact: <a className="legal-links" href="mailto:privacy@sapsecurityexpert.com">privacy@sapsecurityexpert.com</a></p>
        <p>For some requests, we may need to verify your identity before we respond.</p>
      </section>

      <section>
        <h3>6. What Happens When You Ask to Delete?</h3>
        <p>
          Once we have received and verified your request, we will review the
          information pertaining to your account. If deletion is appropriate, we will
          delete or anonymize personal information that we no longer need or are not
          required by law to keep.
        </p>
        <p>
          We won&rsquo;t store personal information just because we can. Where we no
          longer require the information for the purpose for which it was collected,
          or for any applicable legal obligation or legitimate business or research
          purpose, we will seek to remove or anonymize the information in accordance
          with our retention practices.
        </p>
      </section>

      <section>
        <h3>7. Some Data May Need to Be Retained</h3>
        <p>Deleting accounts does not mean that every record instantly vanishes from every system. There may be instances where we need to withhold some information, for example:</p>
        <ul>
          <li>To comply with any applicable legal or regulatory requirements</li>
          <li>To bring, exercise or defend legal actions</li>
          <li>To prevent fraud, abuse or security incidents</li>
          <li>Maintain security records</li>
          <li>To settle disputes</li>
          <li>To meet our contractual or accounting obligations</li>
          <li>Where retention is otherwise permitted or required under applicable law</li>
        </ul>
        <p>Where appropriate, only the information necessary for the relevant purpose will be retained.</p>
      </section>

      <section>
        <h3>8. What Happens to Articles, Comments and Other Contributions?</h3>
        <p>
          SAP Security Expert is a community of professional knowledge. Members can
          make professional contributions such as articles, expert papers, comments,
          podcast appearances, interviews, learning content, community discussion and
          more.
        </p>
        <p>
          Deleting your account is not synonymous with the automatic deletion of all
          content you previously contributed. For example, an article you published
          earlier in the SAP Security Expert knowledge library might still be
          accessible after your account is closed.
        </p>
        <p>
          We may keep the published content but remove or anonymize personal
          identifiers or remove specific content where we have a proper basis to do
          so.
        </p>
        <p>
          If you want a particular article, comment, profile reference, podcast page
          or other contribution removed or anonymized, you can make a specific
          request. We will consider such requests based on the content, the rights
          and interests involved, and any applicable legal requirements.
        </p>
      </section>

      <section>
        <h3>9. Promotional Communications</h3>
        <p>We don&rsquo;t want your inbox to feel like something you need to escape from.</p>
        <p>
          If you receive newsletters, community updates, event announcements or
          other marketing communications from SAP Security Expert, you can
          unsubscribe by using the unsubscribe option included in the communication
          or contact us directly.
        </p>
        <p>
          You may still receive transactional, account or security messaging where
          necessary to operate your relationship with SAP Security Expert.
        </p>
      </section>

      <section>
        <h3>10. Cookies, Technical Information and Analytics</h3>
        <p>
          Like most modern websites, SAP Security Expert may use cookies, analytics
          technologies, server logs, and similar technical tools to operate, secure
          and improve the platform. Depending on the technology used, this may
          include information such as:
        </p>
        <ul>
          <li>IP address</li>
          <li>Information about your browser and equipment</li>
          <li>Pages viewed</li>
          <li>Usage data (approximate)</li>
          <li>Session and login information</li>
          <li>Security and diagnostics information</li>
        </ul>
        <p>
          Our <Link className="legal-links" to="/privacy-policy">Privacy Policy</Link> and,
          where applicable, our Cookie Policy describe the specific technologies we
          use and the purposes for which we use them.
        </p>
      </section>

      <section>
        <h3>11. Third Party Services</h3>
        <p>
          SAP Security Expert may utilize selected service providers to assist in the
          operation of the platform, such as hosting, email delivery, analytics,
          authentication, payment processing, security, communications or other
          technology services.
        </p>
        <p>
          Where we engage third parties to process personal information on our
          behalf, we endeavor to ensure that appropriate contractual, technical and
          organizational safeguards are in place as required by applicable law. Our{" "}
          <Link className="legal-links" to="/privacy-policy">Privacy Policy</Link> provides
          additional information about these categories of service providers where
          applicable.
        </p>
      </section>

      <section>
        <h3>12. How We Safeguard Your Information</h3>
        <p>No Internet service is 100% secure.</p>
        <p>
          We do, however, use reasonable technical and organizational measures to
          protect personal information from unauthorized access, misuse, alteration,
          disclosure, loss or destruction. We also require that our service providers
          and other entities processing personal information on our behalf have
          appropriate safeguards in place.
        </p>
        <p>
          If we become aware of a personal data breach that requires notification
          under applicable law, we will comply with applicable legal and regulatory
          requirements.
        </p>
      </section>

      <section>
        <h3>13. How to Make a Privacy Request</h3>
        <p>You don&rsquo;t need to use complicated legal language to exercise your privacy rights. Just call us and tell us what you need.</p>
        <p>Contact Privacy — Email: <a className="legal-links" href="mailto:privacy@sapsecurityexpert.com">privacy@sapsecurityexpert.com</a></p>
        <p>You can reach us for:</p>
        <ul>
          <li>Delete account</li>
          <li>Reading personal information</li>
          <li>Correction or updating of data</li>
          <li>Revocation of consent</li>
          <li>Removing or anonymizing specific content</li>
          <li>Communication preferences for marketing</li>
          <li>Questions or issues related to privacy</li>
          <li>Other requests regarding your personal information</li>
        </ul>
        <p>
          Some requests may require that we verify your identity before we can act on
          your request. This is a security feature to help us make sure we
          don&rsquo;t share or delete information that is not for the right person.
        </p>
      </section>

      <section>
        <h3>14. What To Expect From Us</h3>
        <p>When you make contact with us concerning your personal information we aim to:</p>
        <ul>
          <li><strong>Listen</strong> — Understand what you want us to do.</li>
          <li><strong>Verify</strong> — If applicable, authenticate that the request is a bona fide request of the appropriate member.</li>
          <li><strong>Act</strong> — Take the appropriate action within the requirements of applicable law.</li>
          <li><strong>Explain</strong> — If we are unable to fully comply with a request, we will explain the relevant reason to the extent permitted by law.</li>
        </ul>
        <p>Our goal is simple: you shouldn&rsquo;t have to be a privacy expert to exercise your privacy rights.</p>
      </section>

      <section>
        <h3>15. Children and Minors</h3>
        <p>
          SAP Security Expert is for professionals, students, researchers and those
          who are interested in SAP security, cybersecurity, GRC and related topics.
        </p>
        <p>
          Where applicable law does not allow us to do so, we do not knowingly
          collect personal information from children.
        </p>
        <p>
          If you believe that a child has given us personal information in a
          situation where we should not have collected it, please contact us at{" "}
          <a className="legal-links" href="mailto:privacy@sapsecurityexpert.com">privacy@sapsecurityexpert.com</a>.
        </p>
      </section>

      <section>
        <h3>16. Amendments to This Page</h3>
        <p>
          Privacy requirements, technology and the SAP Security Expert platform may
          evolve over time. This page may be updated from time to time.
        </p>
        <p>
          We may revise the &ldquo;Last Updated&rdquo; date when we make material
          changes and may provide other notice where appropriate. We encourage
          members to review this page periodically to understand how to exercise
          their privacy rights.
        </p>
      </section>

      <section>
        <h3>Your Data. Your Rights. Your Choice.</h3>
        <p>
          Being part of a professional community is about learning, contributing and
          connecting, not about feeling you&rsquo;ve lost control of your
          information.
        </p>
        <p>If you have a question about your personal data, ask us. Let us know if you want to change it. If you want your account deleted, ask.</p>
        <p>We will comply with applicable privacy and data protection requirements in handling your request.</p>
        <p>Privacy Contact: <a className="legal-links" href="mailto:privacy@sapsecurityexpert.com">privacy@sapsecurityexpert.com</a></p>
        <p>
          Related: <Link className="legal-links" to="/privacy-policy">Privacy Policy</Link>
          {" "}&middot;{" "}
          <Link className="legal-links" to="/terms-conditions">Terms and Conditions</Link>
        </p>
      </section>
    </LegalLayout>
  );
};

export default PrivacyDataProtection;
