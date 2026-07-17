# Changelog

## [3.3.0] - 2026-07-15
### Added
- Download credits feature — members spend credits to download files attached to blog posts
- Protected file downloads with one-time session tokens (copied URLs are rejected)
- Downloads tab in member credits page showing all purchased downloads with re-download button
- Insert Download Block in blog editor for Downloads category
- SQLite session store — member sessions now survive server restarts

### Fixed
- Member login redirect — after login, returns to the original page instead of home
- Credit activity tracking for file downloads

## [3.2.0] - 2026-07-10
### Added
- Credit activities system — admins can configure how many credits each activity awards
- Paywall paragraph selector — admins can choose exactly which paragraph triggers the paywall
- Downloads category for blog posts

### Fixed
- RTE editor cursor position after inserting content blocks

## [3.1.0] - 2026-07-02
### Added
- Credit bundles — members can purchase credits via Razorpay
- Coupon code support for credit purchases
- Member referral system — earn credits for approved referrals
- LinkedIn share bonus credits
- Complete profile bonus credits

### Changed
- Replaced subscription model with credit-based article unlock system

## [3.0.0] - 2026-06-15
### Added
- Full platform relaunch with Next.js 15 App Router
- SSR blog pages for SEO (Googlebot gets full HTML on first byte)
- Member authentication system separate from admin auth
- Admin contributor management
- Blog editor with rich text editor
