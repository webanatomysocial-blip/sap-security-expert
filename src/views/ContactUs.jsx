import React, { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { 
  HiOutlineMail, 
  HiOutlineChatAlt2, 
  HiOutlineShieldCheck, 
  HiOutlineUserGroup,
  HiOutlinePhone,
  HiOutlineGlobeAlt,
  HiOutlineClock,
  HiOutlineLockClosed
} from "react-icons/hi";
import { FaLinkedinIn, FaPaperPlane } from "react-icons/fa";
import { useToast } from "../context/ToastContext";
import { getCaptcha } from "../services/api";
import logo from "../assets/sapsecurityexpert-black.png";
import "../css/ContactForm.css";

const ContactUs = () => {
    const reasons = [
        "Advertise with you",
        "Questions about Contribution",
        "Interested to be part of the Podcast/Interview",
        "Interested in showcasing our product",
        "Others",
    ];

    const [formData, setFormData] = useState({
        name: "",
        companyName: "",
        email: "",
        position: "",
        location: "",
        reason: "",
        description: "",
    });

    const { addToast } = useToast();
    const [loading, setLoading] = useState(false);
    const [captchaData, setCaptchaData] = useState({ question: "...", loading: true });
    const [captchaAnsInput, setCaptchaAnsInput] = useState("");

    useEffect(() => {
        fetchCaptcha();
    }, []);

  const fetchCaptcha = async () => {
    try {
      const res = await getCaptcha();
      setCaptchaData({ question: res.data.question, loading: false });
    } catch (err) {
      console.error(err);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { api } = await import("../services/api");
      const res = await api.post('/send_mail.php', {
        ...formData,
        captchaAns: captchaAnsInput
      });

      if (res.data.status === "success") {
        addToast(
          "Message sent successfully! We will contact you shortly.",
          "success",
        );
        setFormData({
            name: "", companyName: "", email: "", position: "", 
            location: "", reason: "", description: ""
        });
        setCaptchaAnsInput("");
      } else {
        addToast(res.data.message || "Failed to send message.", "error");
      }
    } catch (err) {
      addToast(err.response?.data?.message || "Error sending message.", "error");
      fetchCaptcha();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="contact-page">
      <Helmet>
        <title>Contact Us | SAP Security Expert</title>
        <meta
          name="description"
          content="Get in touch with SAP Security Expert team."
        />
      </Helmet>

      <div className="contact-hero">
        <div className="contact-hero-left">
          <h1>Let's Connect!</h1>
          <p className="hero-subtitle-1">
            Have a question, feedback, or partnership opportunity?<br />
            We'd love to hear from you.
          </p>

          <div className="contact-features">
            <div className="feature-item">
              <div className="feature-icon"><HiOutlineChatAlt2 /></div>
              <div className="feature-text">
                <h4>Quick Response</h4>
                <p>We typically respond within 24 hours</p>
              </div>
            </div>
            <div className="feature-item">
              <div className="feature-icon"><HiOutlineShieldCheck /></div>
              <div className="feature-text">
                <h4>Trusted by Experts</h4>
                <p>Join 1000+ SAP security professionals</p>
              </div>
            </div>
            <div className="feature-item">
              <div className="feature-icon"><HiOutlineUserGroup /></div>
              <div className="feature-text">
                <h4>Community Driven</h4>
                <p>Built by experts, for experts</p>
              </div>
            </div>
          </div>
        </div>

        <div className="contact-hero-right">
          <div className="illustration-wrapper">
             <svg viewBox="0 0 400 350" className="hero-svg">
               <defs>
                 <filter id="soft-shadow" x="-10%" y="-10%" width="130%" height="130%">
                   <feDropShadow dx="0" dy="10" stdDeviation="8" floodColor="#f43f5e" floodOpacity="0.08" />
                 </filter>
                 <filter id="bubble-shadow" x="-20%" y="-20%" width="140%" height="140%">
                   <feDropShadow dx="0" dy="4" stdDeviation="5" floodColor="#000000" floodOpacity="0.1" />
                 </filter>
               </defs>
               
               {/* Background soft orange shape */}
               <path d="M100 210 C80 110, 280 70, 330 170 C380 270, 180 300, 100 210 Z" fill="#fff3f0" opacity="0.7" />
               
               {/* Decorative dots grid */}
               <g fill="#fcd9d0" opacity="0.6">
                 <circle cx="330" cy="50" r="2.5" />
                 <circle cx="345" cy="50" r="2.5" />
                 <circle cx="360" cy="50" r="2.5" />
                 <circle cx="330" cy="65" r="2.5" />
                 <circle cx="345" cy="65" r="2.5" />
                 <circle cx="360" cy="65" r="2.5" />
                 <circle cx="330" cy="80" r="2.5" />
                 <circle cx="345" cy="80" r="2.5" />
                 <circle cx="360" cy="80" r="2.5" />
               </g>

               {/* Dashed flight path */}
               <path d="M 80 140 Q 150 40, 220 110" stroke="#93c5fd" strokeWidth="2" strokeDasharray="6 4" fill="none" />
               
               {/* Paper Plane */}
               <g transform="translate(70, 145) rotate(-35)">
                 <path d="M 0 0 L 22 7 L 7 12 L 10 18 L 12 12 Z" fill="#3b82f6" />
               </g>
               {/* Open Envelope Back */}
               <path d="M120 160 L320 160 L320 270 C320 278, 314 284, 306 284 L134 284 C126 284, 120 278, 120 270 Z" fill="#fcd9d0" filter="url(#soft-shadow)" />

               {/* Envelope Flap (open and behind card) */}
               <path d="M120 160 L220 90 L320 160 Z" fill="#fff3f0" />

               {/* White Card coming out */}
               <g transform="translate(140, 100)">
                 <rect x="0" y="0" width="160" height="110" rx="8" fill="#ffffff" stroke="#f3f4f6" strokeWidth="1" />
                 <foreignObject x="15" y="25" width="130" height="60">
                   <div style={{ display: "flex", justifyContent: "center", alignItems: "center", width: "100%", height: "100%" }}>
                     <div style={{ width: "50px", height: "50px", overflow: "hidden", borderRadius: "50%" }}>
                       <img 
                         src={logo.src || logo} 
                         alt="SAP Security Expert Logo" 
                         style={{ height: "100%", width: "auto", maxWidth: "none", objectFit: "cover", objectPosition: "left" }} 
                       />
                     </div>
                   </div>
                 </foreignObject>
               </g>

               {/* Envelope Front pocket */}
               <path d="M120 185 L220 230 L320 185 L320 270 C320 278, 314 284, 306 284 L134 284 C126 284, 120 278, 120 270 Z" fill="#fba490" />
               <path d="M120 185 L220 230 L320 185" stroke="#ee5e42" strokeWidth="1" fill="none" />

               {/* Talk bubble icon on envelope bottom right */}
               <g transform="translate(285, 220)" filter="url(#bubble-shadow)">
                 <rect x="0" y="0" width="60" height="38" rx="14" fill="#ffffff" />
                 <path d="M 15 38 L 10 45 L 22 38 Z" fill="#ffffff" />
                 <circle cx="20" cy="19" r="3" fill="#ee5e42" />
                 <circle cx="30" cy="19" r="3" fill="#ee5e42" />
                 <circle cx="40" cy="19" r="3" fill="#ee5e42" />
               </g>
             </svg>
          </div>
        </div>
      </div>

      <div className="contact-content">
        <div className="contact-form-wrapper">
          <h3>Send Us a Message</h3>
          <form onSubmit={handleSubmit}>
            <div className="contact-form-grid">
              <div className="form-group">
                <label className="form-label">Name *</label>
                <input
                  type="text"
                  className="form-control"
                  name="name"
                  required
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Enter your full name"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Email ID *</label>
                <input
                  type="email"
                  className="form-control"
                  name="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="Enter your email address"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Company Name</label>
                <input
                  type="text"
                  className="form-control"
                  name="companyName"
                  value={formData.companyName}
                  onChange={handleChange}
                  placeholder="Enter your company name"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Position</label>
                <input
                  type="text"
                  className="form-control"
                  name="position"
                  value={formData.position}
                  onChange={handleChange}
                  placeholder="Enter your current position"
                />
              </div>

              <div className="form-group full-width">
                <label className="form-label">Subject *</label>
                <select
                  className="form-control"
                  name="reason"
                  required
                  value={formData.reason}
                  onChange={handleChange}
                >
                  <option value="" disabled>Select a subject</option>
                  {reasons.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group full-width">
                <label className="form-label">Your Message *</label>
                <textarea
                  className="form-control"
                  name="description"
                  rows="5"
                  value={formData.description}
                  onChange={handleChange}
                  required
                  placeholder="Tell us how we can help you..."
                ></textarea>
              </div>

              <div className="form-group full-width captcha-group">
                <label className="form-label">Captcha: {captchaData.question} *</label>
                <input
                  type="number"
                  className="form-control"
                  value={captchaAnsInput}
                  onChange={(e) => setCaptchaAnsInput(e.target.value)}
                  required
                  placeholder="Enter result"
                />
              </div>

              <div className="form-actions full-width">
                <button type="submit" className="btn-send" disabled={loading}>
                  <FaPaperPlane /> {loading ? "Sending..." : "Send Message"}
                </button>
                <span className="secure-note">
                  <HiOutlineLockClosed /> Your information is secure and will not be shared.
                </span>
              </div>
            </div>
            <input type="hidden" name="location" value={formData.location} />
          </form>
        </div>

        <div className="contact-sidebar">
          <div className="sidebar-card">
            <h4>Other Ways to Reach Us</h4>
            <ul className="reach-list">
              <li>
                <a href="mailto:info@sapsecurityexpert.com" className="reach-link">
                  <div className="reach-icon"><HiOutlineMail /></div>
                  <div className="reach-text">
                    <strong>Email Us</strong>
                    <span>info@sapsecurityexpert.com</span>
                  </div>
                </a>
              </li>
              <li>
                <a href="tel:+914041234567" className="reach-link">
                  <div className="reach-icon"><HiOutlinePhone /></div>
                  <div className="reach-text">
                    <strong>Call Us</strong>
                    <span>+91 40 4123 4567</span>
                  </div>
                </a>
              </li>
              <li>
                <a href="https://www.linkedin.com/company/sapsecurityexpert/?original_referer=http%3A%2F%2Flocalhost%3A3000%2F" target="_blank" rel="noopener noreferrer" className="reach-link">
                  <div className="reach-icon"><FaLinkedinIn /></div>
                  <div className="reach-text">
                    <strong>LinkedIn</strong>
                    <span>Connect with us on LinkedIn</span>
                  </div>
                </a>
              </li>
              <li>
                <a href="https://www.sapsecurityexpert.com" target="_blank" rel="noopener noreferrer" className="reach-link">
                  <div className="reach-icon"><HiOutlineGlobeAlt /></div>
                  <div className="reach-text">
                    <strong>Website</strong>
                    <span>www.sapsecurityexpert.com</span>
                  </div>
                </a>
              </li>
            </ul>
          </div>

          <div className="sidebar-card">
            <h4>We're Here to Help!</h4>
            <p>Whether you have a question about our content, partnership, or community, our team is here to help.</p>
            <div className="business-hours">
              <HiOutlineClock />
              <div className="bh-text">
                <strong>Business Hours</strong>
                <span>Mon - Fri: 9:00 AM - 6:00 PM IST</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContactUs;
