import axios from 'axios';
import { VITE_API_URL } from '../utils/env';

const API_URL = VITE_API_URL;

export const api = axios.create({
    baseURL: API_URL,
    timeout: 30000,
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
    },
    withCredentials: true,
});

// Only log actual server errors (5xx) — 4xx are expected user-facing validation responses
api.interceptors.response.use(
    (response) => response,
    (error) => {
        const status = error.response?.status;
        if (!status || status >= 500) {
            console.error('API Error:', error.response?.data?.message || error.message);
        }
        return Promise.reject(error);
    }
);

// CSRF token injector for all mutating requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('csrf_token');

  if (token && config.method !== 'get') {
    // Inject into headers for normal JSON requests
    config.headers['X-CSRF-Token'] = token;

    // Inject into FormData for multipart/form-data requests
    if (config.data instanceof FormData) {
      config.data.append('csrf_token', token);
    }
  }

  return config;
});

// ── Public endpoints ─────────────────────────────────────────────────────────
export const getPosts = (page = 1) => api.get(`/posts?page=${page}`);
export const getPostBySlug = (slug, params = {}) => api.get(`/posts/${slug}`, { params });
export const getExclusiveCount = () => api.get('/posts/exclusive-count');
export const getMemberProfile = () => api.get('/member/profile');
export const getCommentsByBlogId = (blogId) => api.get(`/get_comments.php?blogId=${blogId}`);
export const submitComment = (data) => api.post('/save_comment.php', data);
export const applyContributor = (data) => api.post('/contributors/apply', data, {
    headers: { 'Content-Type': 'multipart/form-data' }
});
export const updatePostViews = (data) => api.post('/views', data);
export const getAdsByZone = (zone) => api.get(`/ads${zone ? `?zone=${zone}` : ''}`);
export const getPublicAds = (zone) => api.get(`/ads${zone ? `?zone=${zone}` : ''}`);
export const getPublicAnnouncements = () => api.get('/announcements');
export const getCommunityStats = () => api.get('/stats/community');
export const getPopularTags = () => api.get('/popular-tags');
export const getApprovedContributors = () => api.get('/contributors/approved');
export const getContributorProfile = (id) => api.get(`/contributors/profile/${id}`);
export const getContributorsLeaderboard = () => api.get('/contributors/leaderboard');
export const getMemberPublicProfile = (id) => api.get(`/members/${id}/public`);
export const getHomepageData = () => api.get('/get_homepage_data.php');
export const getCategories = () => api.get('/get_categories.php');

// ── Blog Management (Admin) ──────────────────────────────────────────────────
export const getBlogs = (params = {}) => api.get('/posts', { params });
export const saveBlog = (data) => api.post('/posts', data);
export const deleteBlog = (id) => api.delete(`/posts/${id}`);
export const toggleExclusiveContent = (data) => api.post('/admin/blogs/toggle-exclusive', data);
export const togglePremiumContent = (data) => api.post('/admin/blogs/toggle-premium', data);
export const toggleExpertPick = (data) => api.post('/admin/blogs/toggle-expert-pick', data);
export const uploadBlogImage = (formData) => api.post('/upload-blog-image', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 60000,
});

// ── Homepage Featured Insights (Admin) ───────────────────────────────────────
export const getFeaturedInsights = () => api.get('/admin/featured-insights');
export const saveFeaturedInsights = (items) => api.post('/admin/featured-insights', { items });

// ── Contributors Management (Admin) ───────────────────────────────────────────
export const getContributors = () => api.get('/admin/contributors');
export const updateContributorStatus = (data) => api.post('/admin/contributors', data);
export const deleteContributor = (id, otp) => api.post('/delete_contributor.php', { id, ...(otp ? { otp } : {}) });

// ── Members Management (Admin) ───────────────────────────────────────────────
export const getAdminMembers = (status = 'all') => api.get(`/admin/members?status=${status}`);
export const manageAdminMember = (data) => api.post('/admin/members', data);
export const resetMemberPassword = (memberId) => api.post('/admin/members/reset-password', { member_id: memberId });

