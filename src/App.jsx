import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";

import Layout from "./components/Layout";
import Home from "./views/Home";
import FundamentalsPage from "./views/FundamentalsPage";
import Blogs from "./components/Blog";
import DynamicBlog from "./components/DynamicBlog";

// New Separate Category Pages
// New Separate Category Pages
import SapSecurity from "./views/categories/SapSecurity";
import SapS4Hana from "./views/categories/SapS4Hana";
import SapFiori from "./views/categories/SapFiori";
import SapBtpSecurity from "./views/categories/SapBtpSecurity";
import SapPublicCloud from "./views/categories/SapPublicCloud";
import SapSac from "./views/categories/SapSac";
import SapCis from "./views/categories/SapCis";
import SapSuccessFactors from "./views/categories/SapSuccessFactors";
import SapOther from "./views/categories/SapOther";

import SapAccessControl from "./views/categories/SapAccessControl";
import SapProcessControl from "./views/categories/SapProcessControl";
import SapIag from "./views/categories/SapIag";
import SapGrc from "./views/categories/SapGrc";

import SapCybersecurity from "./views/categories/SapCybersecurity";
import ProductReviews from "./views/categories/ProductReviews";
import Podcasts from "./views/categories/Podcasts";
import Videos from "./views/categories/Videos";
import ExpertRecommendations from "./views/categories/ExpertRecommendations";
import About from "./views/About";
import Contact from "./views/Contact";
import ContactUs from "./views/ContactUs";
import BecomeContributor from "./components/BecomeContributor";
import ContributorApplication from "./views/ContributorApplication";
import ContributorProfile from "./views/ContributorProfile";
import MemberLogin from "./views/MemberLogin";
import MemberSignup from "./views/MemberSignup";
import AdminLayout from "./components/admin/AdminLayout.jsx";
import AdminHome from "./components/admin/AdminHome";
import AdminContributors from "./components/admin/AdminContributors";
import AdminAnnouncements from "./components/admin/AdminAnnouncements";
import AdminComments from "./components/admin/AdminComments";
import AdminAds from "./components/admin/AdminAds";
import AdminBlogs from "./components/admin/AdminBlogs";
import AdminBlogReview from "./components/admin/AdminBlogReview";
import AdminNews from "./components/admin/AdminNews";
import AdminLearnings from "./components/admin/AdminLearnings";
import News from "./views/News";
import Announcements from "./views/Announcements";
import AnnouncementDetail from "./views/AnnouncementDetail";
import LearningHub from "./views/LearningHub";
import LearningModulePage from "./views/LearningModulePage";
import AdminManageUsers from "./components/admin/AdminManageUsers";
import AdminCreditBundles from "./components/admin/AdminCreditBundles";
import AdminFeaturedInsights from "./components/admin/AdminFeaturedInsights";
import ForgotPassword from "./views/ForgotPassword";
import ResetPassword from "./views/ResetPassword";
import MembershipPage from "./views/MembershipPage";
import ProtectedRoute from "./components/ProtectedRoute";
import PrivacyPolicy from "./views/legal/PrivacyPolicy";
import TermsConditions from "./views/legal/TermsConditions";
import AccessibilityStatement from "./views/legal/AccessibilityStatement";
import SafetyMovement from "./views/legal/SafetyMovement";
import SecurityCompliance from "./views/legal/SecurityCompliance";
import ResponsibleAi from "./views/legal/ResponsibleAi";

function App() {
  return (
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

        <Route
          path="sap-successfactors-security"
          element={<SapSuccessFactors />}
        />
        <Route
          path="sap-successfactors-security/:blogId"
          element={<DynamicBlog />}
        />

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



        {/* Resources Routes */}
        <Route path="product-reviews" element={<ProductReviews />} />
        <Route path="product-reviews/:blogId" element={<DynamicBlog />} />

        <Route path="podcasts" element={<Podcasts />} />
        <Route path="podcasts/:blogId" element={<DynamicBlog />} />

        <Route path="videos" element={<Videos />} />
        <Route path="videos/:blogId" element={<DynamicBlog />} />

        <Route path="expert-recommendations" element={<ExpertRecommendations />} />
        <Route path="expert-recommendations/:blogId" element={<DynamicBlog />} />

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
        <Route path="about" element={<About />} />
        <Route path="contact-us" element={<ContactUs />} />

        {/* Members Only Auth Pages */}
        <Route path="member/login" element={<MemberLogin />} />
        <Route path="member/signup" element={<MemberSignup />} />
        <Route path="membership" element={<MembershipPage />} />
        <Route path="forgot-password" element={<ForgotPassword />} />
        <Route path="reset-password" element={<ResetPassword />} />

        {/* Legal Routes */}
        <Route path="privacy-policy" element={<PrivacyPolicy />} />
        <Route path="terms-conditions" element={<TermsConditions />} />
        <Route
          path="accessibility-statement"
          element={<AccessibilityStatement />}
        />
        <Route path="safety-movement" element={<SafetyMovement />} />
        <Route
          path="security-compliance-overview"
          element={<SecurityCompliance />}
        />
        <Route
          path="responsible-ai-automation-statement"
          element={<ResponsibleAi />}
        />
      </Route>

      {/* React Admin Dashboard with ProtectedRoute removed from parent to avoid loop */}
      <Route path="/admin" element={<AdminLayout />}>
        <Route
          index
          element={
            <ProtectedRoute>
              <AdminHome />
            </ProtectedRoute>
          }
        />
        <Route path="dashboard" element={<Navigate to="/admin" replace />} />
        <Route
          path="blogs"
          element={
            <ProtectedRoute>
              <AdminBlogs />
            </ProtectedRoute>
          }
        />
        <Route
          path="blogs/pending"
          element={
            <ProtectedRoute>
              <AdminBlogReview />
            </ProtectedRoute>
          }
        />
        <Route
          path="blog-review"
          element={
            <ProtectedRoute>
              <AdminBlogReview />
            </ProtectedRoute>
          }
        />
        <Route
          path="contributors"
          element={
            <ProtectedRoute>
              <AdminContributors />
            </ProtectedRoute>
          }
        />
        <Route
          path="announcements"
          element={
            <ProtectedRoute>
              <AdminAnnouncements />
            </ProtectedRoute>
          }
        />
        <Route
          path="comments"
          element={
            <ProtectedRoute>
              <AdminComments />
            </ProtectedRoute>
          }
        />
        <Route
          path="ads"
          element={
            <ProtectedRoute>
              <AdminAds />
            </ProtectedRoute>
          }
        />
        <Route
          path="users"
          element={
            <ProtectedRoute>
              <AdminManageUsers />
            </ProtectedRoute>
          }
        />
        <Route
          path="news"
          element={
            <ProtectedRoute adminOnly>
              <AdminNews />
            </ProtectedRoute>
          }
        />
        <Route
          path="learnings"
          element={
            <ProtectedRoute adminOnly>
              <AdminLearnings />
            </ProtectedRoute>
          }
        />
        <Route
          path="bundles"
          element={
            <ProtectedRoute adminOnly>
              <AdminCreditBundles />
            </ProtectedRoute>
          }
        />
        <Route
          path="featured-insights"
          element={
            <ProtectedRoute adminOnly>
              <AdminFeaturedInsights />
            </ProtectedRoute>
          }
        />
      </Route>

      <Route
        path="/admin-dashboard"
        element={<Navigate to="/admin" replace />}
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
