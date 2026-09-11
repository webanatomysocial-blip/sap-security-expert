import { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
// next-disabled: import "../css/BecomeContributor.css";
import { applyAmbassador } from "../services/api";
import { useToast } from "../context/ToastContext";
import { COUNTRIES, statesForCountry, citiesForCountry } from "../constants/countries";
import SearchableSelect from "../components/SearchableSelect";

import useScrollLock from "../hooks/useScrollLock";
import useGeoCountryLock from "../hooks/useGeoCountryLock";

const AmbassadorApplication = () => {
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState(null); // success | error
  const { addToast } = useToast();
  const [previewUrl, setPreviewUrl] = useState(null);

  useScrollLock(showTermsModal);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    linkedin: "",
    country: "",
    state: "",
    city: "",
    organization: "",

    // Q1
    yearsExperience: "",
    // Q2
    expertise: {
      s4hanaSecurity: false,
      sapGrc: false,
      sapIag: false,
      btpSecurity: false,
      sapCyber: false,
      iam: false,
      sapAudit: false,
      other: false,
    },
    otherExpertiseText: "",
    // Q3
    currentRole: "",
    otherCurrentRoleText: "",
    // Q4
    communityContribution: {
      publishedArticles: false,
      presentedConferences: false,
      webinars: false,
      podcasts: false,
      sapCommunity: false,
      mentored: false,
      research: false,
      organizedEvents: false,
      none: false,
    },
    // Q5
    contributionLinks: "",
    // Q6
    mentorshipExperience: "",
    // Q7
    communityHelpingFrequency: "",
    // Q8
    contributionPlan: "",
    // Q9
    countryChallenge: "",
    // Q10
    initiativeExample: "",
    // Q11
    ambassadorMotivations: {
      helpConnect: false,
      shareKnowledge: false,
      mentor: false,
      representLocal: false,
      contributeResearch: false,
      expandNetwork: false,
      buildBrand: false,
      promoteCompany: false,
      other: false,
    },
    otherMotivationText: "",
    // Q12
    contributionWillingness: "",
    // Q13
    ambassadorDefinition: "",

    agree1: false,
    agree2: false,
    agree3: false,

    profilePhoto: null,
  });

  const stateOptions = useMemo(() => statesForCountry(formData.country), [formData.country]);
  const cityOptions = useMemo(() => citiesForCountry(formData.country, formData.state), [formData.country, formData.state]);

  const geo = useGeoCountryLock();
  useEffect(() => {
    if (geo.status !== "ready" || !geo.country) return;
    setFormData((f) => ({
      ...f,
      country: geo.country,
      state: geo.state || f.state,
      city: geo.city || f.city,
    }));
  }, [geo.status, geo.country, geo.state, geo.city]);

  const handleInputChange = (e) => {
    const { name, value, type } = e.target;
    if (type === "number" && value < 0) return;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleCheckboxGroupChange = (section, key, checked) => {
    setFormData((prev) => ({ ...prev, [section]: { ...prev[section], [key]: checked } }));
  };

  const handleInitialSubmit = (e) => {
    e.preventDefault();
    if (geo.status === "ready" && geo.country && formData.country !== geo.country) {
      addToast(`Submission not allowed: your detected country is ${geo.country}, which does not match "${formData.country}".`, "error");
      setFormData((f) => ({ ...f, country: geo.country, state: geo.state || f.state, city: geo.city || f.city }));
      return;
    }
    setShowTermsModal(true);
  };

  const [captchaData, setCaptchaData] = useState({ question: "2 + 2 = ?", loading: true });
  const [captchaAnsInput, setCaptchaAnsInput] = useState("");

  useEffect(() => {
    fetchCaptcha();
  }, []);

  const fetchCaptcha = async () => {
    try {
      const { getCaptcha } = await import("../services/api");
      const res = await getCaptcha();
      setCaptchaData({ question: res.data.question, loading: false });
    } catch (err) {
      console.error("Failed to load captcha", err);
    }
  };

  const handleFinalSubmit = async () => {
    setShowTermsModal(false);
    setIsSubmitting(true);
    setSubmitStatus(null);

    const payload = new FormData();
    Object.keys(formData).forEach((key) => {
      if (key === "expertise" || key === "communityContribution" || key === "ambassadorMotivations") {
        payload.append(key, JSON.stringify(formData[key]));
      } else if (key === "profilePhoto") {
        if (formData.profilePhoto instanceof File) payload.append("profilePhoto", formData.profilePhoto);
      } else {
        payload.append(key, formData[key] || "");
      }
    });
    payload.append("captchaAns", captchaAnsInput);

    try {
      const res = await applyAmbassador(payload);
      if (res.data?.status === "success") {
        setSubmitStatus("success");
        addToast("Application submitted successfully!", "success");
        window.scrollTo(0, 0);
      } else {
        setSubmitStatus("error");
        addToast(res.data?.message || "Something went wrong while submitting your application. Please try again.", "error");
        fetchCaptcha();
      }
    } catch (error) {
      setSubmitStatus("error");
      const errorMsg = error.response?.data?.message || "We're having trouble connecting to the system. Please check your internet connection and try again.";
      addToast(errorMsg, "error");
      fetchCaptcha();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="become-contributor-page">
      <div className="contributor-hero">
        <div className="container">
          <h1>Country Ambassador Application</h1>
          <p>Bring your local expertise into the global SAP Security conversation.</p>
        </div>
      </div>

      <div className="container contributor-content">
        <div id="application-form" className="application-form-container">
          {submitStatus === "success" ? (
            <div className="success-message-box">
              <div className="success-icon-wrapper">
                <i className="bi bi-check-lg"></i>
              </div>
              <h3>Ambassador Application Submitted!</h3>
              <p className="success-desc">
                Thank you for applying for the <strong>Country Ambassador</strong> recognition.
                Our community team will review your qualifications and experience against our community criteria.
              </p>

              <div className="success-steps-box">
                <div className="success-steps-title">
                  <i className="bi bi-info-circle-fill"></i> What Happens Next
                </div>
                <ul className="success-steps-list">
                  <li>
                    <i className="bi bi-check-circle-fill"></i>
                    <span><strong>Qualification Review:</strong> Our team will review your application within 3–5 business days.</span>
                  </li>
                  <li>
                    <i className="bi bi-check-circle-fill"></i>
                    <span><strong>Email Update:</strong> You will receive a confirmation & status update at <strong>{formData.email}</strong> once your review is complete.</span>
                  </li>
                  <li>
                    <i className="bi bi-check-circle-fill"></i>
                    <span><strong>Badge & Recognition:</strong> Upon approval, your official Country Ambassador badge will appear immediately on your public profile and directory listing.</span>
                  </li>
                </ul>
              </div>

              <div className="success-buttons-group">
                <Link to="/" className="btn-apply-now">
                  <i className="bi bi-house-door-fill"></i> Return to Home
                </Link>
                <Link
                  to="/become-a-contributor"
                  state={{
                    fullName: formData.fullName,
                    email: formData.email,
                    linkedin: formData.linkedin,
                    country: formData.country,
                    state: formData.state,
                    city: formData.city,
                    organization: formData.organization,
                  }}
                  className="btn-apply-now-outline"
                >
                  <i className="bi bi-pen-fill"></i> Apply as a Contributor
                </Link>
                <Link to="/country-ambassadors" className="btn-apply-now-outline" style={{ borderStyle: "dashed" }}>
                  <i className="bi bi-globe"></i> View Ambassador Directory
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleInitialSubmit} className="detailed-form">
              {/* Section 1: Basic Info */}
              <div className="form-section">
                <h3>1. Basic Information</h3>
                <div className="form-row">
                  <div className="form-group half">
                    <label className="form-label">Full Name *</label>
                    <input type="text" className="form-control" name="fullName" value={formData.fullName} onChange={handleInputChange} required />
                  </div>
                  <div className="form-group half">
                    <label className="form-label">Email Address *</label>
                    <input type="email" className="form-control" name="email" value={formData.email} onChange={handleInputChange} required />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group half">
                    <label className="form-label">LinkedIn Profile URL *</label>
                    <input type="url" className="form-control" name="linkedin" value={formData.linkedin} onChange={handleInputChange} required />
                  </div>
                  <div className="form-group half">
                    <label className="form-label">Country *</label>
                    <SearchableSelect
                      className="form-control"
                      value={formData.country}
                      onChange={(v) => {
                        if (geo.status === "ready" && geo.country && v && v !== geo.country) {
                          addToast(`Only your detected country (${geo.country}) is allowed. Selecting a different country is not permitted.`, "error");
                          setFormData((f) => ({ ...f, country: geo.country, state: geo.state || f.state, city: geo.city || f.city }));
                          return;
                        }
                        setFormData((f) => ({ ...f, country: v, state: "", city: "" }));
                      }}
                      options={geo.status === "ready" && geo.country ? COUNTRIES.filter((c) => c.name === geo.country) : COUNTRIES}
                      placeholder={geo.status === "loading" ? "Detecting your location..." : "Type to search your country"}
                      required
                      onUseCurrentLocation={
                        geo.status === "ready" && geo.country
                          ? () => setFormData((f) => ({ ...f, country: geo.country, state: geo.state || f.state, city: geo.city || f.city }))
                          : undefined
                      }
                      locationTooltip={`Use detected country (${geo.country || "current location"})`}
                    />
                    {geo.status === "denied" && (
                      <div style={{ margin: "8px 0 0", padding: "8px 12px", background: "#fffbeb", border: "1px solid #fde68a", borderRadius: "6px", fontSize: "0.78rem", color: "#92400e" }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "8px" }}>
                          <span>
                            <i className="bi bi-geo-alt-fill" style={{ marginRight: 5, color: "#d97706" }} />
                            Location access is blocked in your browser.
                          </span>
                          {geo.requestLocation && (
                            <button
                              type="button"
                              onClick={geo.requestLocation}
                              style={{
                                background: "#fef3c7",
                                border: "1px solid #fcd34d",
                                borderRadius: "4px",
                                padding: "3px 10px",
                                fontSize: "0.75rem",
                                fontWeight: 600,
                                color: "#b45309",
                                cursor: "pointer",
                              }}
                            >
                              📍 Retry Location
                            </button>
                          )}
                        </div>
                        {geo.showHelp && (
                          <div style={{ marginTop: "6px", paddingTop: "6px", borderTop: "1px dashed #fde68a", fontSize: "0.74rem", color: "#78350f" }}>
                            To allow: Click the <strong>lock / tune icon 🔒</strong> next to the URL in your browser bar ➔ change <strong>Location</strong> to <em>Allow</em> ➔ then click <strong>Retry Location</strong>.
                          </div>
                        )}
                      </div>
                    )}
                    {geo.status === "ready" && (
                      <p style={{ margin: "6px 0 0", fontSize: "0.75rem", color: "#16a34a", fontWeight: 500 }}>
                        <i className="bi bi-geo-alt-fill" style={{ marginRight: 4 }} />
                        Verified from your current location ({geo.country}). Other countries are not allowed.
                      </p>
                    )}
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group half">
                    <label className="form-label">State / Province</label>
                    <SearchableSelect
                      className="form-control"
                      value={formData.state}
                      onChange={(v) => setFormData((f) => ({ ...f, state: v, city: "" }))}
                      options={stateOptions}
                      placeholder={formData.country ? "Type to search" : "Select a country first"}
                      disabled={!formData.country || stateOptions.length === 0}
                      onUseCurrentLocation={
                        geo.status === "ready" && geo.state
                          ? () => setFormData((f) => ({ ...f, state: geo.state, city: geo.city || f.city }))
                          : undefined
                      }
                      locationTooltip={`Use detected state (${geo.state || "current location"})`}
                    />
                  </div>
                  <div className="form-group half">
                    <label className="form-label">City / Region</label>
                    <SearchableSelect
                      className="form-control"
                      value={formData.city}
                      onChange={(v) => setFormData((f) => ({ ...f, city: v }))}
                      options={cityOptions}
                      placeholder={formData.country ? "Type to search" : "Select a country first"}
                      disabled={!formData.country}
                      onUseCurrentLocation={
                        geo.status === "ready" && geo.city
                          ? () => setFormData((f) => ({ ...f, city: geo.city }))
                          : undefined
                      }
                      locationTooltip={`Use detected city (${geo.city || "current location"})`}
                    />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group half">
                    <label className="form-label">Organization / Company Name</label>
                    <input type="text" className="form-control" name="organization" value={formData.organization} onChange={handleInputChange} />
                  </div>
                  <div className="form-group half">
                    <label className="form-label">Current Role / Title</label>
                    <input
                      type="text" className="form-control" name="currentRole" value={formData.currentRole}
                      onChange={handleInputChange} placeholder="e.g. Senior SAP Security Architect"
                    />
                  </div>
                </div>
              </div>

              {/* Section 2: Experience & Expertise */}
              <div className="form-section">
                <h3>2. Experience &amp; Expertise</h3>

                <div className="form-group">
                  <label className="form-label">How many years of professional experience do you have in SAP Security or related areas? *</label>
                  <select className="form-control" name="yearsExperience" value={formData.yearsExperience} onChange={handleInputChange} required>
                    <option value="">Select...</option>
                    <option value="8–12 years">8–12 years</option>
                    <option value="12-15 years">12-15 years</option>
                    <option value="15+ years">15+ years</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Which areas of SAP Security best represent your expertise? * <small>Select all that apply.</small></label>
                  <div className="checkbox-group">
                    {[
                      { key: "s4hanaSecurity", label: "S/4HANA Security" },
                      { key: "sapGrc", label: "SAP GRC / Access Governance" },
                      { key: "sapIag", label: "SAP IAG" },
                      { key: "btpSecurity", label: "BTP Security" },
                      { key: "sapCyber", label: "SAP Cybersecurity" },
                      { key: "iam", label: "IAM / Identity" },
                      { key: "sapAudit", label: "SAP Audit / Risk & Compliance" },
                      { key: "other", label: "Other" },
                    ].map(({ key, label }) => (
                      <label key={key} className="checkbox-item">
                        <input
                          type="checkbox"
                          checked={formData.expertise[key]}
                          onChange={(e) => handleCheckboxGroupChange("expertise", key, e.target.checked)}
                        />
                        <div className="box-indicator"></div>
                        <span>{label}</span>
                      </label>
                    ))}
                  </div>
                  {formData.expertise.other && (
                    <input
                      type="text" className="form-control" name="otherExpertiseText" style={{ marginTop: 10 }}
                      placeholder="Specify your other area of expertise" value={formData.otherExpertiseText} onChange={handleInputChange}
                    />
                  )}
                </div>

                <div className="form-group">
                  <label className="form-label">How would you describe your current role in the SAP ecosystem? *</label>
                  <select className="form-control" name="currentRole" value={formData.currentRole} onChange={handleInputChange} required>
                    <option value="">Select...</option>
                    <option value="Author (SAP press books etc.,)">Author (SAP press books etc.,)</option>
                    <option value="SAP Security Manager / Leader">SAP Security Manager / Leader</option>
                    <option value="CISO / Security Leadership">CISO / Security Leadership</option>
                    <option value="IAM / Cybersecurity Professional">IAM / Cybersecurity Professional</option>
                    <option value="Technical Evangelist">Technical Evangelist</option>
                    <option value="Other">Other</option>
                  </select>
                  {formData.currentRole === "Other" && (
                    <input
                      type="text" className="form-control" name="otherCurrentRoleText" style={{ marginTop: 10 }}
                      placeholder="Specify your current role" value={formData.otherCurrentRoleText} onChange={handleInputChange}
                    />
                  )}
                </div>
              </div>

              {/* Section 3: Community Contribution */}
              <div className="form-section">
                <h3>3. Community Contribution</h3>

                <div className="form-group">
                  <label className="form-label">Which of the following best demonstrates your contribution to the SAP Security community? * <small>Select all that apply.</small></label>
                  <div className="checkbox-group">
                    {[
                      { key: "publishedArticles", label: "Published technical articles or Expert Papers" },
                      { key: "presentedConferences", label: "Presented at conferences or industry events" },
                      { key: "webinars", label: "Conducted webinars or expert sessions" },
                      { key: "podcasts", label: "Participated in podcasts" },
                      { key: "sapCommunity", label: "Contributed to SAP Community or other professional communities" },
                      { key: "mentored", label: "Mentored SAP Security professionals" },
                      { key: "research", label: "Conducted research or surveys" },
                      { key: "organizedEvents", label: "Organized community events or discussions" },
                      { key: "none", label: "I have not yet made a significant community contribution" },
                    ].map(({ key, label }) => (
                      <label key={key} className="checkbox-item">
                        <input
                          type="checkbox"
                          checked={formData.communityContribution[key]}
                          onChange={(e) => handleCheckboxGroupChange("communityContribution", key, e.target.checked)}
                        />
                        <div className="box-indicator"></div>
                        <span>{label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">
                    Please share links to any articles, presentations, podcasts, research, SAP Community contributions or other professional work you have published. *
                    <br /><small>Minimum 10 active links are needed — one per line.</small>
                  </label>
                  <textarea
                    className="form-control" name="contributionLinks" rows="5" value={formData.contributionLinks}
                    onChange={handleInputChange} required
                    placeholder={"https://...\nhttps://...\nhttps://..."}
                  ></textarea>
                </div>

                <div className="form-group">
                  <label className="form-label">Have you mentored or supported other SAP Security professionals? *</label>
                  <select className="form-control" name="mentorshipExperience" value={formData.mentorshipExperience} onChange={handleInputChange} required>
                    <option value="">Select...</option>
                    <option value="Yes, formally">Yes, formally</option>
                    <option value="Yes, informally">Yes, informally</option>
                    <option value="Occasionally">Occasionally</option>
                    <option value="No">No</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Have you actively helped professionals in your local SAP Security community connect, learn or collaborate? *</label>
                  <select className="form-control" name="communityHelpingFrequency" value={formData.communityHelpingFrequency} onChange={handleInputChange} required>
                    <option value="">Select...</option>
                    <option value="Frequently">Frequently</option>
                    <option value="Occasionally">Occasionally</option>
                    <option value="Once or twice">Once or twice</option>
                    <option value="Not yet">Not yet</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">If selected as a Country Ambassador, how would you contribute to the SAP Security community in your country? *</label>
                  <textarea
                    className="form-control" name="contributionPlan" rows="4" value={formData.contributionPlan}
                    onChange={handleInputChange} required
                  ></textarea>
                </div>

                <div className="form-group">
                  <label className="form-label">What is one SAP security challenge or trend that professionals in your country should be paying more attention to? *</label>
                  <textarea
                    className="form-control" name="countryChallenge" rows="4" value={formData.countryChallenge}
                    onChange={handleInputChange} required
                  ></textarea>
                </div>

                <div className="form-group">
                  <label className="form-label">Tell us about one initiative, project, discussion, or contribution where you helped others in the SAP Security community. *</label>
                  <textarea
                    className="form-control" name="initiativeExample" rows="4" value={formData.initiativeExample}
                    onChange={handleInputChange} required
                  ></textarea>
                </div>

                <div className="form-group">
                  <label className="form-label">What motivates you to become an SAP Security Expert Country Ambassador? * <small>Select all that apply.</small></label>
                  <div className="checkbox-group">
                    {[
                      { key: "helpConnect", label: "Help professionals in my country connect" },
                      { key: "shareKnowledge", label: "Share knowledge and experience" },
                      { key: "mentor", label: "Mentor emerging professionals" },
                      { key: "representLocal", label: "Represent local SAP Security perspectives globally" },
                      { key: "contributeResearch", label: "Contribute to research and industry discussions" },
                      { key: "expandNetwork", label: "Expand my professional network" },
                      { key: "buildBrand", label: "Build my personal brand" },
                      { key: "promoteCompany", label: "Promote my company/services" },
                      { key: "other", label: "Other" },
                    ].map(({ key, label }) => (
                      <label key={key} className="checkbox-item">
                        <input
                          type="checkbox"
                          checked={formData.ambassadorMotivations[key]}
                          onChange={(e) => handleCheckboxGroupChange("ambassadorMotivations", key, e.target.checked)}
                        />
                        <div className="box-indicator"></div>
                        <span>{label}</span>
                      </label>
                    ))}
                  </div>
                  {formData.ambassadorMotivations.other && (
                    <input
                      type="text" className="form-control" name="otherMotivationText" style={{ marginTop: 10 }}
                      placeholder="Specify your other motivation" value={formData.otherMotivationText} onChange={handleInputChange}
                    />
                  )}
                </div>

                <div className="form-group">
                  <label className="form-label">Are you comfortable contributing to SAPSecurityExpert through activities such as Expert Papers, discussions, webinars, research, podcasts, or community initiatives? *</label>
                  <select className="form-control" name="contributionWillingness" value={formData.contributionWillingness} onChange={handleInputChange} required>
                    <option value="">Select...</option>
                    <option value="Yes, regularly">Yes, regularly</option>
                    <option value="Yes, occasionally">Yes, occasionally</option>
                    <option value="Maybe, depending on the initiative">Maybe, depending on the initiative</option>
                    <option value="No">No</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Which statement best describes what a Country Ambassador should be? *</label>
                  <select className="form-control" name="ambassadorDefinition" value={formData.ambassadorDefinition} onChange={handleInputChange} required>
                    <option value="">Select...</option>
                    <option value="Someone who promotes Security products and services">Someone who promotes Security products and services</option>
                    <option value="Someone who brings more members to the platform">Someone who brings more members to the platform</option>
                    <option value="Someone who represents their company within the community">Someone who represents their company within the community</option>
                    <option value="Someone who connects professionals, shares knowledge and brings local perspectives into the global SAP Security conversation">Someone who connects professionals, shares knowledge and brings local perspectives into the global SAP Security conversation</option>
                    <option value="Someone with the highest social-media following">Someone with the highest social-media following</option>
                  </select>
                </div>
              </div>

              {/* Section 4: Optional Info */}
              <div className="form-section">
                <h3>4. Optional Info</h3>
                <div className="form-row">
                  <div className="form-group full">
                    <label className="form-label">Profile Photo</label>
                    <input
                      type="file" className="form-control" name="profilePhoto"
                      onChange={(e) => {
                        const file = e.target.files[0];
                        if (file) {
                          setFormData({ ...formData, profilePhoto: file });
                          if (previewUrl) URL.revokeObjectURL(previewUrl);
                          setPreviewUrl(URL.createObjectURL(file));
                        }
                      }}
                      accept="image/*" style={{ padding: "8px" }}
                    />
                    <span className="image-hint">Recommended: 300x300 (1:1)</span>
                    {previewUrl && (
                      <div className="image-preview" style={{ marginTop: "10px" }}>
                        <img src={previewUrl} alt="Profile Preview" style={{ width: "100px", height: "100px", objectFit: "cover", borderRadius: "8px" }} />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Section 5: Bot Protection */}
              <div className="form-section">
                <h3>5. Bot Protection</h3>
                <div className="form-group full">
                  <label className="form-label">Security Challenge: {captchaData.question} *</label>
                  <input
                    type="number" className="form-control" value={captchaAnsInput}
                    onChange={(e) => setCaptchaAnsInput(e.target.value)} required placeholder="Enter result"
                  />
                  <small style={{ color: "var(--text-muted)", marginTop: "8px", display: "block" }}>
                    Please solve this simple math problem to verify you are human.
                  </small>
                </div>
              </div>

              <div className="form-footer">
                <button type="submit" className="btn-primary" disabled={isSubmitting || !captchaAnsInput}>
                  Summary & Terms <i className="bi bi-arrow-right"></i>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* T&C Modal */}
      {showTermsModal && createPortal(
        <div className="modal-overlay">
          <div
            className="modal-container large-modal"
            style={{ background: "#fff", borderRadius: "12px", display: "flex", flexDirection: "column", boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)" }}
          >
            <div className="modal-header">
              <h2>Read and Accept Terms &amp; Conditions</h2>
              <button className="close-modal" onClick={() => setShowTermsModal(false)}>×</button>
            </div>
            <div className="modal-body-scroll t-and-c-content" data-lenis-prevent>
              <p>
                The Country Ambassador recognition is an earned community designation, not a recruited position,
                sales role or employment opportunity. By submitting this application you confirm the information
                provided is accurate, and you agree that SAPSecurityExpert may review, edit, or verify the details
                you've shared, and may decline or revoke the recognition at its sole discretion.
              </p>
              <p>
                Any content you share as part of your contribution examples remains your own work; by referencing
                it here you confirm you have the rights to share it. For questions regarding these terms, contact{" "}
                hello AT sapsecurityexpert DOT com.
              </p>

              <hr style={{ margin: "20px 0px", borderTop: "1px solid rgb(226, 232, 240)" }} />

              <div className="consent-checkboxes">
                <label className="checkbox-item full-width">
                  <input type="checkbox" checked={formData.agree1} onChange={(e) => setFormData({ ...formData, agree1: e.target.checked })} />
                  <div className="box-indicator"></div>
                  <span>I confirm that the information provided in this application is accurate.</span>
                </label>
                <label className="checkbox-item full-width">
                  <input type="checkbox" checked={formData.agree2} onChange={(e) => setFormData({ ...formData, agree2: e.target.checked })} />
                  <div className="box-indicator"></div>
                  <span>I understand this is an earned community recognition, not an employment or sales role.</span>
                </label>
                <label className="checkbox-item full-width">
                  <input type="checkbox" checked={formData.agree3} onChange={(e) => setFormData({ ...formData, agree3: e.target.checked })} />
                  <div className="box-indicator"></div>
                  <span>I agree to the Terms &amp; Conditions and Community Guidelines.</span>
                </label>
              </div>
            </div>
            <div className="modal-footer">
              <button
                className="btn-text-only" onClick={() => setShowTermsModal(false)}
                style={{ background: "transparent", border: "none", cursor: "pointer", fontWeight: "500", color: "#64748b" }}
              >
                Cancel
              </button>
              <button
                className="btn-accept-terms" onClick={handleFinalSubmit}
                disabled={!(formData.agree1 && formData.agree2 && formData.agree3) || isSubmitting}
                style={{
                  background: formData.agree1 && formData.agree2 && formData.agree3 ? "#ef4444" : "#94a3b8",
                  color: "#ffffff", padding: "10px 20px", border: "none", borderRadius: "6px", fontWeight: "600",
                  cursor: formData.agree1 && formData.agree2 && formData.agree3 ? "pointer" : "not-allowed",
                  opacity: formData.agree1 && formData.agree2 && formData.agree3 ? 1 : 0.6,
                }}
              >
                {isSubmitting ? "Submitting..." : "Agree & Submit Application"}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default AmbassadorApplication;
