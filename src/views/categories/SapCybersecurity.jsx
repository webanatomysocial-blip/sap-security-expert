import React from "react";
import SEO from "../../components/SEO";
import { VITE_SITE_URL } from "../../utils/env";
import CategoryLayout from "../../components/CategoryLayout";

const SapCybersecurity = () => {
  return (
    <>
      <SEO
        title="SAP Cybersecurity — Threat Protection, Hardening & Incident Response"
        description="Explore SAP Cybersecurity best practices for threat protection, vulnerability management, monitoring, incident response, and securing SAP applications and data."
        url={`${VITE_SITE_URL}/sap-cybersecurity`}
      />
      <CategoryLayout categorySlug="sap-cybersecurity" displayName="SAP Cybersecurity" />
    </>
  );
};

export default SapCybersecurity;