// ── Admin Profile ─────────────────────────────────────────────────────────────
export const getAdminProfile = () => api.get('/admin/profile');
export const updateAdminProfile = (formData) => api.post('/admin/profile/update', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
});
export const resetAdminPassword = (data) => api.post('/admin/reset-password', data);
export const getAuthors = () => api.get('/admin/authors');

// ── Dashboard Stats ───────────────────────────────────────────────────────────
export const getAdminStats = () => api.get('/admin/stats');
export const getContributorStats = () => api.get('/contributor/stats');

// ── Contributor Login Management ─────────────────────────────────────────────
export const getContributorLogin = (contributorId) =>
    api.get(`/admin/contributor-login?contributor_id=${contributorId}`);

export const createContributorLogin = (data) =>
    api.post('/admin/create-contributor-login', data);

export const updateContributorAccess = (data) =>
    api.post('/admin/update-contributor-access', data);

// ── Blog Review Workflow ──────────────────────────────────────────────────────
export const getPendingBlogs = (status = "pending") =>
  api.get(`/admin/blogs/pending?status=${status}`);

export const reviewBlog = (id, action, rejection_reason = '') =>
    api.put(`/admin/blogs/${id}/review`, { action, rejection_reason });

export const recalculatePlagiarism = (blogId) => api.post('/admin/blogs/recalculate-plagiarism', { id: blogId });
export const bulkRecalculatePlagiarism = () => api.post('/admin/blogs/bulk-recalculate-plagiarism');

// ── Ads Management (Admin) ───────────────────────────────────────────────────
export const getAds = () => api.get('/admin/ads');
export const saveAd = (data) => api.post('/admin/ads', data);
export const trackAdClick = (zone) => api.post('/ads/click', { zone });

// ── News/Updates (Public) ────────────────────────────────────────────────────
export const getNewsList = () => api.get('/news');
export const getNewsBySlug = (slug) => api.get(`/news/${slug}`);

// ── News/Updates Management (Admin) ─────────────────────────────────────────
export const getAdminNews = () => api.get('/admin/news');
export const saveNews = (data) => api.post('/admin/news', data);
export const deleteNews = (id) => api.delete(`/admin/news/${id}`);

// ── Learning Hub (Public) ─────────────────────────────────────────────────────
export const getLearnings = (category) => api.get('/learnings', { params: category ? { category } : {} });
export const getLearningCounts = () => api.get('/learnings/counts');

// ── Learning Hub Management (Admin) ──────────────────────────────────────────
export const getAdminLearnings = () => api.get('/admin/learnings');
export const saveLearning = (data) => api.post('/admin/learnings', data);
export const deleteLearning = (id) => api.delete(`/admin/learnings/${id}`);

// ── Comments Management (Admin) ───────────────────────────────────────────────
export const getComments = () => api.get('/admin/comments');
export const updateComment = (data) => api.post('/admin/comments', data);

// ── Announcements Management (Admin) ──────────────────────────────────────────
export const getAnnouncements = (isAdmin = false) =>
  api.get(isAdmin ? "/admin/announcements" : "/announcements");

export const getAnnouncementBySlug = (slug) =>
  api.get(`/admin/announcements/${slug}`);

export const saveAnnouncement = (data) =>
  api.post("/admin/announcements", data);

export const deleteAnnouncement = (id) =>
  api.delete(`/admin/announcements?id=${id}`);

// ── Member Auth (Public) ─────────────────────────────────────────────────────
export const memberLogin = (data) => api.post('/member/login', data);
export const memberSignup = (data) => api.post('/member/signup', data);
export const updateMemberProfile = (formData) => api.post('/member/profile/update', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
});

