const { asyncHandler } = require('../../utils/asyncHandler');
const { sendSuccess, sendError } = require('../../utils/apiResponse');
const NotificationService = require('../../services/NotificationService');
const MailService = require('../../services/MailService');
const CacheService = require('../../services/CacheService');
const { grantBonus, getActivityCredits } = require('../../services/CreditHelper');
const { checkPlagiarismScore } = require('../../utils/helpers');
const repo = require('../../repositories/admin/blogsRepository');

const cache = new CacheService(1800);

// GET /api/admin/blogs/pending — bare array, not the {status, ...} envelope
const REVIEWABLE_STATUSES = ['pending', 'approved', 'rejected', 'draft'];

const listPending = asyncHandler(async (req, res) => {
  const db = req.db;
  const requested = req.query.status || 'pending';
  const isAdmin = req.session.role === 'admin';
  // Non-admins may only view pending/draft — not approved/rejected (info leak)
  const allowedStatuses = isAdmin ? REVIEWABLE_STATUSES : ['pending', 'draft'];
  const status = allowedStatuses.includes(requested) ? requested : 'pending';
  const reviewerId = req.session.admin_id;

  const rows = await repo.findPendingByStatus(db, status, { isAdmin, reviewerId });
  return res.json(rows);
});

// PUT /api/admin/blogs/:id/review
const review = asyncHandler(async (req, res) => {
  const db = req.db;
  const { id } = req.params;
  const { rejection_reason = '' } = req.body || {};
  // Normalise: frontend sends 'save_as_draft' — treat as 'draft'
  const rawAction = req.body?.action || '';
  const action = rawAction === 'save_as_draft' ? 'draft' : rawAction;

  if (!['approve', 'reject', 'draft'].includes(action)) {
    return sendError(res, 'Invalid action. Must be approve, reject, or draft.', 400);
  }

  const blog = await repo.findByIdWithAuthorEmail(db, id);
  if (!blog) return sendError(res, 'Blog not found', 404);

  // Non-admins cannot take any review action on their own submission.
  const reviewerId = req.session.admin_id;
  const isAdmin = req.session.role === 'admin';
  if (!isAdmin && String(blog.author_id) === String(reviewerId)) {
    return sendError(res, 'You cannot review your own submission.', 403);
  }

  const mailService = MailService.getInstance(db);
  const notifier = new NotificationService(mailService);

  if (action === 'approve') {
    const isEdited = blog.submission_status === 'edited';

    if (isEdited) {
      await repo.approveEditedBlog(db, id);
    } else {
      await repo.approveDirectBlog(db, id);
    }

    cache.invalidate('homepage_data_public');

    const siteUrl = (process.env.SITE_URL || 'http://sapsecurityexpert.com').replace(/\/$/, '');
    const postUrl = `${siteUrl}/${blog.category}/${blog.slug}`;
    if (blog.author_email) notifier.notifyBlogApproved(blog.author_email, blog.title, postUrl).catch(() => {});

    // Grant +20 credits to the member account matching the blog author's email (once per blog)
    if (blog.author_email) {
      const member = await repo.findMemberIdByEmail(db, blog.author_email);
      if (member) {
        getActivityCredits(db, 'article_published', 20).then((amt) =>
          grantBonus(db, member.id, amt, `Article published: blog #${id}`)
        ).catch(() => {});
      }
    }

    return sendSuccess(res, { message: 'Blog approved and published.' });
  } else if (action === 'reject') {
    await repo.rejectBlog(db, id, rejection_reason);
    if (blog.author_email) notifier.notifyBlogRejected(blog.author_email, blog.title, rejection_reason).catch(() => {});
    return sendSuccess(res, { message: 'Blog rejected.' });
  } else {
    // draft
    await repo.moveToDraft(db, id, rejection_reason);
    if (blog.author_email) notifier.notifyBlogMovedToDraft(blog.author_email, blog.title, rejection_reason).catch(() => {});
    return sendSuccess(res, { message: 'Blog moved to draft.' });
  }
});

// POST /api/admin/blogs/recalculate-plagiarism
const recalculatePlagiarism = asyncHandler(async (req, res) => {
  const db = req.db;
  const { id } = req.body || {};
  if (!id) return sendError(res, 'Blog ID required', 400);

  const blog = await repo.findByIdWithContent(db, id);
  if (!blog) return sendError(res, 'Blog not found', 404);

  const result = await checkPlagiarismScore(blog.content, id, db);
  const score = result.score;

  await repo.updatePlagiarismScore(db, id, score);

  return sendSuccess(res, { plagiarism_score: score });
});

// POST /api/admin/blogs/bulk-recalculate-plagiarism
const bulkRecalculatePlagiarism = asyncHandler(async (req, res) => {
  const db = req.db;
  const rows = await repo.findBlogsNeedingPlagiarismRecalc(db);
  if (!rows.length) return sendSuccess(res, { message: 'No blogs need recalculation.', updated: 0 });

  let updated = 0;
  for (const blog of rows) {
    const result = await checkPlagiarismScore(blog.content, blog.id, db).catch(() => ({ score: -1 }));
    await repo.updatePlagiarismScore(db, blog.id, result.score);
    updated++;
  }
  return sendSuccess(res, { message: `Updated ${updated} blog(s).`, updated });
});

// POST /api/admin/blogs/toggle-exclusive
const toggleExclusive = asyncHandler(async (req, res) => {
  const db = req.db;
  const { id, is_members_only, preview_paragraphs } = req.body || {};
  if (!id) return sendError(res, 'ID required', 400);

  // Block enabling exclusive on a premium article
  if (is_members_only) {
    const blog = await repo.findIsPremiumById(db, id);
    if (blog && Number(blog.is_premium) === 1) {
      return sendError(res, 'Premium articles cannot be set as Exclusive.', 400);
    }
  }
  await repo.updateExclusive(db, id, is_members_only ? 1 : 0, is_members_only ? preview_paragraphs : null);
  return sendSuccess(res, { message: 'Exclusive content setting updated.' });
});

// POST /api/admin/blogs/toggle-premium
const togglePremium = asyncHandler(async (req, res) => {
  const db = req.db;
  const { id, is_premium, credits_required } = req.body || {};
  if (!id) return sendError(res, 'ID required', 400);

  const isPremium = is_premium ? 1 : 0;
  await repo.updatePremium(db, id, isPremium, credits_required != null ? (parseInt(credits_required) || 1) : null);
  return sendSuccess(res, { message: 'Premium setting updated.' });
});

// POST /api/admin/blogs/toggle-expert-pick
const toggleExpertPick = asyncHandler(async (req, res) => {
  const db = req.db;
  const { id, is_expert_pick } = req.body || {};
  if (!id) return sendError(res, 'ID required', 400);

  await repo.updateExpertPick(db, id, is_expert_pick ? 1 : 0);
  return sendSuccess(res, { message: 'Expert pick setting updated.' });
});

// GET /api/admin/blogs/select-list — lightweight list for selectors
const selectList = asyncHandler(async (req, res) => {
  const blogs = await repo.findSelectList(req.db);
  return sendSuccess(res, { blogs });
});

module.exports = {
  listPending, review, recalculatePlagiarism, bulkRecalculatePlagiarism,
  toggleExclusive, togglePremium, toggleExpertPick, selectList,
};
