import { lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";

import Layout from "./components/Layout";
import Home from "./views/Home";
import DynamicBlog from "./components/DynamicBlog";

// ── Eagerly loaded (above-the-fold critical paths) ────────────────────────────
import SapSecurity from "./views/categories/SapSecurity";

// ── Lazy-loaded category pages ────────────────────────────────────────────────
const FundamentalsPage         = lazy(() => import("./views/FundamentalsPage"));
const Blogs                    = lazy(() => import("./components/Blog"));
const SapS4Hana                = lazy(() => import("./views/categories/SapS4Hana"));
const SapFiori                 = lazy(() => import("./views/categories/SapFiori"));
const SapBtpSecurity           = lazy(() => import("./views/categories/SapBtpSecurity"));
const SapPublicCloud           = lazy(() => import("./views/categories/SapPublicCloud"));
const SapSac                   = lazy(() => import("./views/categories/SapSac"));
const SapCis                   = lazy(() => import("./views/categories/SapCis"));
const SapSuccessFactors        = lazy(() => import("./views/categories/SapSuccessFactors"));
const SapOther                 = lazy(() => import("./views/categories/SapOther"));
const SapAccessControl         = lazy(() => import("./views/categories/SapAccessControl"));
const SapProcessControl        = lazy(() => import("./views/categories/SapProcessControl"));
const SapIag                   = lazy(() => import("./views/categories/SapIag"));
const SapGrc                   = lazy(() => import("./views/categories/SapGrc"));
const SapCybersecurity         = lazy(() => import("./views/categories/SapCybersecurity"));
const SapLicensing             = lazy(() => import("./views/categories/SapLicensing"));
const ProductReviews           = lazy(() => import("./views/categories/ProductReviews"));
const Podcasts                 = lazy(() => import("./views/categories/Podcasts"));
const Videos                   = lazy(() => import("./views/categories/Videos"));
const ExpertRecommendations    = lazy(() => import("./views/categories/ExpertRecommendations"));
const Downloads                = lazy(() => import("./views/categories/Downloads"));
const News                     = lazy(() => import("./views/News"));
const Announcements            = lazy(() => import("./views/Announcements"));
const AnnouncementDetail       = lazy(() => import("./views/AnnouncementDetail"));
const LearningHub              = lazy(() => import("./views/LearningHub"));
const LearningModulePage       = lazy(() => import("./views/LearningModulePage"));

// ── Lazy-loaded contributor / member / auth pages ─────────────────────────────
const About                    = lazy(() => import("./views/About"));
const ContactUs                = lazy(() => import("./views/ContactUs"));
const BecomeContributor        = lazy(() => import("./components/BecomeContributor"));
const ContributorApplication   = lazy(() => import("./views/ContributorApplication"));
const ContributorProfile       = lazy(() => import("./views/ContributorProfile"));
const ContributorsLeaderboard  = lazy(() => import("./views/ContributorsLeaderboard"));
const MemberPublicProfile      = lazy(() => import("./views/MemberPublicProfile"));
const MemberLogin              = lazy(() => import("./views/MemberLogin"));
const MemberSignup             = lazy(() => import("./views/MemberSignup"));
const MemberCredits            = lazy(() => import("./views/MemberCredits"));
const MemberAchievements       = lazy(() => import("./views/MemberAchievements"));
const MemberInvoice            = lazy(() => import("./views/MemberInvoice"));
const PaidArticles             = lazy(() => import("./views/PaidArticles"));
const ProfileSettings          = lazy(() => import("./views/ProfileSettings"));
const MembershipPage           = lazy(() => import("./views/MembershipPage"));
const ForgotPassword           = lazy(() => import("./views/ForgotPassword"));
const ResetPassword            = lazy(() => import("./views/ResetPassword"));

// ── Lazy-loaded legal pages ───────────────────────────────────────────────────
const PrivacyPolicy            = lazy(() => import("./views/legal/PrivacyPolicy"));
const TermsConditions          = lazy(() => import("./views/legal/TermsConditions"));
const AccessibilityStatement   = lazy(() => import("./views/legal/AccessibilityStatement"));
const SafetyMovement           = lazy(() => import("./views/legal/SafetyMovement"));
const SecurityCompliance       = lazy(() => import("./views/legal/SecurityCompliance"));
const ResponsibleAi            = lazy(() => import("./views/legal/ResponsibleAi"));

// ── Lazy-loaded admin bundle (never shipped to regular visitors) ──────────────
const AdminLayout              = lazy(() => import("./components/admin/AdminLayout.jsx"));
const AdminHome                = lazy(() => import("./components/admin/AdminHome"));
const AdminContributors        = lazy(() => import("./components/admin/AdminContributors"));
const AdminTeam                = lazy(() => import("./components/admin/AdminTeam"));
const AdminAnnouncements       = lazy(() => import("./components/admin/AdminAnnouncements"));
const AdminComments            = lazy(() => import("./components/admin/AdminComments"));
const AdminAds                 = lazy(() => import("./components/admin/AdminAds"));
const AdminBlogs               = lazy(() => import("./components/admin/AdminBlogs"));
const AdminBlogReview          = lazy(() => import("./components/admin/AdminBlogReview"));
const AdminNews                = lazy(() => import("./components/admin/AdminNews"));
const AdminLearnings           = lazy(() => import("./components/admin/AdminLearnings"));
const AdminManageUsers         = lazy(() => import("./components/admin/AdminManageUsers"));
const AdminCreditBundles       = lazy(() => import("./components/admin/AdminCreditBundles"));
const AdminFeaturedInsights    = lazy(() => import("./components/admin/AdminFeaturedInsights"));
const AdminEmailTemplates      = lazy(() => import("./components/admin/AdminEmailTemplates"));
const AdminChangelog           = lazy(() => import("./components/admin/AdminChangelog"));

import ProtectedRoute from "./components/ProtectedRoute";

function App() {
  return (
    <Suspense fallback={null}>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="sap-security-fundamentals" element={<FundamentalsPage />} />
          <Route path="blogs" element={<Blogs />} />
          <Route path="blog" element={<Navigate to="/blogs" replace />} />
          <Route path="blogs/:blogId" element={<DynamicBlog />} />

          {/* SAP Security Routes */}
          <Route path="sap-security" element={<SapSecurity />} />
          <Route path="sap-security/:blogId" element={<DynamicBlog />} />

          <Route path="sap-s4hana-security" element={<SapS4Hana />} />
          <Route path="sap-s4hana-security/:blogId" element={<DynamicBlog />} />

          <Route path="sap-fiori-security" element={<SapFiori />} />
          <Route path="sap-fiori-security/:blogId" element={<DynamicBlog />} />

          <Route path="sap-btp-security" element={<SapBtpSecurity />} />
          <Route path="sap-btp-security/:blogId" element={<DynamicBlog />} />

          <Route path="sap-public-cloud" element={<SapPublicCloud />} />
          <Route path="sap-public-cloud/:blogId" element={<DynamicBlog />} />

          <Route path="sap-sac-security" element={<SapSac />} />
          <Route path="sap-sac-security/:blogId" element={<DynamicBlog />} />

          <Route path="sap-cis" element={<SapCis />} />
          <Route path="sap-cis/:blogId" element={<DynamicBlog />} />

          <Route path="sap-successfactors-security" element={<SapSuccessFactors />} />
          <Route path="sap-successfactors-security/:blogId" element={<DynamicBlog />} />

          <Route path="sap-security-other" element={<SapOther />} />
          <Route path="sap-security-other/:blogId" element={<DynamicBlog />} />

          {/* GRC & IAG Routes */}
          <Route path="sap-access-control" element={<SapAccessControl />} />
          <Route path="sap-access-control/:blogId" element={<DynamicBlog />} />

          <Route path="sap-process-control" element={<SapProcessControl />} />
          <Route path="sap-process-control/:blogId" element={<DynamicBlog />} />

          <Route path="sap-iag" element={<SapIag />} />
          <Route path="sap-iag/:blogId" element={<DynamicBlog />} />

          <Route path="sap-grc" element={<SapGrc />} />
          <Route path="sap-grc/:blogId" element={<DynamicBlog />} />

          <Route path="sap-cybersecurity" element={<SapCybersecurity />} />
          <Route path="sap-cybersecurity/:blogId" element={<DynamicBlog />} />

          <Route path="sap-licensing" element={<SapLicensing />} />
          <Route path="sap-licensing/:blogId" element={<DynamicBlog />} />
          <Route path="transactions" element={<FundamentalsPage />} />

          {/* Resources Routes */}
          <Route path="product-reviews" element={<ProductReviews />} />
          <Route path="product-reviews/:blogId" element={<DynamicBlog />} />

          <Route path="podcasts" element={<Podcasts />} />
          <Route path="podcasts/:blogId" element={<DynamicBlog />} />

          <Route path="videos" element={<Videos />} />
          <Route path="videos/:blogId" element={<DynamicBlog />} />

          <Route path="expert-recommendations" element={<ExpertRecommendations />} />
          <Route path="expert-recommendations/:blogId" element={<DynamicBlog />} />

          <Route path="downloads" element={<Downloads />} />
          <Route path="downloads/:blogId" element={<DynamicBlog />} />

          {/* News & Updates */}
          <Route path="news" element={<News />} />
          <Route path="news/:blogId" element={<DynamicBlog />} />

          {/* Announcements */}
          <Route path="announcements" element={<Announcements />} />
          <Route path="announcements/:slug" element={<AnnouncementDetail />} />

          {/* Learning Hub */}
          <Route path="learning-hub" element={<LearningHub />} />
          <Route path="learning/:moduleSlug" element={<LearningModulePage />} />
          <Route path="learning/:moduleSlug/:blogId" element={<DynamicBlog />} />

          <Route path="become-a-contributor" element={<BecomeContributor />} />
          <Route path="apply-contributor" element={<ContributorApplication />} />
          <Route path="contributor/:id" element={<ContributorProfile />} />
          <Route path="leaderboard" element={<ContributorsLeaderboard />} />
          <Route path="member/:id" element={<MemberPublicProfile />} />
          <Route path="about" element={<About />} />
          <Route path="contact-us" element={<ContactUs />} />

          {/* Members Only Auth Pages */}
          <Route path="member/login" element={<MemberLogin />} />
          <Route path="member/signup" element={<MemberSignup />} />
          <Route path="member/credits" element={<MemberCredits />} />
          <Route path="member/achievements" element={<MemberAchievements />} />
          <Route path="member/invoice/:txId" element={<MemberInvoice />} />
          <Route path="member/settings" element={<ProfileSettings />} />
          <Route path="paid-articles" element={<PaidArticles />} />
          <Route path="membership" element={<MembershipPage />} />
          <Route path="forgot-password" element={<ForgotPassword />} />
          <Route path="reset-password" element={<ResetPassword />} />

          {/* Legal Routes */}
          <Route path="privacy-policy" element={<PrivacyPolicy />} />
          <Route path="terms-conditions" element={<TermsConditions />} />
          <Route path="accessibility-statement" element={<AccessibilityStatement />} />
          <Route path="safety-movement" element={<SafetyMovement />} />
          <Route path="security-compliance-overview" element={<SecurityCompliance />} />
          <Route path="responsible-ai-automation-statement" element={<ResponsibleAi />} />
        </Route>

        {/* React Admin Dashboard */}
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<ProtectedRoute><AdminHome /></ProtectedRoute>} />
          <Route path="dashboard" element={<Navigate to="/admin" replace />} />
          <Route path="blogs" element={<ProtectedRoute><AdminBlogs /></ProtectedRoute>} />
          <Route path="blogs/pending" element={<ProtectedRoute><AdminBlogReview /></ProtectedRoute>} />
          <Route path="blog-review" element={<ProtectedRoute><AdminBlogReview /></ProtectedRoute>} />
          <Route path="contributors" element={<ProtectedRoute><AdminContributors /></ProtectedRoute>} />
          <Route path="team" element={<ProtectedRoute adminOnly><AdminTeam /></ProtectedRoute>} />
          <Route path="announcements" element={<ProtectedRoute><AdminAnnouncements /></ProtectedRoute>} />
          <Route path="comments" element={<ProtectedRoute><AdminComments /></ProtectedRoute>} />
          <Route path="ads" element={<ProtectedRoute><AdminAds /></ProtectedRoute>} />
          <Route path="news" element={<ProtectedRoute><AdminNews /></ProtectedRoute>} />
          <Route path="learnings" element={<ProtectedRoute><AdminLearnings /></ProtectedRoute>} />
          <Route path="members" element={<ProtectedRoute adminOnly><AdminManageUsers /></ProtectedRoute>} />
          <Route path="users" element={<ProtectedRoute adminOnly><AdminManageUsers /></ProtectedRoute>} />
          <Route path="credits" element={<ProtectedRoute adminOnly><AdminCreditBundles /></ProtectedRoute>} />
          <Route path="bundles" element={<ProtectedRoute adminOnly><AdminCreditBundles /></ProtectedRoute>} />
          <Route path="featured-insights" element={<ProtectedRoute><AdminFeaturedInsights /></ProtectedRoute>} />
          <Route path="email-templates" element={<ProtectedRoute adminOnly><AdminEmailTemplates /></ProtectedRoute>} />
          <Route path="changelog" element={<ProtectedRoute><AdminChangelog /></ProtectedRoute>} />
        </Route>
      </Routes>
    </Suspense>
  );
}

export default App;
