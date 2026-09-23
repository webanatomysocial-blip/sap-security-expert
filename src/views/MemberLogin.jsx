import React, { useState, useEffect, useMemo } from "react";
import SEO from "../components/SEO";
import { createPortal } from "react-dom";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useMemberAuth } from "../context/MemberAuthContext";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { updateMemberProfile } from "../services/api";
import { COUNTRIES, statesForCountry, citiesForCountry } from "../constants/countries";
import SearchableSelect from "../components/SearchableSelect";
import useGeoCountryLock from "../hooks/useGeoCountryLock";
import "../css/ContactForm.css";
import "../css/MemberLogin.css";

// True once country, state, and city are all set — used to gate whether the
// location modal needs to show at all.
const hasCompleteLocation = (m) => !!(m && m.country && m.state && m.location);

// Modal shown right after login (any of the three destinations) when the
// member's country/state/city aren't fully filled in yet. Mandatory — no
// skip, no dismiss — the only way out is Save & Continue. Auto-fills from
// the browser's location as a convenience, but every field stays manually
// selectable in case geo detection fails or is wrong.
const LocationModal = ({ member, onSaved }) => {
  const [country, setCountry] = useState(member?.country || "");
  const [state, setState] = useState(member?.state || "");
  const [city, setCity] = useState(member?.location || "");
  const [saving, setSaving] = useState(false);
  const { addToast } = useToast();

  const stateOptions = useMemo(() => statesForCountry(country), [country]);
  const cityOptions = useMemo(() => citiesForCountry(country, state), [country, state]);

  const geo = useGeoCountryLock();
  useEffect(() => {
    if (geo.status !== "ready" || !geo.country) return;
    setCountry(geo.country);
    setState((s) => geo.state || s);
    setCity((c) => geo.city || c);
  }, [geo.status, geo.country, geo.state, geo.city]);

  const handleSave = async () => {
    if (!country || !state || !city) {
      addToast("Please fill in your country, state, and city.", "error");
      return;
    }
    setSaving(true);
    try {
      const data = new FormData();
      data.append("name", member.name || "");
      data.append("country", country);
      data.append("state", state);
      data.append("location", city);
      const res = await updateMemberProfile(data);
      if (res.data.status === "success") {
        addToast("Location saved!", "success");
        onSaved(res.data.member);
      } else {
        addToast(res.data.message || "Failed to save location.", "error");
      }
    } catch (err) {
      addToast(err.response?.data?.message || "Failed to save location.", "error");
    } finally {
      setSaving(false);
    }
  };

  return createPortal(
    <div style={{
      position: "fixed", inset: 0, background: "rgba(15,23,42,0.6)",
      backdropFilter: "blur(4px)", display: "flex", alignItems: "center",
      justifyContent: "center", zIndex: 9999, padding: 20,
    }}>
      <div style={{
        background: "#fff", borderRadius: 20, padding: "36px 32px",
        maxWidth: 440, width: "100%",
        boxShadow: "0 24px 60px rgba(0,0,0,0.18)",
      }}>
        <div style={{ textAlign: "center", fontSize: "2.2rem", marginBottom: 12 }}>📍</div>
        <h3 style={{ margin: "0 0 8px", fontSize: "1.15rem", color: "#1e293b", textAlign: "center" }}>
          Add your location
        </h3>
        <p style={{ margin: "0 0 24px", color: "#64748b", fontSize: "0.88rem", lineHeight: 1.6, textAlign: "center" }}>
          Your country, state, and city aren't fully set yet. This shows on your public profile and
          keeps your Contributor/Ambassador details in sync.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#334155", marginBottom: 6 }}>Country</label>
            <SearchableSelect
              className="login-input"
              value={country}
              onChange={(v) => { setCountry(v); setState(""); setCity(""); }}
              options={COUNTRIES}
              placeholder={geo.status === "loading" ? "Detecting your location..." : "Type to search your country"}
            />
            {(geo.status === "denied" || geo.status === "error" || geo.status === "unsupported") && (
              <p style={{ margin: "6px 0 0", fontSize: "0.75rem", color: "#94a3b8" }}>
                Couldn't detect your location automatically, please select it manually.
              </p>
            )}
          </div>
          <div>
            <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#334155", marginBottom: 6 }}>State / Province</label>
            <SearchableSelect
              className="login-input"
              value={state}
              onChange={(v) => { setState(v); setCity(""); }}
              options={stateOptions}
              placeholder={country ? "Type to search" : "Select a country first"}
              disabled={!country || stateOptions.length === 0}
            />
          </div>
          <div>
            <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#334155", marginBottom: 6 }}>City</label>
            <SearchableSelect
              className="login-input"
              value={city}
              onChange={setCity}
              options={cityOptions}
              placeholder={country ? "Type to search" : "Select a country first"}
              disabled={!country}
            />
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 24 }}>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              padding: "13px 20px", background: "#ee5e42", color: "#fff",
              border: "none", borderRadius: 10, fontSize: "0.92rem",
              fontWeight: 700, cursor: saving ? "not-allowed" : "pointer", fontFamily: "inherit",
            }}
          >
            {saving ? "Saving..." : "Save & Continue"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

// Modal shown after login to anyone with more than one place to land:
// Contributors, Country Ambassadors, or both at once (one account can hold
// both roles). A pure Ambassador never sees the Contributor Dashboard option
// — that portal (Manage Comments, Manage Ads, etc.) doesn't apply to them,
// they get their own single Ambassador page instead.
const ContributorChoiceModal = ({ username, isRealContributor, isAmbassador, onDashboard, onAmbassador, onMember }) => {
  const buttonStyle = {
    padding: "14px 20px", background: "#1e293b", color: "#fff",
    border: "none", borderRadius: 10, fontSize: "0.95rem",
    fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
    display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
  };

  return createPortal(
    <div style={{
      position: "fixed", inset: 0, background: "rgba(15,23,42,0.6)",
      backdropFilter: "blur(4px)", display: "flex", alignItems: "center",
      justifyContent: "center", zIndex: 9999, padding: 20,
    }}>
      <div style={{
        background: "#fff", borderRadius: 20, padding: "40px 36px",
        maxWidth: 440, width: "100%", textAlign: "center",
        boxShadow: "0 24px 60px rgba(0,0,0,0.18)",
        animation: "slideUp 0.3s cubic-bezier(0.16,1,0.3,1)",
      }}>
        <div style={{ fontSize: "2.2rem", marginBottom: 12 }}>👋</div>
        <h3 style={{ margin: "0 0 8px", fontSize: "1.2rem", color: "#1e293b" }}>
          Welcome back, {username}!
        </h3>
        <p style={{ margin: "0 0 28px", color: "#64748b", fontSize: "0.9rem", lineHeight: 1.6 }}>
          {isRealContributor && isAmbassador
            ? "You have a Contributor and Country Ambassador account. Where would you like to go?"
            : isAmbassador
              ? "You have a Country Ambassador account. Where would you like to go?"
              : "You have a contributor account. Where would you like to go?"}
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {isRealContributor && (
            <button onClick={onDashboard} style={buttonStyle}>
              ✍️ Go to Contributor Dashboard
            </button>
          )}
          {isAmbassador && (
            <button onClick={onAmbassador} style={buttonStyle}>
              🌍 Go to Ambassador Page
            </button>
          )}
          <button
            onClick={onMember}
            style={{
              padding: "14px 20px", background: "#f8fafc", color: "#334155",
              border: "1.5px solid #e2e8f0", borderRadius: 10, fontSize: "0.95rem",
              fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            }}
          >
            🌐 Continue as Member
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

const MemberLogin = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [loginData, setLoginData] = useState(null); // full login response, kept around for the Dashboard action
  const [showChoiceModal, setShowChoiceModal] = useState(false);
  const [pendingAction, setPendingAction] = useState(null); // 'dashboard' | 'ambassador' | 'member'
  const [pendingMember, setPendingMember] = useState(null); // member object checked for location completeness
  const [showLocationModal, setShowLocationModal] = useState(false);
  const { login: memberLogin, updateMember, isLoggedIn } = useMemberAuth();
  const { setAuth: adminSetAuth } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const returnTo = location.state?.fromAuth ? "/" : (location.state?.from || new URLSearchParams(location.search).get("return") || "/");

  // Already signed in — don't show the login form again, just send them
  // straight to where they were headed (or the homepage). Skipped while any
  // post-login modal is up: memberLogin() sets isLoggedIn=true immediately
  // on submit (before we know if they're a contributor or need a location
  // prompt), so without this guard the redirect fires instantly and neither
  // modal ever gets a chance to be seen.
  useEffect(() => {
    if (isLoggedIn && !showChoiceModal && !showLocationModal) {
      navigate(returnTo, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoggedIn, showChoiceModal, showLocationModal]);

  // Runs the actual navigation for a chosen destination — called either
  // directly (location already complete) or after the location modal is
  // saved/skipped.
  const runAction = (action, data) => {
    if (action === "dashboard") {
      adminSetAuth({
        user: data.admin_user,
        role: data.admin_user.role,
        permissions: data.permissions,
        csrf_token: data.csrf_token,
      });
      addToast("Welcome back! Redirecting to Dashboard...", "success");
      navigate("/admin", { replace: true });
    } else if (action === "ambassador") {
      addToast("Welcome back!", "success");
      navigate("/member/ambassador", { replace: true });
    } else {
      addToast("Welcome back!", "success");
      navigate(returnTo, { replace: true });
    }
  };

  // Every path into the app funnels through here: proceed straight to the
  // chosen destination if location is already complete, otherwise show the
  // location modal first — for every login, not just once.
  const proceed = (member, action, data) => {
    setShowChoiceModal(false);
    if (hasCompleteLocation(member)) {
      runAction(action, data);
    } else {
      setPendingMember(member);
      setPendingAction(action);
      setShowLocationModal(true);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { memberLogin: apiMemberLogin } = await import("../services/api");
      const res = await apiMemberLogin({ email, password });

      if (res.data.status === "success" && res.data.member) {
        memberLogin(res.data.member, res.data.is_contributor, res.data.csrf_token);
        setLoginData(res.data);

        if (res.data.is_contributor) {
          setShowChoiceModal(true);
        } else {
          proceed(res.data.member, "member", res.data);
        }
      } else {
        addToast(res.data.message || "Invalid email or password", "error");
      }
    } catch (err) {
      addToast(
        err.response?.data?.message || err.message || "An error occurred during login.",
        "error",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleLocationSaved = (updatedMember) => {
    // updateProfile's response is the bare member row — merge over the
    // richer login-time object so is_ambassador/is_real_contributor/etc.
    // (computed only at login/profile-fetch time) aren't dropped.
    updateMember({ ...pendingMember, ...updatedMember });
    setShowLocationModal(false);
    runAction(pendingAction, loginData);
  };

  return (
    <>
    {showChoiceModal && loginData && (
      <ContributorChoiceModal
        username={loginData.member?.full_name || loginData.member?.username}
        isRealContributor={!!loginData.is_real_contributor}
        isAmbassador={!!loginData.is_ambassador}
        onDashboard={() => proceed(loginData.member, "dashboard", loginData)}
        onAmbassador={() => proceed(loginData.member, "ambassador", loginData)}
        onMember={() => proceed(loginData.member, "member", loginData)}
      />
    )}
    {showLocationModal && pendingMember && (
      <LocationModal member={pendingMember} onSaved={handleLocationSaved} />
    )}
    <div className="login-page-wrapper">
      <SEO title="Member Login | SAP Security Expert" />

      <div className="login-page-container">
        <div className="login-split-grid">
          {/* LEFT SIDE: Welcome Content */}
          <div className="login-info-side">
            <h2>Welcome Back!</h2>
            <div className="login-accent-line"></div>
            <p className="login-info-desc">
              Log in to access exclusive SAP security content, tools, and community insights.
            </p>

            <div className="login-features-list">
              <div className="login-feature-item">
                <div className="login-feature-icon-wrapper blue">
                  <i className="bi bi-journal-check"></i>
                </div>
                <div className="login-feature-text">
                  <h4>Exclusive Content</h4>
                  <p>In-depth articles, research, and member-only resources.</p>
                </div>
              </div>

              <div className="login-feature-item">
                <div className="login-feature-icon-wrapper orange">
                  <i className="bi bi-people-fill"></i>
                </div>
                <div className="login-feature-text">
                  <h4>Expert Community</h4>
                  <p>Connect with SAP security professionals worldwide.</p>
                </div>
              </div>
              <div className="login-feature-item">
                <div className="login-feature-icon-wrapper green">
                  <i className="bi bi-shield-lock-fill"></i>
                </div>
                <div className="login-feature-text">
                  <h4>Secure & Trusted</h4>
                  <p>Your privacy and data security are our top priority.</p>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT SIDE: Login Card */}
          <div className="login-form-side">
            <form className="login-card-form" onSubmit={handleSubmit}>
              <div className="login-lock-badge">
                <i className="bi bi-lock-fill"></i>
              </div>
              <h3>Member Login</h3>
              <p className="login-subtitle">Access exclusive SAP security content and insights.</p>

              <div className="login-form-group">
                <label className="login-label">Email or Username</label>
                <div className="login-input-wrapper">
                  <i className="bi bi-person login-input-icon"></i>
                  <input
                    type="text"
                    className="login-input"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoFocus
                    placeholder="username or you@example.com"
                  />
                </div>
              </div>

              <div className="login-form-group">
                <div className="login-form-header-row">
                  <label className="login-label">Password</label>
                  <Link to="/forgot-password" className="login-forgot-link">
                    Forgot Password?
                  </Link>
                </div>
                <div className="login-input-wrapper">
                  <i className="bi bi-lock login-input-icon"></i>
                  <input
                    type="password"
                    className="login-input"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <div className="login-remember-row">
                <label className="login-checkbox-label">
                  <input type="checkbox" className="login-checkbox-input" defaultChecked />
                  Remember me
                </label>
              </div>

              <button
                type="submit"
                className="login-btn-submit"
                disabled={loading || !email || !password}
              >
                {loading ? "Signing In..." : "Sign In"}{" "}
                <i className="bi bi-arrow-right"></i>
              </button>



              <div className="login-signup-prompt">
                Don't have an account? <Link to="/member/signup">Sign up for free</Link>
              </div>
            </form>
          </div>
        </div>

        {/* BOTTOM: Trust Callouts */}
        <div className="login-trust-bar">
          <div className="login-trust-item">
            <div className="login-trust-icon-box">
              <i className="bi bi-shield-check"></i>
            </div>
            <div className="login-trust-text">
              <h5>Expert Curated</h5>
              <p>Quality content by industry experts</p>
            </div>
          </div>

          <div className="login-trust-item">
            <div className="login-trust-icon-box">
              <i className="bi bi-person-check-fill"></i>
            </div>
            <div className="login-trust-text">
              <h5>Trusted by Professionals</h5>
              <p>Join 10,000+ SAP security experts</p>
            </div>
          </div>

          <div className="login-trust-item">
            <div className="login-trust-icon-box">
              <i className="bi bi-arrow-repeat"></i>
            </div>
            <div className="login-trust-text">
              <h5>Always Updated</h5>
              <p>Stay ahead with the latest insights</p>
            </div>
          </div>

          <div className="login-trust-item">
            <div className="login-trust-icon-box">
              <i className="bi bi-award"></i>
            </div>
            <div className="login-trust-text">
              <h5>Make an Impact</h5>
              <p>Contribute and grow your reputation</p>
            </div>
          </div>
        </div>


      </div>
    </div>
    </>
  );
};

export default MemberLogin;
