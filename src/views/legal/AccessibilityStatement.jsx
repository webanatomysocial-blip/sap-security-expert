import React from "react";
import LegalLayout from "../../components/LegalLayout";

const AccessibilityStatement = () => {
  return (
    <LegalLayout title="Accessibility Statement">
      <p style={{ color: "#666", marginBottom: "40px" }}>Introduction</p>

      <section>
        <p>
          We’re committed to Easy Access for everyone. SAP Security Expert is
          committed to making our website as accessible as possible to everyone,
          including those with visual, hearing, cognitive, and motor
          impairments. We’re constantly working towards improving the
          accessibility of our website to ensure we provide equal access to all
          of our users.
        </p>
        <p>
          As part of our commitment to accessibility, we ensure that our website
          is compatible with:
        </p>
        <ul>
          <li>Recent versions of popular screen readers</li>
          <li>Operating system screen magnifiers</li>
          <li>Speech recognition software</li>
          <li>Operating system speech packages</li>
        </ul>
        <p>
          We always make sure that our website follows accessibility best
          practices by following the principles of universal design. This
          ensures the site is flexible and adaptable to different users’ needs
          or preferences and is accessible through a variety of different
          technologies, including mobile devices or assistive technologies.
        </p>
        <p>
          During the development phase we endeavor to follow WebAIM’s Principles
          of Accessible Design, and also try to help improve the accessibility
          of our website for users with disabilities by:
        </p>
        <ul>
          <li>Retaining the ability to adjust the font size</li>
          <li>Maintaining color/contrast ratios for text</li>
          <li>Providing keyboard-accessible navigation</li>
          <li>Providing skip to content links at the top of the page</li>
          <li>
            We also monitor the accessibility of the site through internally
            maintained tools.
          </li>
        </ul>
      </section>

      <section>
        <h3>Web Content Accessibility Guidelines (WCAG) 2.1</h3>
        <p>
          Wherever possible, the SAP Security Expert site will adhere to level
          AA of the Web Content Accessibility Guidelines (WCAG 2.1). These
          guidelines outline four main principles that state that sites should
          be:
        </p>
        <ul>
          <li>
            <strong>Perceivable</strong> – Information and user interface
            components must be presentable to users in ways they can perceive
          </li>
          <li>
            <strong>Operable</strong> – User interface components and navigation
            must be operable
          </li>
          <li>
            <strong>Understandable</strong> – Information and the operation of
            the user interface must be understandable
          </li>
          <li>
            <strong>Robust</strong> – Content must be robust enough that it can
            be interpreted reliably by a wide variety of user agents, including
            assistive technologies
          </li>
        </ul>
      </section>

      <section>
        <h3>Contacting Us</h3>
        <p>
          If you have any questions or feedback regarding the accessibility of
          our site, please contact us at{" "}
          <a className="legal-links" href="mailto:hello@sapsecurityexpert.com">
            hello@sapsecurityexpert.com
          </a>
          .
        </p>
      </section>
    </LegalLayout>
  );
};

export default AccessibilityStatement;
