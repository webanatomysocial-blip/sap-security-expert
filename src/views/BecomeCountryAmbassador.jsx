import { Link } from "react-router-dom";
import SEO from "../components/SEO";

const SectionTable = ({ rows }) => (
  <div style={{ border: "1px solid #e2e8f0", borderRadius: 12, overflow: "hidden" }}>
    {rows.map((r, i) => (
      <div
        key={i}
        style={{
          display: "grid", gridTemplateColumns: "180px 1fr", gap: 0,
          borderTop: i > 0 ? "1px solid #e2e8f0" : "none",
        }}
      >
        <div style={{ padding: "14px 18px", fontWeight: 700, color: "#0f172a", background: "#f8fafc", fontSize: "0.9rem" }}>{r.label}</div>
        <div style={{ padding: "14px 18px", color: "#475569", fontSize: "0.9rem", lineHeight: 1.6 }}>{r.desc}</div>
      </div>
    ))}
  </div>
);

const Divider = () => <hr style={{ border: "none", borderTop: "1px solid #e2e8f0", margin: "48px 0" }} />;

const BecomeCountryAmbassador = () => {
  return (
    <div style={{ background: "#fff" }}>
      <SEO title="Country Ambassador | SAP Security Expert" />

      {/* Hero */}
      <div style={{
        background: "linear-gradient(135deg, #0f172a 0%, #1e3a5f 50%, #0f172a 100%)",
        padding: "64px 24px 56px", textAlign: "center", position: "relative", overflow: "hidden",
      }}>
        <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.04) 1px, transparent 1px)", backgroundSize: "28px 28px" }} />
        <div style={{ position: "relative", maxWidth: 760, margin: "0 auto" }}>
          <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "#fbbf24", letterSpacing: 1, textTransform: "uppercase" }}>
            An Earned Community Recognition
          </span>
          <h1 style={{ fontSize: "2.4rem", fontWeight: 800, color: "#fff", margin: "12px 0 8px" }}>
            SAP Security Expert — Country Ambassador
          </h1>
          <p style={{ fontSize: "1.1rem", color: "#cbd5e1", fontWeight: 600, margin: "0 0 20px" }}>
            Local Expertise. Global Community.
          </p>
          <p style={{ color: "#94a3b8", fontSize: "0.98rem", lineHeight: 1.7, maxWidth: 640, margin: "0 auto" }}>
            SAP Security is a global profession, but every region has its own experiences, challenges and perspectives.
            The Country Ambassador recognition is awarded to respected SAP Security professionals who actively
            contribute to the community and help connect practitioners within their country with the wider global
            SAPSecurityExpert network.
          </p>
        </div>
      </div>

      <div style={{ maxWidth: 820, margin: "0 auto", padding: "48px 24px 80px" }}>
        <div style={{ background: "#fff7ed", border: "1.5px solid #fed7aa", borderRadius: 16, padding: "20px 24px", marginBottom: 48 }}>
          <p style={{ margin: 0, color: "#78350f", fontSize: "0.92rem", lineHeight: 1.7 }}>
            This is <strong>not</strong> a recruited position, sales role or employment opportunity. It is an earned
            community recognition for professionals who demonstrate expertise, contribution, leadership and a genuine
            commitment to sharing knowledge.
          </p>
        </div>

        {/* What Does a Country Ambassador Do */}
        <h2 style={{ fontSize: "1.4rem", fontWeight: 800, color: "#0f172a", margin: "0 0 6px" }}>What Does a Country Ambassador Do?</h2>
        <p style={{ color: "#64748b", marginBottom: 20 }}>Country Ambassadors help strengthen the SAP Security community by:</p>
        <SectionTable rows={[
          { label: "Connect", desc: "Help practitioners discover and connect with other SAP Security professionals in their country and around the world." },
          { label: "Contribute", desc: "Share knowledge through Expert Papers, Expert Insights, articles, case studies, podcasts, discussions or other community initiatives." },
          { label: "Engage", desc: "Participate in community conversations, roundtables, webinars and other SAPSecurityExpert activities." },
          { label: "Represent", desc: "Bring the perspectives, experiences and challenges of their local SAP Security community into the global conversation." },
          { label: "Encourage", desc: "Support knowledge sharing, mentoring and participation — particularly by helping new professionals become part of the community." },
        ]} />

        <Divider />

        {/* Who Qualifies */}
        <h2 style={{ fontSize: "1.4rem", fontWeight: 800, color: "#0f172a", margin: "0 0 6px" }}>Who Qualifies?</h2>
        <p style={{ color: "#64748b", marginBottom: 20 }}>Country Ambassadors are experienced professionals who demonstrate a combination of:</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {[
            { area: "SAP Security Expertise", desc: "Strong practical experience in areas such as SAP Security, GRC, Access Governance, IAG, S/4HANA Security, BTP Security, SAP Cybersecurity, IAM or related disciplines.", criteria: "Typically 8+ years of relevant experience, with demonstrated depth of expertise." },
            { area: "Professional Credibility", desc: "A respected professional reputation within the SAP ecosystem.", criteria: "Showcase professional credibility" },
            { area: "Community Contribution", desc: "A demonstrated history of sharing knowledge, mentoring, speaking, writing, participating in professional communities or contributing to the SAP ecosystem. Community contribution should demonstrate the individual's own expertise, experience or perspective.", criteria: "Evidence may include published articles, podcasts, authored books, conference presentations, SAP Community contributions, research, mentoring, webinars or other professional contributions." },
            { area: "Community Mindset", desc: "A willingness to connect people, encourage knowledge sharing and help others — not simply promote themselves or their organization.", criteria: null },
            { area: "Professional Conduct", desc: "A commitment to respectful, ethical and responsible participation in the community.", criteria: null },
          ].map((row, i) => (
            <div key={i} style={{ border: "1px solid #e2e8f0", borderRadius: 14, padding: "18px 22px" }}>
              <div style={{ fontWeight: 700, color: "#0f172a", marginBottom: 6, fontSize: "0.95rem" }}>{row.area}</div>
              <p style={{ margin: 0, color: "#475569", fontSize: "0.9rem", lineHeight: 1.6 }}>{row.desc}</p>
              {row.criteria && (
                <p style={{ margin: "8px 0 0", color: "#94a3b8", fontSize: "0.82rem", fontStyle: "italic" }}>{row.criteria}</p>
              )}
            </div>
          ))}
        </div>

        <p style={{ marginTop: 24, color: "#64748b", fontSize: "0.92rem", lineHeight: 1.7 }}>
          Follower count is not a qualification. Community impact is. If you are not qualified, you can start as a
          Contributor and engage in the community activities.{" "}
          <Link to="/apply-contributor" style={{ color: "#ee5e42", fontWeight: 700 }}>To become a contributor, click here.</Link>
        </p>

        <Divider />

        {/* How Are Ambassadors Selected */}
        <h2 style={{ fontSize: "1.4rem", fontWeight: 800, color: "#0f172a", margin: "0 0 12px" }}>How Are Ambassadors Selected?</h2>
        <p style={{ color: "#475569", fontSize: "0.92rem", lineHeight: 1.7 }}>
          Country Ambassador is an earned recognition — not a position that we recruit for. Candidates may be
          identified through their contributions to SAPSecurityExpert or the wider SAP ecosystem.
        </p>
        <p style={{ color: "#475569", fontSize: "0.92rem", lineHeight: 1.7 }}>
          Candidates can also be nominated by community members or recommended by the SAPSecurityExpert team.
        </p>
        <p style={{ color: "#0f172a", fontWeight: 700, fontSize: "0.9rem", marginTop: 20, marginBottom: 8 }}>
          Nomination / approval should request evidence of:
        </p>
        <ul style={{ color: "#475569", fontSize: "0.92rem", lineHeight: 1.9, paddingLeft: 22 }}>
          <li>Motivation for strengthening the SAP Security community</li>
          <li>Mentoring, speaking, research, writing or leadership examples</li>
          <li>Examples of community contribution, with URLs where applicable</li>
          <li>Professional credibility and current role</li>
          <li>SAP Security experience and areas of expertise</li>
        </ul>
        <p style={{ color: "#475569", fontSize: "0.92rem", lineHeight: 1.7 }}>
          Geographic representation is considered, but being from a particular country alone does not qualify
          someone to become an Ambassador.
        </p>

        <Divider />

        {/* What a Country Ambassador Is Not */}
        <h2 style={{ fontSize: "1.4rem", fontWeight: 800, color: "#0f172a", margin: "0 0 12px" }}>What a Country Ambassador Is Not</h2>
        <p style={{ color: "#475569", fontSize: "0.92rem", marginBottom: 14 }}>A Country Ambassador is:</p>
        <ul style={{ color: "#475569", fontSize: "0.92rem", lineHeight: 2, paddingLeft: 22 }}>
          <li>Not a sales representative or person in sales/marketing team</li>
          <li>Not a paid recruiter</li>
          <li>Not required to achieve membership targets</li>
          <li>Not required to generate business leads</li>
          <li>Not required to promote products or services</li>
        </ul>
        <p style={{ color: "#475569", fontSize: "0.92rem", lineHeight: 1.7 }}>
          The role exists to serve the community — not to sell to it.
        </p>

        <Divider />

        {/* Recognition */}
        <h2 style={{ fontSize: "1.4rem", fontWeight: 800, color: "#0f172a", margin: "0 0 12px" }}>Ambassador Recognition</h2>
        <p style={{ color: "#475569", fontSize: "0.92rem", lineHeight: 1.7 }}>
          Each appointed Ambassador receives a dedicated recognition on their SAPSecurityExpert profile.
        </p>
        <div style={{ background: "#0f172a", borderRadius: 14, padding: "22px 26px", margin: "16px 0", textAlign: "center" }}>
          <div style={{ color: "#fbbf24", fontWeight: 800, fontSize: "1.05rem", letterSpacing: "0.02em" }}>SAP Security Expert — Country Ambassador</div>
          <div style={{ color: "#94a3b8", fontSize: "0.85rem", marginTop: 4 }}>Country · Year</div>
        </div>
        <p style={{ color: "#475569", fontSize: "0.92rem", marginTop: 20, marginBottom: 8 }}>Ambassadors may also be featured in:</p>
        <ul style={{ color: "#475569", fontSize: "0.92rem", lineHeight: 1.9, paddingLeft: 22 }}>
          <li>Global Expert Directory</li>
          <li>Country Ambassador page</li>
          <li>Community articles and interviews</li>
          <li>Global roundtables</li>
          <li>Expert Papers and research initiatives</li>
          <li>SAPSecurityExpert community campaigns</li>
        </ul>
        <p style={{ color: "#475569", fontSize: "0.92rem", lineHeight: 1.7 }}>
          The designation is awarded for one year and may be renewed based on continued contribution to the community.
        </p>

        <Divider />

        {/* Global by Design */}
        <h2 style={{ fontSize: "1.4rem", fontWeight: 800, color: "#0f172a", margin: "0 0 12px" }}>Global by Design</h2>
        <p style={{ color: "#475569", fontSize: "0.92rem", lineHeight: 1.7 }}>
          We want SAPSecurityExpert to bring together SAP Security professionals from every part of the world.
        </p>
        <p style={{ color: "#475569", fontSize: "0.92rem", lineHeight: 1.7 }}>
          Our Ambassadors help make that possible — not by simply increasing registrations, but by bringing local
          expertise into a global conversation.
        </p>
        <p style={{ color: "#0f172a", fontWeight: 700, fontSize: "0.98rem", marginTop: 20 }}>
          One profession. Many perspectives. One global community.
        </p>

        {/* CTA */}
        <div style={{
          marginTop: 48, background: "linear-gradient(135deg, #1e293b 0%, #334155 60%, #1e3a5f 100%)",
          borderRadius: 20, padding: "36px 32px", textAlign: "center",
        }}>
          <h3 style={{ color: "#fff", fontSize: "1.3rem", fontWeight: 800, margin: "0 0 10px" }}>
            Think you qualify?
          </h3>
          <p style={{ color: "#cbd5e1", margin: "0 0 22px", fontSize: "0.95rem" }}>
            Apply for the Country Ambassador recognition, or nominate someone who deserves it.
          </p>
          <Link
            to="/apply-ambassador"
            style={{
              display: "inline-flex", alignItems: "center", gap: 8, background: "#ee5e42", color: "#fff",
              padding: "13px 28px", borderRadius: 10, fontWeight: 700, fontSize: "0.95rem", textDecoration: "none",
            }}
          >
            Apply Now <i className="bi bi-arrow-right" />
          </Link>
        </div>
      </div>
    </div>
  );
};

export default BecomeCountryAmbassador;
