import React from "react";
import BlogLayout from "../components/BlogLayout";
import featuredImage from "../assets/blogs/magician-and-machine.jpg";

const TheMagicianAndMachine = () => {
  return (
    <BlogLayout
      category="SAP Cybersecurity"
      title="The Magician, the Machine, and SAP Cybersecurity"
      date="January 30, 2026"
      author="Raghu Boddu"
      image={featuredImage}
      description="Reflecting on the role of the SAP Security Expert in the age of automation and AI. Is the human element becoming obsolete, or more critical than ever?"
      content={
        <>
          <p>
            At #SAPSecurityExpert, we regularly highlight valuable knowledge
            from across the SAP security ecosystem. In this post, we are
            featuring an insightful podcast episode from the CyberKriya Podcast,
            which brings together voices from the global SAPCyberSecurity
            community.
          </p>
          <p>
            This is the inaugural episode of the CyberKriya Podcast, focused on
            strengthening practitioner awareness around emerging SAP
            cybersecurity and AI-driven risk themes.
          </p>

          <h2>Featured Guest: Jay Thoden van Velz</h2>
          <p>
            Known across the community as "The Magician with the Hat", Jay is a
            Strategic Advisor to the CSO at SAP and part of the SAP Global
            Security Leadership Team. He brings a rare blend of deep technical
            security expertise and philosophical insight—shaped by his formative
            years studying Sanskrit in Kashi (India) during the 1990s.
          </p>

          <h2>Podcast Host: Gaurav Singh</h2>
          <p>
            Gaurav Singh hosts the episode, guiding the conversation with a
            strong practitioner lens and community-first approach.
          </p>

          <h2>Key Themes Discussed:</h2>
          <p>
            This episode explores several timely and thought-provoking topics,
            including:
          </p>
          <ul>
            <li>The current and evolving SAP Cybersecurity threat landscape</li>
            <li>
              Practical implications of Agentic AI in enterprise environments
            </li>
            <li>
              Repudiation risks and why they matter in autonomous and
              semi-autonomous systems
            </li>
            <li>
              The need for modern AI threat modeling approaches within SAP
              landscapes
            </li>
          </ul>
          <p>
            The discussion also draws from the SAP Community article{" "}
            <em>
              "That's Not What We Agreed: Repudiation and Agentic AI Threat
              Modeling"
            </em>
            , co-authored by Ron F. Del Rosario, Head of AI Security for SAP
            ISBN, and Jay Thoden van Velzen.
          </p>

          <h2>Why We're Featuring This on sapsecurityexpert.com?</h2>
          <p>
            As SAP landscapes become increasingly intelligent and autonomous,
            security conversations must evolve beyond traditional controls. This
            CyberKriya episode provides strategic context and practitioner-ready
            insights that are highly relevant for SAP Security, GRC, and AI risk
            professionals.
          </p>
          <p>
            We are pleased to curate and amplify such high-quality community
            content for our readers—while full credit and ownership remain with
            CyberKriya.
          </p>

          <h2>Listen to the Podcast</h2>
          <p>
            Visit{" "}
            <a
              href="https://cyberkriya.com/"
              target="_blank"
              rel="noopener noreferrer"
            >
              Cyber Kriya
            </a>{" "}
            to access the full episode and explore more podcasts from the
            CyberKriya platform.
          </p>

          <div className="blog-video-container">
            <iframe
              style={{
                width: "100%",
                height: "400px",
              }}
              src="https://www.youtube.com/embed/jUgw-s7f6IQ"
              title="The Magician, the Machine, and SAP Cybersecurity"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            ></iframe>
            <p className="image-caption">
              CyberKriya Podcast Episode featuring Jay Thoden van Velz
            </p>
          </div>

          <b>
            If you are part of the SAP Security or GRC community, this episode
            is well worth your time. Stay tuned to SAPSecurityExpert as we
            continue to feature impactful content from across the SAP
            cybersecurity ecosystem.
          </b>

          <h2>Disclaimer</h2>
          <p>
            This post is published on SAPSecurityExpert for informational and
            community knowledge–sharing purposes only. SAPSecurityExpert does
            not host, produce, or own the CyberKriya Podcast or its content. All
            rights, views, opinions, and intellectual property associated with
            the podcast remain solely with CyberKriya and the respective
            speakers.
          </p>
          <p>
            The views expressed by the podcast participants are their personal
            and professional opinions and do not necessarily represent the views
            of SAP, SAPSecurityExpert, or any affiliated organizations.
            Listeners are encouraged to exercise independent judgment when
            applying any insights discussed.
          </p>
        </>
      }
    />
  );
};

export default TheMagicianAndMachine;
