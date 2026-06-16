const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'hello@sap.webanatomy.in';

function getSiteUrl() {
  return (process.env.SITE_URL || 'https://sap.webanatomy.in').replace(/\/$/, '');
}

class NotificationService {
  constructor(mailService) {
    this.mail = mailService;
    this.adminEmail = ADMIN_EMAIL;
  }

  _loginUrl() { return getSiteUrl() + '/member/login'; }

  // ── Member Notifications ──────────────────────────────────────────────────

  async notifyMemberSignupSubmitted(email, name) {
    await this.mail.send(email, 'Registration Request Submitted', 'member/signup_submitted', { name });
    await this.mail.send(this.adminEmail, 'New Member Registration Request', 'member/admin_new_signup', {
      name, email, time: new Date().toISOString(),
    });
  }

  async notifyMemberApproved(email, name, credentials = {}, loginUrl = null) {
    const siteUrl = getSiteUrl();
    await this.mail.send(email, 'Your Account Has Been Approved', 'member/signup_approved', {
      name,
      login_url: loginUrl || this._loginUrl(),
      username: email,
      password: credentials.password || 'Your existing password',
      site_url: siteUrl,
      site_domain: new URL(siteUrl).hostname,
    });
  }

  async notifyMemberRejected(email, name, reason) {
    await this.mail.send(email, 'Registration Request Rejected', 'member/signup_rejected', { name, reason });
  }

  // ── Contributor Notifications ─────────────────────────────────────────────

  async notifyContributorApplicationSubmitted(email, data) {
    await this.mail.send(email, 'Contributor Application Submitted', 'contributor/application_submitted', { name: data.name });
    await this.mail.send(this.adminEmail, 'New Contributor Application', 'contributor/admin_new_application', {
      name: data.name, email, experience: data.experience || 'N/A', details: data.details || 'N/A',
    });
  }

  async notifyContributorApproved(email, name, credentials = {}) {
    const siteUrl = getSiteUrl();
    await this.mail.send(email, 'Contributor Access Approved', 'contributor/contributor_approved', {
      name,
      login_url: this._loginUrl(),
      username: email,
      password: credentials.password || 'Your existing password',
      site_url: siteUrl,
      site_domain: new URL(siteUrl).hostname,
    });
  }

  async notifyContributorRejected(email, name, reason) {
    await this.mail.send(email, 'Contributor Application Rejected', 'contributor/contributor_rejected', { name, reason });
  }

  // ── Blog Notifications ────────────────────────────────────────────────────

  async notifyBlogSubmitted(blogTitle, authorName) {
    await this.mail.send(this.adminEmail, 'Blog Submitted for Review', 'contributor/blog_submitted', {
      title: blogTitle, author: authorName, date: new Date().toISOString().slice(0, 10),
    });
  }

  async notifyBlogApproved(authorEmail, blogTitle, postUrl = null) {
    await this.mail.send(authorEmail, 'Your Blog Has Been Published', 'contributor/blog_approved', {
      title: blogTitle, post_url: postUrl || getSiteUrl(),
    });
  }

  async notifyBlogRejected(authorEmail, blogTitle, reason) {
    await this.mail.send(authorEmail, 'Blog Submission Rejected', 'contributor/blog_rejected', { title: blogTitle, reason });
  }

  async notifyBlogMovedToDraft(authorEmail, blogTitle, reason) {
    await this.mail.send(authorEmail, 'Action Required: Blog Moved to Draft', 'contributor/blog_drafted', { title: blogTitle, reason });
  }

  // ── Comment Notifications ─────────────────────────────────────────────────

  async notifyCommentSubmitted(email, name) {
    await this.mail.send(email, 'Comment Submitted for Review', 'comments/comment_submitted', { name });
  }

  async notifyAdminNewComment(data) {
    await this.mail.send(this.adminEmail, 'New Comment Submitted', 'comments/admin_new_comment', {
      article: data.article_title,
      content: data.content,
      user: `${data.user_name} (${data.user_email})`,
    });
  }

  async notifyCommentApproved(email, name) {
    await this.mail.send(email, 'Your Comment Was Approved', 'comments/comment_approved', { name });
  }

  async notifyCommentRejected(email, name, reason) {
    await this.mail.send(email, 'Your Comment Was Rejected', 'comments/comment_rejected', { name, reason });
  }

  // ── System Notifications ──────────────────────────────────────────────────

  async notifyContactSubmission(data) {
    await this.mail.send(this.adminEmail, 'New Contact Form Submission', 'contact/contact_submission', {
      name: data.name, email: data.email, message: data.message, time: new Date().toISOString(),
    });
  }

  async notifyPasswordReset(email, resetUrl) {
    await this.mail.send(email, 'Password Reset Request', 'system/password_reset', { reset_url: resetUrl });
  }

  async notifyAccountDeletionOTP(email, name, otp) {
    await this.mail.send(email, 'Account Deletion Verification Code', 'member/account_deletion_otp', {
      name, code: otp, year: new Date().getFullYear(),
    });
  }

  async notifyAccountDeleted(email, name) {
    await this.mail.send(email, 'Your Account Has Been Deleted', 'member/account_deleted', {
      name, year: new Date().getFullYear(),
    });
  }

  async notifyContributorDeletionOTP(email, name, otp) {
    await this.mail.send(email, 'Contributor Account Deletion Verification Code', 'contributor/deletion_otp', {
      name, code: otp, year: new Date().getFullYear(),
    });
  }

  async notifyContributorDowngradedToMember(email, name) {
    await this.mail.send(email, 'Your Contributor Access Has Been Removed', 'contributor/downgraded_to_member', {
      name, login_url: this._loginUrl(), year: new Date().getFullYear(),
    });
  }
}

module.exports = NotificationService;
