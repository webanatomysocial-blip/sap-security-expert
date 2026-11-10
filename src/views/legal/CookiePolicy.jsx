import LegalLayout from "../../components/LegalLayout";
import SEO from "../../components/SEO";
import { VITE_SITE_URL } from "../../utils/env";

export default function CookiePolicy() {
  return (
    <LegalLayout title="Cookie Policy" lastUpdated="10 November 2026">
      <SEO title="Cookie Policy | SAP Security Expert" description="How SAP Security Expert uses necessary, preference, analytics and marketing storage." url={`${VITE_SITE_URL}/cookie-policy`} />
      <p>This page describes the categories of browser storage used by the application. It is drafted from the current consent implementation and requires business and legal confirmation before production publication.</p>
      <h2>Necessary storage</h2>
      <p>Session, security, CSRF, authentication, and consent-state storage supports sign-in and essential site functions. These items cannot always be disabled without breaking requested services.</p>
      <h2>Preferences</h2>
      <p>Local storage may remember interface choices and whether a promotional card was dismissed so it is not repeatedly displayed.</p>
      <h2>Analytics and marketing</h2>
      <p>Analytics or advertising integrations should load only in accordance with the choices presented by the consent interface. Available providers and retention periods must be confirmed by the site owner.</p>
      <h2>Managing choices</h2>
      <p>Use the site’s cookie controls to update optional choices. Browser settings can also remove stored data, although doing so may sign you out or reset preferences.</p>
      <h2>Confirmation required</h2>
      <p>Before publication, confirm the complete provider list, cookie names, purposes, retention periods, lawful bases, and contact details for privacy requests.</p>
    </LegalLayout>
  );
}
