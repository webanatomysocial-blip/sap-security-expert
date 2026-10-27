import React from "react";
import SEO from "../../components/SEO";
import { VITE_SITE_URL } from "../../utils/env";
import CategoryLayout from "../../components/CategoryLayout";

const SapCybersecurity = () => {
  return (
    <>
      <SEO
        title="SAP Cybersecurity: Detect Threats & Protect Your Systems"
        description="Discover SAP cybersecurity strategies for threat detection, vulnerability management, system hardening and incident response to protect critical business data."
        keywords="SAP Cybersecurity, SAP Threat Detection, SAP Security Best Practices, SAP Threat Protection, SAP Application Security"
        url={`${VITE_SITE_URL}/sap-cybersecurity`}
      />
      <CategoryLayout categorySlug="sap-cybersecurity" displayName="SAP Cybersecurity" />
    </>
  );
};

export default SapCybersecurity;
