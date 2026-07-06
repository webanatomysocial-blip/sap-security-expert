const NotificationService = require('../services/NotificationService');
const MailService = require('../services/MailService');
const repo = require('../repositories/commentsPublicRepository');

const MAX_CONTENT_LEN = 5000;
const MAX_NAME_LEN = 100;
const MAX_POST_ID_LEN = 200;

// Both handlers keep their original explicit try/catch (not asyncHandler/
// next(err)): each returns its own specific-but-safe message on failure
// ("Failed to load comments." / "Failed to submit comment."), which differs
// from the central handler's generic "Internal server error" — centralizing
// would silently change this response's exact text.

// GET /api/get_comments.php?blogId=...
const getComments = async (req, res) => {
  const db = req.db;
  const { blogId } = req.query;

  if (!blogId || typeof blogId !== 'string' || blogId.length > MAX_POST_ID_LEN) {
    return res.status(400).json({ status: 'error', message: 'blogId is required' });
  }

  try {
    const rows = await repo.findApprovedByPostId(db, blogId);

    const sessionMemberId = req.session?.member_logged_in ? (req.session.member_id || null) : null;

    const isAnon = (visJson) => {
      if (!visJson) return false;
      try {
        const v = typeof visJson === 'string' ? JSON.parse(visJson) : visJson;
        return v.show_name === false;
      } catch { return false; }
    };

    // Decode HTML entities left over from old PHP htmlspecialchars() saves
    const decode = (s) => typeof s === 'string'
      ? s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
           .replace(/&quot;/g, '"').replace(/&#039;/g, "'")
      : s;

    const result = rows.map((r) => {
      // Show real name only to the author themselves; everyone else sees "Anonymous"
      const authorAnon = isAnon(r.member_visibility) && !(sessionMemberId && r.member_id == sessionMemberId);
      const parentAnon = isAnon(r.parent_member_visibility) && !(sessionMemberId && r.parent_member_id == sessionMemberId);

      return {
        id: r.id,
        post_id: r.post_id,
        parent_id: r.parent_id,
        member_id: authorAnon ? null : r.member_id,
        date: r.timestamp,
        text: decode(r.text),
        author: authorAnon ? 'Anonymous' : decode(r.author),
        parent_author: parentAnon ? 'Anonymous' : decode(r.parent_author),
        parent_text: decode(r.parent_text),
        // email is never sent to the client — not needed by the frontend
      };
    });

    return res.json(result);
  } catch (err) {
    console.error('[comments GET]', err.message);
    return res.status(500).json({ status: 'error', message: 'Failed to load comments.' });
  }
};

// POST /api/save_comment.php or POST /api/comments
const saveComment = async (req, res) => {
  const db = req.db;
  const body = req.body || {};

  const post_id = String(body.post_id || body.blogId || '').trim();
  const user_name = String(body.user_name || body.author || '').trim();
  const email = String(body.email || '').trim();
  const content = String(body.content || body.text || '').trim();
  const parent_id = body.parent_id != null ? parseInt(body.parent_id, 10) : null;

  // Required field validation
  if (!post_id || !user_name || !email || !content) {
    return res.status(400).json({ status: 'error', message: 'All fields are required.' });
  }

  // Length limits — prevent oversized payloads reaching the DB
  if (post_id.length > MAX_POST_ID_LEN) {
    return res.status(400).json({ status: 'error', message: 'Invalid post ID.' });
  }
  if (user_name.length > MAX_NAME_LEN) {
    return res.status(400).json({ status: 'error', message: 'Name is too long.' });
  }
  if (content.length > MAX_CONTENT_LEN) {
    return res.status(400).json({ status: 'error', message: `Comment must be under ${MAX_CONTENT_LEN} characters.` });
  }
  if (email.length > 254) {
    return res.status(400).json({ status: 'error', message: 'Invalid email address.' });
  }

  // Email format
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ status: 'error', message: 'Invalid email address.' });
  }

  // parent_id must be a valid integer if supplied
  if (body.parent_id != null && (isNaN(parent_id) || parent_id <= 0)) {
    return res.status(400).json({ status: 'error', message: 'Invalid parent comment.' });
  }

  try {
    // Verify post exists
    const blog = await repo.findBlogBySlugOrId(db, post_id);
    if (!blog) {
      return res.status(404).json({ status: 'error', message: 'Post not found.' });
    }
    const articleTitle = blog.title;

    // Validate parent_id belongs to the same post (prevents cross-post reply hijacking)
    if (parent_id) {
      const parent = await repo.findParentInSamePost(db, parent_id, post_id);
      if (!parent) {
        return res.status(400).json({ status: 'error', message: 'Invalid parent comment.' });
      }
    }

    // Only take member_id from the server session — never trust the client body
    const member_id = req.session?.member_logged_in ? (req.session.member_id || null) : null;

    // Always store the real name in the DB; anonymisation is applied at read time
    let stored_name = user_name;
    let notify_name = user_name;
    if (member_id) {
      const m = await repo.findMemberNameAndVisibility(db, member_id);
      if (m) {
        if (m.name) stored_name = m.name;
        try {
          const vis = typeof m.profile_visibility === 'string'
            ? JSON.parse(m.profile_visibility)
            : (m.profile_visibility || {});
          if (vis.show_name === false) notify_name = 'Anonymous';
        } catch { /* keep original */ }
      }
    }

    await repo.insertComment(db, { postId: post_id, storedName: stored_name, email, content, parentId: parent_id, memberId: member_id });

    const mailService = MailService.getInstance(db);
    const notifier = new NotificationService(mailService);
    notifier.notifyCommentSubmitted(email, notify_name).catch(() => {});
    notifier.notifyAdminNewComment({
      article_title: articleTitle,
      content,
      user_name: notify_name,
      user_email: email,
    }).catch(() => {});

    return res.json({ status: 'success', message: 'Comment submitted for review.' });
  } catch (err) {
    console.error('[comments POST]', err.message);
    return res.status(500).json({ status: 'error', message: 'Failed to submit comment.' });
  }
};

module.exports = { getComments, saveComment };
