import React, { useState, useRef, useEffect } from "react";
import { FiShare2, FiLink, FiMail } from "react-icons/fi";
import { FaWhatsapp } from "react-icons/fa";
// next-disabled: import "../css/ShareButton.css";
import { shareUrls } from "../data/socialLinks";

const ShareButton = ({ title, url }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  const toggleShare = () => setIsOpen(!isOpen);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      addToast("Link copied to clipboard!", "success");
      setIsOpen(false);
    } catch (err) {
      console.error("Failed to copy: ", err);
    }
  };

  const handleWhatsApp = () => {
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(title + " " + url)}`;
    window.open(whatsappUrl, "_blank");
    setIsOpen(false);
  };

  const handleEmail = () => {
    const subject = encodeURIComponent(title);
    const body = encodeURIComponent(`Check this out: ${url}`);
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
    setIsOpen(false);
  };

  return (
    <div className="share-button-container" ref={containerRef}>
      <button className="share-btn" onClick={toggleShare}>
        share
      </button>

      {isOpen && (
        <div className="share-dropdown">
          <button className="share-option" onClick={handleCopyLink}>
            <FiLink size={18} />
            <span>Copy link</span>
          </button>
          <button
            className="share-option"
            onClick={() =>
              window.open(
                `${shareUrls.facebook}${encodeURIComponent(url)}`,
                "_blank",
              )
            }
          >
            <i
              className="bi bi-facebook"
              style={{ color: "#1877F2", fontSize: "18px" }}
            ></i>
            <span>Facebook</span>
          </button>
          <button
            className="share-option"
            onClick={() =>
              window.open(
                `${shareUrls.linkedin}${encodeURIComponent(url)}`,
                "_blank",
              )
            }
          >
            <i
              className="bi bi-linkedin"
              style={{ color: "#0A66C2", fontSize: "18px" }}
            ></i>
            <span>LinkedIn</span>
          </button>
          <button className="share-option" onClick={handleWhatsApp}>
            <FaWhatsapp size={18} color="#25D366" />
            <span>WhatsApp</span>
          </button>
          <button className="share-option" onClick={handleEmail}>
            <FiMail size={18} color="#EA4335" />
            <span>Email</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default ShareButton;
