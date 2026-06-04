import React from "react";
import Image from "next/image";
// next-disabled: import "../css/AuthorBio.css";
const AuthorBio = ({
  authorName = "Raghu Boddu",
  authorRole = "SAP Security Expert",
  authorImage,
}) => {
  // Default image if none provided
  const image =
    authorImage ||
    "https://ui-avatars.com/api/?name=Raghu+Boddu&background=0D8ABC&color=fff";

  return (
    <div className="author-bio-card">
      <Image src={image} alt={authorName} className="author-avatar-large" width={100} height={100} />
      <div className="author-content">
        <span className="posted-by">Posted by</span>
        <h3>{authorName}</h3>
        <p className="author-role">{authorRole}</p>
        <p className="author-desc">
          Specializing in SAP Security, GRC, and BTP Identity Authentication.
          Adding value through secure architecture and best practices.
        </p>
        <div className="author-socials">
          <a href="#" aria-label="LinkedIn">
            <i className="bi bi-linkedin"></i>
          </a>
          <a href="#" aria-label="Twitter">
            <i className="bi bi-twitter-x"></i>
          </a>
          <a href="#" aria-label="Website">
            <i className="bi bi-globe"></i>
          </a>
        </div>
      </div>
    </div>
  );
};

export default AuthorBio;
