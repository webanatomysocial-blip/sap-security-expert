import React from "react";
import BlogLayout from "../components/BlogLayout";
import featuredImage from "../assets/blogs/cybersecurity-insights.jpg";

const CybersecurityInsights = () => {
  return (
    <BlogLayout
      category="SAP Cybersecurity"
      title="SAP Cybersecurity Insights from the Authors of Cybersecurity for SAP book by SAP Press"
      date="January 28, 2026"
      author="Raghu Boddu"
      image={featuredImage}
      description="Listen to the authors of 'Cybersecurity for SAP' (SAP PRESS) discuss practical challenges, threat vectors, and control strategies for securing SAP landscapes."
      content={
        <>
          <p>
            Sharing Episode 2 of the Cyber Kriya Podcast, featuring Juan
            Perez-Etchegoyen (JP) and Gaurav Singh, authors of the SAP PRESS
            bestseller <em>Cybersecurity for SAP</em>.
          </p>

          <h2>Book reference (SAP PRESS)</h2>
          <p>
            <a
              href="https://www.sap-press.com/cybersecurity-for-sap_5887/?srsltid=AfmBOoqWqM1TU5yPoDrmLOfCfakTDbLxhQVUU39Pi8v8G2YVeN_-heuN"
              target="_blank"
              rel="noopener noreferrer"
            >
              Cybersecurity for SAP - SAP PRESS
            </a>
          </p>

          <p>
            This episode offers practical perspectives on SAP cybersecurity
            challenges, threat vectors, and control strategies, directly from
            the authors who have worked extensively with real-world SAP
            landscapes.
          </p>
          <p>
            A valuable listen for SAP Security, GRC, Audit, and Risk
            professionals looking to strengthen their security posture.
          </p>

          <p>
            Explore the podcast and insights shared by the SAP security experts.
          </p>

          <div className="blog-video-container">
            <iframe
              style={{
                width: "100%",
                height: "400px",
              }}
              src="https://www.youtube.com/embed/q_YclMMJogA"
              title="SAP Cybersecurity Insights from Book Authors"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            ></iframe>
            <p className="image-caption">
              Cyber Kriya Podcast Episode 2 featuring JP and Gaurav Singh
            </p>
          </div>

          <h2>Author's LinkedIn profiles:</h2>
          <ul>
            <li>
              JP –{" "}
              <a
                href="https://www.linkedin.com/in/jppereze/"
                target="_blank"
                rel="noopener noreferrer"
              >
                https://www.linkedin.com/in/jppereze/
              </a>
            </li>
            <li>
              Gaurav –{" "}
              <a
                href="https://www.linkedin.com/in/gauravsingh14/"
                target="_blank"
                rel="noopener noreferrer"
              >
                https://www.linkedin.com/in/gauravsingh14/
              </a>
            </li>
          </ul>

          <p>
            <strong>Enjoy the podcast!</strong>
          </p>
        </>
      }
    />
  );
};

export default CybersecurityInsights;
