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
    currentRole: "",

    expertise: {
      sapSecurity: false,
      sapGrc: false,
      sapIag: false,
      sapBtp: false,
      sapCyber: false,
    },
    otherExpertiseText: "",
    yearsExperience: "",

    motivation: "",
    contributionExamples: "",
    nominationType: "self",

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
      if (key === "expertise") {
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
              <i className="bi bi-check-circle-fill"></i>
              <h3>Application Submitted Successfully!</h3>
              <p>
                Thank you for your interest in the Country Ambassador recognition. Our team will review your
                profile against our qualification criteria and get back to you shortly.
              </p>
              <Link to="/" className="btn-apply-now">
                Return to Home
              </Link>
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
                      onChange={(v) => setFormData((f) => ({ ...f, country: v, state: "", city: "" }))}
                      options={COUNTRIES}
                      placeholder={geo.status === "loading" ? "Detecting your location..." : "Type to search your country"}
                      disabled={geo.status === "ready"}
                      required
                    />
                    {geo.status === "ready" && (
                      <p style={{ margin: "6px 0 0", fontSize: "0.75rem", color: "#64748b" }}>
                        <i className="bi bi-geo-alt-fill" style={{ marginRight: 4 }} />
                        Auto-detected from your location and locked for accuracy.
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

              {/* Section 2: Expertise & Credibility */}
              <div className="form-section">
                <h3>2. SAP Security Expertise</h3>
                <div className="form-group">
                  <label className="form-label">Area(s) of Expertise</label>
                  <div className="checkbox-group">
                    {[
                      { key: "sapSecurity", label: "SAP Security (ABAP/Java)" },
                      { key: "sapGrc", label: "SAP GRC (Access Control, Process Control, RM)" },
                      { key: "sapIag", label: "Audit & Compliance / IAG" },
                      { key: "sapBtp", label: "BTP Security" },
                      { key: "sapCyber", label: "Cybersecurity / IAM / Cloud Security" },
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
                </div>

                <div className="form-group">
                  <label className="form-label">Other Expertise</label>
                  <input
                    type="text" className="form-control" name="otherExpertiseText"
                    placeholder="Specify if any" value={formData.otherExpertiseText} onChange={handleInputChange}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Years of SAP Security Experience</label>
                  <input
                    type="number" className="form-control" name="yearsExperience"
                    value={formData.yearsExperience} onChange={handleInputChange} placeholder="e.g. 8"
                  />
                </div>
              </div>

              {/* Section 3: Community Contribution */}
              <div className="form-section">
                <h3>3. Community Contribution</h3>
                <div className="form-group">
                  <label className="form-label">
                    Motivation for strengthening the SAP Security community *
                  </label>
                  <textarea
                    className="form-control" name="motivation" rows="4" value={formData.motivation}
                    onChange={handleInputChange} required
                    placeholder="Why do you want to help connect SAP Security professionals in your country with the global community?"
                  ></textarea>
                </div>

                <div className="form-group">
                  <label className="form-label">
                    Community Contribution Examples *
                  </label>
                  <textarea
                    className="form-control" name="contributionExamples" rows="5" value={formData.contributionExamples}
                    onChange={handleInputChange} required
                    placeholder="Mentoring, speaking, research, writing, leadership or other examples — include URLs where applicable."
                  ></textarea>
                </div>

                <div className="form-group">
                  <label className="form-label">How is this application being made?</label>
                  <div className="checkbox-group">
                    {[
                      { value: "self", label: "Self-nominated" },
                      { value: "nominated", label: "Nominated by a community member" },
                      { value: "recommended", label: "Recommended by the SAPSecurityExpert team" },
                    ].map(({ value, label }) => (
                      <label key={value} className="checkbox-item">
                        <input
                          type="radio" name="nominationType" value={value}
                          checked={formData.nominationType === value} onChange={handleInputChange}
                        />
                        <div className="box-indicator"></div>
                        <span>{label}</span>
                      </label>
                    ))}
                  </div>
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
