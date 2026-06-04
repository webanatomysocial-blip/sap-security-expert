import React from "react";
import { authors } from "../data/authors";
import { FaLinkedin, FaTwitter, FaGlobe } from "react-icons/fa";
import Image from "next/image";

const AuthorProfile = ({ authorId }) => {
  const author = authors[authorId];

  if (!author) return null;

  return (
    <div
      className="author-profile-card"
      style={{
        display: "flex",
        gap: "20px",
        padding: "25px",
        background: "#f8f9fa",
        borderRadius: "8px",
        marginTop: "40px",
        alignItems: "start",
      }}
    >
      <Image
        src={author.image}
        alt={author.name}
        width={80}
        height={80}
        style={{
          borderRadius: "50%",
          objectFit: "cover",
        }}
      />
      <div>
        <h3 style={{ margin: "0 0 5px 0", fontSize: "18px", color: "#1f2937" }}>
          {author.name}
        </h3>
        <p
          style={{
            margin: "0 0 10px 0",
            fontSize: "14px",
            color: "#6b7280",
            fontWeight: "500",
          }}
        >
          {author.role}
        </p>
        <p
          style={{
            margin: "0 0 15px 0",
            fontSize: "14px",
            color: "#4b5563",
            lineHeight: "1.6",
          }}
        >
          {author.bio}
        </p>

        <div style={{ display: "flex", gap: "15px" }}>
          {author.socials.linkedin && (
            <a
              href={author.socials.linkedin}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "#0077b5" }}
            >
              <FaLinkedin size={20} />
            </a>
          )}
          {author.socials.twitter && (
            <a
              href={author.socials.twitter}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "#1da1f2" }}
            >
              <FaTwitter size={20} />
            </a>
          )}
          {author.socials.website && (
            <a
              href={author.socials.website}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "#333" }}
            >
              <FaGlobe size={20} />
            </a>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuthorProfile;
