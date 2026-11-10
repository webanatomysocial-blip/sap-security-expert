import LegalLayout from "../../components/LegalLayout";
import SEO from "../../components/SEO";
import { VITE_SITE_URL } from "../../utils/env";

export default function Disclaimer() {
  return (
    <LegalLayout title="Disclaimer" lastUpdated="10 November 2026">
      <SEO title="Disclaimer | SAP Security Expert" description="Important limitations and disclosures for SAP Security Expert content and resources." url={`${VITE_SITE_URL}/disclaimer`} />
      <p>SAP Security Expert publishes general educational and professional information. Content is not legal, audit, accounting, security-assurance, investment, or implementation advice and should not replace qualified professional judgment.</p>
      <h2>No SAP affiliation</h2>
      <p>SAP and related product names are trademarks of SAP SE. SAP Security Expert is an independent community and is not affiliated with, endorsed by, or sponsored by SAP SE.</p>
      <h2>Accuracy and availability</h2>
      <p>Technology, product features, regulations, links, and recommendations change. Verify important information against current official documentation and your organization’s controls before acting. We do not guarantee uninterrupted access or that every item is complete or error-free.</p>
      <h2>External links and contributors</h2>
      <p>External sites and contributor opinions remain the responsibility of their respective owners and authors. A link does not imply endorsement.</p>
      <h2>Business review required</h2>
      <p>This draft should be reviewed by the site owner and legal adviser before production publication, particularly for jurisdiction-specific liability language.</p>
    </LegalLayout>
  );
}
