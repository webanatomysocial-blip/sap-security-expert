import React from "react";
import ContactForm from "../components/ContactForm";
import SEO from "../components/SEO";

const Contact = () => {
  return (
    <div className="contact-page-wrapper">
      <SEO
        title="Contact Us"
        description="Get in touch with SAP Security Expert. We are here to help you with your SAP Security, GRC, and BTP needs."
        url={window.location.href}
      />
      <ContactForm />
    </div>
  );
};

export default Contact;
