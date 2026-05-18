<?php
// api/services/NotificationService.php

require_once __DIR__ . '/MailService.php';

class NotificationService
{
    private $mailService;
    private $adminEmail = 'raghu@sapsecurityexpert.com'; // Default admin email

    public function __construct()
    {
        $this->mailService = MailService::getInstance();
    }

    private function getLoginUrl()
    {
        $siteUrl = getSiteUrl();
        return rtrim($siteUrl, '/') . '/member/login';
    }

    // --- Member Notifications ---

    public function notifyMemberSignupSubmitted($userEmail, $userName)
    {
        // To User
        $this->mailService->send($userEmail, "Registration Request Submitted", "member/signup_submitted", [
            'name' => $userName
        ]);
        // To Admin
        $this->mailService->send($this->adminEmail, "New Member Registration Request", "member/admin_new_signup", [
            'name' => $userName,
            'email' => $userEmail,
            'time' => date('Y-m-d H:i:s')
        ]);
    }

    public function notifyMemberApproved($userEmail, $userName, $credentials = [], $loginUrl = null)
    {
        $siteUrl = getSiteUrl();
        $domain = parse_url($siteUrl, PHP_URL_HOST) ?: 'sapsecurityexpert.com';

        $this->mailService->send($userEmail, "Your Account Has Been Approved", "member/signup_approved", [
            'name' => $userName,
            'login_url' => $loginUrl ?: $this->getLoginUrl(),
            'username' => $userEmail, // Send the mail id, not the username
            'password' => $credentials['password'] ?? 'Your existing password',
            'site_url' => $siteUrl,
            'site_domain' => $domain
        ]);
    }
    public function notifyMemberRejected($userEmail, $userName, $reason)
    {
        $this->mailService->send($userEmail, "Registration Request Rejected", "member/signup_rejected", [
            'name' => $userName,
            'reason' => $reason
        ]);
    }

    // --- Contributor Notifications ---

    public function notifyContributorApplicationSubmitted($userEmail, $data)
    {
        // To User
        $this->mailService->send($userEmail, "Contributor Application Submitted", "contributor/application_submitted", [
            'name' => $data['name']
        ]);
        // To Admin
        $this->mailService->send($this->adminEmail, "New Contributor Application", "contributor/admin_new_application", [
            'name' => $data['name'],
            'email' => $userEmail,
            'experience' => $data['experience'] ?? 'N/A',
            'details' => $data['details'] ?? 'N/A'
        ]);
    }

    public function notifyContributorApproved($userEmail, $userName, $credentials = [])
    {
        $siteUrl = getSiteUrl();
        $domain = parse_url($siteUrl, PHP_URL_HOST) ?: 'sapsecurityexpert.com';

        $this->mailService->send($userEmail, "Contributor Access Approved", "contributor/contributor_approved", [
            'name' => $userName,
            'login_url' => $this->getLoginUrl(),
            'username' => $userEmail, // Send the mail id, not the username
            'password' => $credentials['password'] ?? 'Your existing password',
            'site_url' => $siteUrl,
            'site_domain' => $domain
        ]);
    }

    public function notifyContributorRejected($userEmail, $userName, $reason)
    {
        $this->mailService->send($userEmail, "Contributor Application Rejected", "contributor/contributor_rejected", [
            'name' => $userName,
            'reason' => $reason
        ]);
    }

    // --- Blog Notifications ---

    public function notifyBlogSubmitted($blogTitle, $authorName, $adminEmail = null)
    {
        $target = $adminEmail ?: $this->adminEmail;
        $this->mailService->send($target, "Blog Submitted for Review", "contributor/blog_submitted", [
            'title' => $blogTitle,
            'author' => $authorName,
            'date' => date('Y-m-d')
        ]);
    }

    public function notifyBlogApproved($authorEmail, $blogTitle, $postUrl = null)
    {
        $siteUrl = getSiteUrl();
        $this->mailService->send($authorEmail, "Your Blog Has Been Published", "contributor/blog_approved", [
            'title' => $blogTitle,
            'post_url' => $postUrl ?: $siteUrl
        ]);
    }

    public function notifyBlogRejected($authorEmail, $blogTitle, $reason)
    {
        $this->mailService->send($authorEmail, "Blog Submission Rejected", "contributor/blog_rejected", [
            'title' => $blogTitle,
            'reason' => $reason
        ]);
    }

    public function notifyBlogMovedToDraft($authorEmail, $blogTitle, $reason)
    {
        $this->mailService->send($authorEmail, "Action Required: Blog Moved to Draft", "contributor/blog_drafted", [
            'title' => $blogTitle,
            'reason' => $reason
        ]);
    }

    // --- Comments Notifications ---

    public function notifyCommentSubmitted($userEmail, $userName)
    {
        $this->mailService->send($userEmail, "Comment Submitted for Review", "comments/comment_submitted", [
            'name' => $userName
        ]);
    }

    public function notifyAdminNewComment($data, $adminEmail = null)
    {
        $target = $adminEmail ?: $this->adminEmail;
        $this->mailService->send($target, "New Comment Submitted", "comments/admin_new_comment", [
            'article' => $data['article_title'],
            'content' => $data['content'],
            'user' => $data['user_name'] . " (" . $data['user_email'] . ")"
        ]);
    }

    public function notifyCommentApproved($userEmail, $userName)
    {
        $this->mailService->send($userEmail, "Your Comment Was Approved", "comments/comment_approved", [
            'name' => $userName
        ]);
    }

    public function notifyCommentRejected($userEmail, $userName, $reason)
    {
        $this->mailService->send($userEmail, "Your Comment Was Rejected", "comments/comment_rejected", [
            'name' => $userName,
            'reason' => $reason
        ]);
    }

    // --- Contact/System Notifications ---

    public function notifyContactSubmission($data)
    {
        $this->mailService->send($this->adminEmail, "New Contact Form Submission", "contact/contact_submission", [
            'name' => $data['name'],
            'email' => $data['email'],
            'message' => $data['message'],
            'time' => date('Y-m-d H:i:s')
        ]);
    }

    public function notifyPasswordReset($userEmail, $resetUrl)
    {
        $this->mailService->send($userEmail, "Password Reset Request", "system/password_reset", [
            'reset_url' => $resetUrl
        ]);
    }

    public function notifyAccountDeletionOTP($userEmail, $userName, $otp)
    {
        $this->mailService->send($userEmail, "Account Deletion Verification Code", "member/account_deletion_otp", [
            'name' => $userName,
            'code' => $otp,
            'year' => date('Y')
        ]);
    }

    public function notifyAccountDeleted($userEmail, $userName)
    {
        $this->mailService->send($userEmail, "Your Account Has Been Deleted", "member/account_deleted", [
            'name' => $userName,
            'year' => date('Y')
        ]);
    }
}
?>