import React, { useState, useContext, useRef, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import Image from "next/image";
// next-disabled: import "../css/header.css";
import logo from "../assets/sapsecurityexpert-black.png";
import { FiMenu, FiX } from "react-icons/fi";
import { FaChevronDown } from "react-icons/fa";
import { useAuth } from "../context/AuthContext";
import { useMemberAuth } from "../context/MemberAuthContext";

import { LuSettings, LuUser, LuKey, LuLogOut, LuShieldCheck, LuChevronRight, LuChevronDown, LuX, LuTrash2, LuCoins, LuBookOpen } from "react-icons/lu";
import MemberProfileModal from "./MemberProfileModal";
import ResetPasswordModal from "./admin/ResetPasswordModal";
import DeleteAccountModal from "./DeleteAccountModal";

const Header = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [dropdowns, setDropdowns] = useState({
    sapSecurity: false,
    sapGrc: false,
    resources: false,
  });

  const { isAuthenticated: isLoggedIn, role, user, clearAuth } = useAuth();
  const {
    isLoggedIn: isMemberLoggedIn,
    member,
    isContributor,
    logout: memberLogout,
    creditBalance,
  } = useMemberAuth();

  // Full logout: clears both member and admin/contributor sessions
  const handleFullLogout = () => {
    memberLogout();
    clearAuth();
  };
  const navigate = useNavigate();
  const location = useLocation();

  const [isScrolled, setIsScrolled] = useState(false);
  const [isHidden, setIsHidden] = useState(false);
  const lastScrollY = useRef(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentY = window.scrollY;
      setIsScrolled(currentY > 10);
      if (currentY < 80) {
        setIsHidden(false);
      } else if (currentY > lastScrollY.current + 5) {
        setIsHidden(true);
      } else if (currentY < lastScrollY.current - 5) {
        setIsHidden(false);
      }
      lastScrollY.current = currentY;
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Member profile state
  const [isMemberDropdownOpen, setIsMemberDropdownOpen] = useState(false);
  const [isResetPasswordOpen, setIsResetPasswordOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isDeleteAccountOpen, setIsDeleteAccountOpen] = useState(false);
  const [isSecuritySubmenuOpen, setIsSecuritySubmenuOpen] = useState(false);
  const [profileInitialTab, setProfileInitialTab] = useState("profile");
  const memberDropdownRef = useRef(null);
  
  useEffect(() => {
    const handleOpenProfile = (e) => {
      if (isMemberLoggedIn) {
        setProfileInitialTab(e.detail?.tab || "profile");
        setIsProfileModalOpen(true);
      } else {
        navigate("/member/login", { state: { from: location.pathname + location.search } });
      }
    };

    const handleOpenResetPassword = () => setIsResetPasswordOpen(true);
    const handleOpenDeleteAccount = () => setIsDeleteAccountOpen(true);

    window.addEventListener('open-profile-settings', handleOpenProfile);
    window.addEventListener('open-reset-password', handleOpenResetPassword);
    window.addEventListener('open-delete-account', handleOpenDeleteAccount);

    return () => {
      window.removeEventListener('open-profile-settings', handleOpenProfile);
      window.removeEventListener('open-reset-password', handleOpenResetPassword);
      window.removeEventListener('open-delete-account', handleOpenDeleteAccount);
    };
  }, [isMemberLoggedIn, navigate]);

  // Close member dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (memberDropdownRef.current && !memberDropdownRef.current.contains(event.target)) {
        setIsMemberDropdownOpen(false);
        setIsSecuritySubmenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const closeMenu = () => {
    setMenuOpen(false);
    setDropdowns({ sapSecurity: false, sapGrc: false, resources: false });
  };

  const toggleDropdown = (key) => {
    setDropdowns((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <header className={`header-container-premium${isScrolled ? ' header--scrolled' : ''}${isHidden ? ' header--hidden' : ''}`}>
      <div className="header-inner">
        {/* Logo */}
        <Link to="/" className="header-logo">
          <Image src={logo} alt="SAP Security Expert" className="logo-img" priority />
        </Link>

        {/* Desktop Nav */}
        <nav className="header-nav-desktop only-windows">
          <Link to="/" className="nav-link">
            Home
          </Link>

          {/* SAP Security Dropdown */}
          <div className="nav-item">
            <Link to="/sap-security" className="nav-link">
              <span>SAP Security</span>
              <FaChevronDown size={10} style={{ marginLeft: "4px" }} />
            </Link>
            <div className="dropdown-menu">
              <Link to="/sap-s4hana-security">SAP S/4HANA Security</Link>
              <Link to="/sap-fiori-security">SAP Fiori Security</Link>
              <Link to="/sap-btp-security">SAP BTP Security</Link>
              <Link to="/sap-public-cloud">SAP Public Cloud Security</Link>
              <Link to="/sap-sac-security">SAP SAC Security</Link>
              <Link to="/sap-cis">SAP CIS (IAS/IPS)</Link>
              <Link to="/sap-successfactors-security">
                SAP SuccessFactors Security
              </Link>
              <Link to="/sap-security-other">Other versions</Link>
            </div>
          </div>

          {/* SAP Access Control & IAG Dropdown */}
          <div className="nav-item">
            <Link to="/sap-grc" className="nav-link">
              <span>SAP GRC & IAG</span>
              <FaChevronDown size={10} style={{ marginLeft: "4px" }} />
            </Link>
            <div className="dropdown-menu">
              <Link to="/sap-access-control">SAP Access Control</Link>
              <Link to="/sap-process-control">SAP Process Control</Link>
              <Link to="/sap-iag">SAP IAG</Link>
            </div>
          </div>

          <Link to="/sap-cybersecurity" className="nav-link">
            SAP Cybersecurity
          </Link>


          {/* Resources Dropdown */}
          <div className="nav-item">
            <span className="nav-link" style={{ cursor: "pointer" }}>
              <span>Resources</span>
              <FaChevronDown size={10} style={{ marginLeft: "4px" }} />
            </span>
            <div className="dropdown-menu">
              <Link to="/news">News &amp; Updates</Link>
              <Link to="/announcements">Announcements</Link>
              <Link to="/product-reviews">Product Reviews</Link>
              <Link to="/podcasts">Expert Voices/Podcasts</Link>
              <Link to="/videos">Videos</Link>
              <Link to="/expert-recommendations">Expert Recommendations</Link>
            </div>
          </div>

          <Link to="/contact-us" className="nav-link">
            Contact Us
          </Link>
        </nav>

        {/* Right Actions */}
        <div className="header-actions">
          <div
            className="nav-actions only-windows"
            style={{ display: "flex", alignItems: "center", gap: "15px" }}
          >
            {isMemberLoggedIn && member ? (
              <div
                className="member-profile-wrap"
                ref={memberDropdownRef}
                style={{ position: "relative" }}
              >
                <div
                  className="header-member-pill"
                  onClick={() => setIsMemberDropdownOpen(!isMemberDropdownOpen)}
                  style={{
                    padding: "0",
                    background: "transparent",
                    border: "none",
                    boxShadow: "none",
                  }}
                >
                  <div className="member-avatar-circle">
                    {member.profile_image ? (
                      <Image src={member.profile_image} alt="Avatar" width={42} height={42} />
                    ) : (
                      (member.name || member.email || "M")
                        .charAt(0)
                        .toUpperCase()
                    )}
                  </div>
                </div>

                {isMemberDropdownOpen && (
                  <div className="member-dropdown-menu">
                    <div className="member-dropdown-header">
                      <strong>{member.name}</strong>
                      <span className="member-email">{member.email}</span>
                      <div className="member-premium-badge" style={{ cursor: "default" }}>
                        <i className="bi bi-coin"></i>
                        {creditBalance} Credit{creditBalance !== 1 ? "s" : ""}
                      </div>
                    </div>
                    <button
                      className="member-dropdown-item"
                      onClick={() => {
                        setIsProfileModalOpen(true);
                        setIsMemberDropdownOpen(false);
                      }}
                    >
                      <LuUser className="dropdown-icon" /> Profile Settings
                    </button>
                    <button
                      className="member-dropdown-item"
                      onClick={() => {
                        setIsMemberDropdownOpen(false);
                        navigate("/member/credits");
                      }}
                    >
                      <LuCoins className="dropdown-icon" /> My Credits &amp; Transactions
                    </button>
                    <button
                      className="member-dropdown-item"
                      onClick={() => {
                        setIsMemberDropdownOpen(false);
                        navigate("/member/credits?tab=unlocks");
                      }}
                    >
                      <LuBookOpen className="dropdown-icon" /> My Unlocked Articles
                    </button>
                    {isContributor && (
                      <button
                        className="member-dropdown-item"
                        onClick={() => {
                          setIsMemberDropdownOpen(false);
                          navigate("/admin");
                        }}
                      >
                        <LuSettings className="dropdown-icon" /> Dashboard
                      </button>
                    )}

                    <div className="dropdown-divider"></div>

                    <div className="security-submenu-wrapper">
                      <button
                        className={`member-dropdown-item ${isSecuritySubmenuOpen ? 'active' : ''}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsSecuritySubmenuOpen(!isSecuritySubmenuOpen);
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          width: '100%'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <LuShieldCheck className="dropdown-icon" /> Security & Privacy
                        </div>
                        <LuChevronDown style={{ 
                          fontSize: '0.8rem', 
                          transition: 'transform 0.2s',
                          transform: isSecuritySubmenuOpen ? 'rotate(180deg)' : 'rotate(-90deg)' 
                        }} />
                      </button>

                      {isSecuritySubmenuOpen && (
                        <div className="dropdown-submenu-content" style={{ background: '#f8fafc', padding: '4px 0' }}>
                          <button
                            className="member-dropdown-item"
                            onClick={() => {
                              setIsResetPasswordOpen(true);
                              setIsMemberDropdownOpen(false);
                              setIsSecuritySubmenuOpen(false);
                            }}
                            style={{ paddingLeft: '32px', fontSize: '0.85rem' }}
                          >
                            <LuKey className="dropdown-icon" size={14} /> Change Password
                          </button>

                          <button
                            className="member-dropdown-item logout"
                            onClick={() => {
                              setIsDeleteAccountOpen(true);
                              setIsMemberDropdownOpen(false);
                              setIsSecuritySubmenuOpen(false);
                            }}
                            style={{ paddingLeft: '32px', fontSize: '0.85rem', color: '#dc2626' }}
                          >
                            <LuTrash2 className="dropdown-icon" size={14} /> Delete Account
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="dropdown-divider"></div>
                    
                    <button
                      className="member-dropdown-item logout"
                      onClick={() => {
                        handleFullLogout();
                        setIsMemberDropdownOpen(false);
                        navigate("/member/login");
                      }}
                    >
                      <LuLogOut className="dropdown-icon" /> Logout
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link to="/member/login" state={{ from: location.pathname + location.search }} className="btn-header-login">
                Member Login
              </Link>
            )}

            <Link to="/become-a-contributor" className="btn-header-signup">
              Become a Contributor
            </Link>
          </div>
          <button
            className="mobile-menu-btn only-mobile"
            onClick={() => setMenuOpen(true)}
          >
            <FiMenu size={26} />
          </button>
        </div>
      </div>

      {/* MOBILE MENU */}
      <div className={`mobile-menu ${menuOpen ? "open" : ""}`}>
        <div className="mobile-menu-header">
          <Image src={logo} alt="Logo" width={160} height={40} style={{ width: "auto", height: "auto" }} />
          <button onClick={closeMenu}>
            <FiX size={24} />
          </button>
        </div>

        <nav className="mobile-nav">
          {isMemberLoggedIn && member ? (
            <div className="mobile-profile-card">
              <div className="mobile-profile-header">
                <div className="mobile-profile-avatar">
                  {member.profile_image ? (
                    <Image src={member.profile_image} alt="Avatar" width={56} height={56} />
                  ) : (
                    (member.name || member.email || "M").charAt(0).toUpperCase()
                  )}
                </div>
                <div className="mobile-profile-info">
                  <span className="mobile-profile-name">{member.name}</span>
                  <span className="mobile-profile-email">{member.email}</span>
                  <span className="mobile-profile-role">
                  <span style={{ color: "#d97706", fontWeight: "600", display: "flex", alignItems: "center", gap: "4px" }}>
                    <i className="bi bi-coin"></i> {creditBalance} Credits
                  </span>
                </span>
                </div>
              </div>
              <div className="mobile-profile-actions">
                <button
                  className="mobile-profile-btn"
                  onClick={() => {
                    setProfileInitialTab("profile");
                    setIsProfileModalOpen(true);
                    closeMenu();
                  }}
                >
                  <LuUser size={18} /> Profile Settings
                </button>
                <button
                  className="mobile-profile-btn"
                  onClick={() => {
                    setProfileInitialTab("security");
                    setIsProfileModalOpen(true);
                    closeMenu();
                  }}
                >
                  <LuShieldCheck size={18} /> Security & Privacy
                </button>
                {isContributor && (
                  <button
                    className="mobile-profile-btn"
                    onClick={() => {
                      closeMenu();
                      navigate("/admin");
                    }}
                  >
                    <LuSettings size={18} /> Dashboard
                  </button>
                )}
                

                <div className="dropdown-divider"></div>

                <button
                  className="mobile-profile-btn logout"
                  onClick={() => {
                    handleFullLogout();
                    closeMenu();
                    navigate("/member/login");
                  }}
                >
                  <LuLogOut size={18} /> Logout
                </button>
              </div>
            </div>
          ) : (
            <Link to="/member/login" state={{ from: location.pathname + location.search }} onClick={closeMenu}>
              Member Login
            </Link>
          )}

          <Link to="/" onClick={closeMenu}>
            Home
          </Link>

          {/* Mobile SAP Security Dropdown */}
          <div className="mobile-dropdown">
            <div
              className="mobile-dropdown-header"
              onClick={() => toggleDropdown("sapSecurity")}
            >
              <span>SAP Security</span>
              <FaChevronDown
                style={{
                  transform: dropdowns.sapSecurity ? "rotate(180deg)" : "none",
                  transition: "transform 0.3s",
                }}
              />
            </div>
            {dropdowns.sapSecurity && (
              <div className="mobile-submenu">
                <Link to="/sap-s4hana-security" onClick={closeMenu}>
                  SAP S/4HANA Security
                </Link>
                <Link to="/sap-fiori-security" onClick={closeMenu}>
                  SAP Fiori Security
                </Link>
                <Link to="/sap-btp-security" onClick={closeMenu}>
                  SAP BTP Security
                </Link>
                <Link to="/sap-public-cloud" onClick={closeMenu}>
                  SAP Public Cloud Security
                </Link>
                <Link to="/sap-sac-security" onClick={closeMenu}>
                  SAP SAC Security
                </Link>
                <Link to="/sap-cis" onClick={closeMenu}>
                  SAP CIS (IAS/IPS)
                </Link>
                <Link to="/sap-successfactors-security" onClick={closeMenu}>
                  SAP SuccessFactors Security
                </Link>
                <Link to="/sap-security-other" onClick={closeMenu}>
                  Other versions
                </Link>
              </div>
            )}
          </div>

          {/* Mobile SAP GRC & IAG Dropdown */}
          <div className="mobile-dropdown">
            <div
              className="mobile-dropdown-header"
              onClick={() => toggleDropdown("sapGrc")}
            >
              <span>SAP GRC & IAG</span>
              <FaChevronDown
                style={{
                  transform: dropdowns.sapGrc ? "rotate(180deg)" : "none",
                  transition: "transform 0.3s",
                }}
              />
            </div>
            {dropdowns.sapGrc && (
              <div className="mobile-submenu">
                <Link to="/sap-access-control" onClick={closeMenu}>
                  SAP Access Control
                </Link>
                <Link to="/sap-process-control" onClick={closeMenu}>
                  SAP Process Control
                </Link>
                <Link to="/sap-iag" onClick={closeMenu}>
                  SAP IAG
                </Link>
                <Link to="/sap-grc" onClick={closeMenu}>
                  SAP GRC
                </Link>
              </div>
            )}
          </div>

          <Link to="/sap-cybersecurity" onClick={closeMenu}>
            SAP Cybersecurity
          </Link>


          {/* Mobile Resources Dropdown */}
          <div className="mobile-dropdown">
            <div
              className="mobile-dropdown-header"
              onClick={() => toggleDropdown("resources")}
            >
              <span>Resources</span>
              <FaChevronDown
                style={{
                  transform: dropdowns.resources ? "rotate(180deg)" : "none",
                  transition: "transform 0.3s",
                }}
              />
            </div>
            {dropdowns.resources && (
              <div className="mobile-submenu">
                <Link to="/news" onClick={closeMenu}>
                  News &amp; Updates
                </Link>
                <Link to="/announcements" onClick={closeMenu}>
                  Announcements
                </Link>
                <Link to="/product-reviews" onClick={closeMenu}>
                  Product Reviews
                </Link>
                <Link to="/podcasts" onClick={closeMenu}>
                  Expert Voices/Podcasts
                </Link>
                <Link to="/videos" onClick={closeMenu}>
                  Videos
                </Link>
                <Link to="/expert-recommendations" onClick={closeMenu}>
                  Expert Recommendations
                </Link>
              </div>
            )}
          </div>

          <Link to="/contact-us" onClick={closeMenu}>
            Contact Us
          </Link>

          <Link
            to="/become-a-contributor"
            onClick={closeMenu}
            className="mobile-cta"
          >
            Become a Contributor
          </Link>
        </nav>
      </div>
      <MemberProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        initialTab={profileInitialTab}
      />

      <ResetPasswordModal
        isOpen={isResetPasswordOpen}
        onClose={() => setIsResetPasswordOpen(false)}
      />

      <DeleteAccountModal
        isOpen={isDeleteAccountOpen}
        onClose={() => setIsDeleteAccountOpen(false)}
      />
    </header>
  );
};

export default Header;
