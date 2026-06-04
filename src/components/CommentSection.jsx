import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
// next-disabled: import "../css/CommentSection.css";
import { submitComment, getCommentsByBlogId } from "../services/api";
import { useToast } from "../context/ToastContext";
import { useMemberAuth } from "../context/MemberAuthContext";

const CommentItem = ({ comment, depth = 0, replyMap, onReply }) => {
  const replies = replyMap[comment.id] || [];
  const [isExpanded, setIsExpanded] = useState(false);

  const showAll = isExpanded || replies.length <= 1;
  const visibleReplies = showAll ? replies : replies.slice(0, 1);
  const remainingCount = replies.length - 1;

  return (
    <div className={`comment-item ${depth > 0 ? "reply-item" : ""}`}>
      <div className="comment-content-wrapper">
        <div className="comment-header">
          <span className="comment-author">{comment.author}</span>
          <span className="comment-date">
            {new Date(comment.date).toLocaleDateString("en-US", {
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
          </span>
        </div>
        <p className="comment-text">{comment.text}</p>

        <div className="comment-footer">
          <button className="btn-reply-link" onClick={() => onReply(comment)}>
            <i className="bi bi-reply"></i> Reply
          </button>
        </div>
      </div>

      {replies.length > 0 && (
        <div className="replies-section">
          <div className="replies-container">
            {visibleReplies.map((reply) => (
              <CommentItem
                key={reply.id}
                comment={reply}
                depth={depth + 1}
                replyMap={replyMap}
                onReply={onReply}
              />
            ))}
          </div>

          {replies.length > 1 && !isExpanded && (
            <button
              className="btn-view-replies"
              onClick={() => setIsExpanded(true)}
            >
              <i className="bi bi-chevron-down"></i> View Replies (
              {remainingCount})
            </button>
          )}

          {replies.length > 1 && isExpanded && (
            <button
              className="btn-view-replies collapse"
              onClick={() => setIsExpanded(false)}
            >
              <i className="bi bi-chevron-up"></i> Hide Replies
            </button>
          )}
        </div>
      )}
    </div>
  );
};

const CommentSection = ({ blogId, onCommentAdded, isExclusive }) => {
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [authorName, setAuthorName] = useState("");
  const [email, setEmail] = useState("");
  const [honeypot, setHoneypot] = useState("");
  const [mathAnswer, setMathAnswer] = useState("");
  const [replyTo, setReplyTo] = useState(null); // The comment being replied to
  const { addToast } = useToast();
  const { isLoggedIn, member } = useMemberAuth();

  useEffect(() => {
    if (isLoggedIn && member) {
      setAuthorName(member.name || "");
      setEmail(member.email || "");
    }
  }, [isLoggedIn, member]);

  const [mathQuestion, setMathQuestion] = useState(() => {
    const num1 = Math.floor(Math.random() * 10) + 1;
    const num2 = Math.floor(Math.random() * 10) + 1;
    return { q: `${num1} + ${num2}`, a: (num1 + num2).toString() };
  });

  const [visibleCount, setVisibleCount] = useState(3);
  const [totalComments, setTotalComments] = useState(0);

  const fetchComments = async () => {
    if (!blogId) return;
    try {
      const res = await getCommentsByBlogId(blogId);
      if (Array.isArray(res.data)) {
        setComments(res.data);
        // Only count top-level comments (exclude replies)
        const topLevelCount = res.data.filter((c) => !c.parent_id).length;
        setTotalComments(topLevelCount);
      }
    } catch (err) {
      console.error("Failed to load comments", err);
    }
  };

  useEffect(() => {
    fetchComments();
  }, [blogId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isLoggedIn) {
      addToast("Please login to post a comment.", "error");
      return;
    }
    if (!newComment.trim() || !authorName.trim() || !email.trim()) return;

    if (honeypot) return;

    if (mathAnswer !== mathQuestion.a) {
      addToast(`Incorrect security answer.`, "error");
      return;
    }

    const payload = {
      blogId: blogId,
      author: authorName,
      email: email,
      text: newComment,
      parent_id: replyTo ? replyTo.id : null,
    };

    try {
      const response = await submitComment(payload);

      if (response.status === 201) {
        addToast(
          "Thank you for your comment. It has been successfully submitted and is now awaiting moderation. Once reviewed, it will be published.",
          "success",
        );
        setNewComment("");
        // Preserve authorName and email from member data
        if (!isLoggedIn) {
          setAuthorName("");
          setEmail("");
        }
        setMathAnswer("");
        setReplyTo(null);

        const num1 = Math.floor(Math.random() * 10) + 1;
        const num2 = Math.floor(Math.random() * 10) + 1;
        setMathQuestion({
          q: `${num1} + ${num2}`,
          a: (num1 + num2).toString(),
        });

        // Refresh to show updated (if approved immediately, but usually it waits)
        fetchComments();

        // Notify parent to increment comment count if not a reply and assuming it could be auto-approved
        if (!replyTo && onCommentAdded) {
          onCommentAdded();
        }
      } else {
        addToast("Something went wrong.", "error");
      }
    } catch (error) {
      addToast("Failed to submit comment.", "error");
    }
  };

  const handleLoadMore = () => {
    setVisibleCount((prev) => prev + 3);
  };

  // Early return for exclusive content protection
  if (isExclusive && !isLoggedIn) {
    return null;
  }

  // Grouping logic
  const topLevelComments = comments.filter((c) => !c.parent_id);
  const replyMap = {};
  comments.forEach((c) => {
    if (c.parent_id) {
      if (!replyMap[c.parent_id]) replyMap[c.parent_id] = [];
      replyMap[c.parent_id].push(c);
    }
  });

  const visibleTopLevel = topLevelComments.slice(0, visibleCount);

  return (
    <div className="comments-section" id="comments">
      <h3>Comments ({totalComments})</h3>

      <div className="comments-list">
        {comments.length === 0 && (
          <p className="no-comments">No comments yet. Be the first!</p>
        )}

        {visibleTopLevel.map((comment) => (
          <CommentItem
            key={comment.id}
            comment={comment}
            replyMap={replyMap}
            onReply={setReplyTo}
          />
        ))}

        {visibleCount < topLevelComments.length && (
          <button className="comment-load-more-btn" onClick={handleLoadMore}>
            Load More comments
          </button>
        )}
      </div>

      {!isLoggedIn ? (
        <div className="login-to-comment-box">
          <div className="login-message-content">
            <i className="bi bi-lock-fill"></i>
            <h4>Want to join the conversation?</h4>
            <p>Please login to your account to leave a comment or reply.</p>
            <Link to="/member/login" className="btn-primary login-redirect-btn">
              Login to Comment
            </Link>
          </div>
        </div>
      ) : (
        <>
          {/* Main Comment Form */}
          <form className="comment-form" onSubmit={handleSubmit}>
            <h4>{replyTo ? `Reply to ${replyTo.author}` : "Leave a Comment"}</h4>
            {replyTo && (
              <button
                type="button"
                className="btn-cancel-reply"
                onClick={() => setReplyTo(null)}
              >
                Cancel Reply
              </button>
            )}

            <div className="logged-in-as">
              <span className="user-icon">
                <i className="bi bi-person-circle"></i>
              </span>
              <span>
                Logged in as <strong>{member?.name || "Member"}</strong>
              </span>
            </div>

            <div style={{ display: "none" }}>
              <input
                type="text"
                value={honeypot}
                onChange={(e) => setHoneypot(e.target.value)}
                tabIndex="-1"
                autoComplete="off"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Comment</label>
              <textarea
                className="form-control"
                rows="4"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Share your thoughts..."
                required
              ></textarea>
            </div>

            <div className="form-footer">
              <div className="form-group captcha-group">
                <label className="form-label">
                  Security Check: {mathQuestion.q} = ?
                </label>
                <input
                  type="text"
                  className="form-control"
                  value={mathAnswer}
                  onChange={(e) => setMathAnswer(e.target.value)}
                  required
                />
              </div>

              <button type="submit" className="btn-primary btn-submit-comment">
                {replyTo ? "Post Reply" : "Post Comment"}
              </button>
            </div>
          </form>
        </>
      )}

      {/* Reply Modal */}
      {replyTo && isLoggedIn && (
        <div className="comment-reply-overlay" onClick={() => setReplyTo(null)}>
          <div
            className="comment-reply-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h3>Reply to {replyTo.author}</h3>
              <button className="close-btn" onClick={() => setReplyTo(null)}>
                &times;
              </button>
            </div>
            <form className="comment-form" onSubmit={handleSubmit}>
              <div style={{ display: "none" }}>
                <input
                  type="text"
                  value={honeypot}
                  onChange={(e) => setHoneypot(e.target.value)}
                  tabIndex="-1"
                />
              </div>
              <div className="logged-in-as modal-user-info">
                <span>
                  Replying as <strong>{member?.name || "Member"}</strong>
                </span>
              </div>
              <div className="form-group">
                <textarea
                  className="form-control"
                  placeholder="Your Reply *"
                  rows="4"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  required
                ></textarea>
              </div>
              <div className="form-footer">
                <div className="captcha-box">
                  <span>{mathQuestion.q} = </span>
                  <input
                    type="text"
                    value={mathAnswer}
                    onChange={(e) => setMathAnswer(e.target.value)}
                    required
                  />
                </div>
                <button type="submit" className="btn-primary">
                  Post Reply
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CommentSection;
