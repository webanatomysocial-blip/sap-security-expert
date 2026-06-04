import React, { useState } from "react";
import { HiOutlineArrowRight } from "react-icons/hi";
// next-disabled: import "../css/ContactForm.css";
import { useToast } from "../context/ToastContext";

const ContactForm = () => {
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    linkedin: "",
    country: "",
    organization: "",
    role: "",
    expertise: [], // Checkbox
    expertiseOther: "",
    experienceYears: "",
    bio: "",
    contributionType: [], // Checkbox
    proposedTopics: "",
    contributedElsewhere: "No",
    publishedWorkLinks: "",
    frequency: "One-time",
    motivation: "",
    confirmOriginality: false,
    consentEditorial: false,
    acceptTerms: false,
    profilePhoto: null, // text for now or file input?
    personalWebsite: "",
    twitterHandle: "",
  });

  /* eslint-disable no-unused-vars */
  const [honeyPot, setHoneyPot] = useState("");
  /* eslint-enable no-unused-vars */

  const expertiseOptions = [
    "SAP Security",
    "SAP GRC (Access Control, Process Control, RM)",
    "Audit & Compliance",
    "Cybersecurity",
    "IAM / Cloud Security",
    "Data Security & Privacy",
  ];

  const contributionTypes = [
    "Articles / Blogs",
    "Case Studies",
    "Technical Tutorials",
    "Opinion / Thought Leadership",
    "Research / Whitepapers",
    "Tools / Utilities",
  ];

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    if (type === "checkbox") {
      if (["expertise", "contributionType"].includes(name)) {
        // Multi-select arrays
        setFormData((prev) => {
          const current = prev[name];
          if (checked) return { ...prev, [name]: [...current, value] };
          else
            return {
              ...prev,
              [name]: current.filter((item) => item !== value),
            };
        });
      } else {
        // Simple boolean toggle
        setFormData((prev) => ({ ...prev, [name]: checked }));
      }
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (honeyPot) return; // Spam trap

    alert("Thank you! Your application has been submitted.");
  };

  return (
    <div className="contact-form-container">
      <div className="contact-form-header">
        <h2>Become a Contributor</h2>
        <p>
          Join our community of SAP Security experts. Share your knowledge and
          grow your influence.
        </p>
      </div>

      <form
        className="contact-form"
        onSubmit={handleSubmit}
        style={{ maxWidth: "800px", margin: "0 auto" }}
      >
        {/* 1. Basic Information */}
        <section className="form-section">
          <h3>1. Basic Information</h3>
          <div className="form-row">
            <div className="form-group">
              <label>Full Name *</label>
              <input
                type="text"
                name="fullName"
                required
                value={formData.fullName}
                onChange={handleChange}
              />
            </div>
            <div className="form-group">
              <label>Email Address *</label>
              <input
                type="email"
                name="email"
                required
                value={formData.email}
                onChange={handleChange}
              />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>LinkedIn Profile URL *</label>
              <input
                type="url"
                name="linkedin"
                required
                value={formData.linkedin}
                onChange={handleChange}
              />
            </div>
            <div className="form-group">
              <label>Country / Region *</label>
              <input
                type="text"
                name="country"
                required
                value={formData.country}
                onChange={handleChange}
              />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Organization / Company Name</label>
              <input
                type="text"
                name="organization"
                value={formData.organization}
                onChange={handleChange}
              />
            </div>
            <div className="form-group">
              <label>Current Role / Designation</label>
              <input
                type="text"
                name="role"
                value={formData.role}
                onChange={handleChange}
              />
            </div>
          </div>
        </section>

        {/* 2. Contributor Profile */}
        <section className="form-section">
          <h3>2. Contributor Profile</h3>
          <div className="form-group">
            <label>Area(s) of Expertise</label>
            <div className="checkbox-group">
              {expertiseOptions.map((opt) => (
                <label key={opt} className="checkbox-label">
                  <input
                    type="checkbox"
                    name="expertise"
                    value={opt}
                    checked={formData.expertise.includes(opt)}
                    onChange={handleChange}
                  />
                  {opt}
                </label>
              ))}
            </div>
          </div>
          <div className="form-group">
            <label>Other Expertise</label>
            <input
              type="text"
              name="expertiseOther"
              value={formData.expertiseOther}
              onChange={handleChange}
              placeholder="Specify if any"
            />
          </div>
          <div className="form-group">
            <label>Years of Experience</label>
            <input
              type="number"
              name="experienceYears"
              value={formData.experienceYears}
              onChange={handleChange}
            />
          </div>
          <div className="form-group">
            <label>Short Bio (100–150 words)</label>
            <textarea
              name="bio"
              rows="4"
              value={formData.bio}
              onChange={handleChange}
            ></textarea>
          </div>
        </section>

        {/* 3. Contribution Details */}
        <section className="form-section">
          <h3>3. Contribution Details</h3>
          <div className="form-group">
            <label>Type of Contribution</label>
            <div className="checkbox-group">
              {contributionTypes.map((opt) => (
                <label key={opt} className="checkbox-label">
                  <input
                    type="checkbox"
                    name="contributionType"
                    value={opt}
                    checked={formData.contributionType.includes(opt)}
                    onChange={handleChange}
                  />
                  {opt}
                </label>
              ))}
            </div>
          </div>
          <div className="form-group">
            <label>Proposed Topic(s) / Themes</label>
            <textarea
              name="proposedTopics"
              rows="3"
              value={formData.proposedTopics}
              onChange={handleChange}
              placeholder="What would you like to write about?"
            ></textarea>
          </div>
          <div className="form-group">
            <label>Have you contributed elsewhere?</label>
            <select
              name="contributedElsewhere"
              value={formData.contributedElsewhere}
              onChange={handleChange}
            >
              <option value="No">No</option>
              <option value="Yes">Yes</option>
            </select>
          </div>
          {formData.contributedElsewhere === "Yes" && (
            <div className="form-group">
              <label>Links to Published Work</label>
              <textarea
                name="publishedWorkLinks"
                rows="2"
                value={formData.publishedWorkLinks}
                onChange={handleChange}
              ></textarea>
            </div>
          )}
        </section>

        {/* 4. Content & Availability */}
        <section className="form-section">
          <h3>4. Content & Availability</h3>
          <div className="form-group">
            <label>Preferred Contribution Frequency</label>
            <select
              name="frequency"
              value={formData.frequency}
              onChange={handleChange}
            >
              <option value="One-time">One-time</option>
              <option value="Monthly">Monthly</option>
              <option value="Quarterly">Quarterly</option>
              <option value="Ad-hoc">Ad-hoc</option>
            </select>
          </div>
          <div className="form-group">
            <label>Primary Motivation</label>
            <input
              type="text"
              name="motivation"
              value={formData.motivation}
              onChange={handleChange}
              placeholder="Knowledge sharing, visibility, etc."
            />
          </div>
        </section>

        {/* 5. Compliance & Consent */}
        <section className="form-section">
          <h3>5. Compliance & Consent</h3>
          <div className="checkbox-label-block">
            <label>
              <input
                type="checkbox"
                name="confirmOriginality"
                checked={formData.confirmOriginality}
                onChange={handleChange}
                required
              />
              I confirm that the submitted content will be original and not
              infringe on copyrights.
            </label>
          </div>
          <div className="checkbox-label-block">
            <label>
              <input
                type="checkbox"
                name="consentEditorial"
                checked={formData.consentEditorial}
                onChange={handleChange}
                required
              />
              I agree that the editorial team may review, edit, or suggest
              changes before publishing.
            </label>
          </div>
          <div className="checkbox-label-block">
            <label>
              <input
                type="checkbox"
                name="acceptTerms"
                checked={formData.acceptTerms}
                onChange={handleChange}
                required
              />
              I accept the Terms & Community Guidelines.
            </label>
          </div>
        </section>

        {/* 6. Optional */}
        <section className="form-section">
          <h3>6. Optional Info</h3>
          <div className="form-row">
            <div className="form-group">
              <label>Personal Website / Blog</label>
              <input
                type="url"
                name="personalWebsite"
                value={formData.personalWebsite}
                onChange={handleChange}
              />
            </div>
            <div className="form-group">
              <label>Twitter / X Handle</label>
              <input
                type="text"
                name="twitterHandle"
                value={formData.twitterHandle}
                onChange={handleChange}
              />
            </div>
          </div>
        </section>

        <button
          type="submit"
          className="submit-btn"
          style={{ width: "100%", marginTop: "30px" }}
        >
          Apply to Become a Contributor
          <HiOutlineArrowRight size={20} />
        </button>
      </form>
    </div>
  );
};

export default ContactForm;