// ── New Email/Verification System ────────────────────────────────────────────
export const sendOTP = (email, type = 'signup') => api.post('/send_otp.php', { email, type });
export const verifyOTP = (email, code, type = 'signup') => api.post('/verify_otp.php', { email, code, type });
export const getCaptcha = () => api.get('/get_captcha.php');
export const forgotPassword = (email) => api.post('/forgot_password.php', { email });
export const resetWithToken = (email, token, password) => api.post('/reset_with_token.php', { email, token, password });
export const resetPasswordOTP = (data) => api.post('/reset_password_otp.php', data);

// ── Credits & Bundles ─────────────────────────────────────────────────────────
export const getCreditBundles = () => api.get('/payments/bundles');
export const getMyCredits = () => api.get('/payments/my-credits');
export const getMyUnlocks = () => api.get('/payments/my-unlocks');
export const getMyTransactions = () => api.get('/payments/my-transactions');
export const validateCoupon = (code, bundle_id) => api.post('/payments/validate-coupon', { code, bundle_id });
export const createCreditOrder = (bundle_id, coupon_code) => api.post('/payments/create-order', { bundle_id, coupon_code });
export const verifyCreditPayment = (data) => api.post('/payments/verify', data);
export const unlockBlog = (blog_slug) => api.post('/payments/unlock-blog', { blog_slug });

// ── Admin: Bundles & Coupons ──────────────────────────────────────────────────
export const getAdminBundles = () => api.get('/admin/bundles');
export const saveBundle = (data) => api.post('/admin/bundles', data);
export const deleteBundle = (id) => api.delete(`/admin/bundles/${id}`);
export const getAdminCoupons = () => api.get('/admin/coupons');
export const saveCoupon = (data) => api.post('/admin/coupons', data);
export const deleteCoupon = (id) => api.delete(`/admin/coupons/${id}`);
export const getCreditStats = () => api.get('/admin/credit-stats');
export const getAllCreditTransactions = (page = 1, limit = 50) => api.get(`/admin/credit-transactions?page=${page}&limit=${limit}`);
export const getMemberCreditBalance = (memberId) => api.get(`/admin/member-credits/${memberId}`);
export const grantAdminCredits = (member_id, amount, note) => api.post('/admin/grant-credits', { member_id, amount, note });

// Email templates
export const getEmailTemplates = () => api.get('/admin/email-templates');
export const getEmailTemplate = (key) => api.get(`/admin/email-templates/${key}`);
export const saveEmailTemplate = (key, content) => api.put(`/admin/email-templates/${key}`, { content });

// Changelog
export const getChangelog = () => api.get('/admin/changelog');
export const saveChangelogEntry = (data) => api.post('/admin/changelog', data);
export const updateChangelogEntry = (id, data) => api.put(`/admin/changelog/${id}`, data);
export const deleteChangelogEntry = (id) => api.delete(`/admin/changelog/${id}`);

// Invoice
export const getInvoice = (txId) => api.get(`/payments/invoice/${txId}`);

// In-Article / Strip Blog Ads
export const getAdminBlogAds = () => api.get('/admin/blog-ads');
export const saveBlogAd = (data) => api.post('/admin/blog-ads', data);
export const deleteBlogAd = (id) => api.delete(`/admin/blog-ads/${id}`);
export const toggleBlogAd = (id) => api.patch(`/admin/blog-ads/${id}/toggle`);
export const getBlogAdsForSlug = (slug) => api.get(`/blog-ads/for-blog?slug=${slug}`);
export const trackBlogAdClick = (id) => api.post(`/blog-ads/click/${id}`);

// Bonus credit actions
export const claimLinkedInBonus = () => api.post('/payments/linkedin-bonus');
export const claimCompleteProfileBonus = () => api.post('/payments/complete-profile-bonus');
export const reportArticleError = (blog_slug, description) => api.post('/payments/report-error', { blog_slug, description });
export const claimProductReviewBonus = (product_id) => api.post('/payments/product-review-bonus', { product_id });

export default api;
