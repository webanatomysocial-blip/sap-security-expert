import { useState, useEffect } from "react";
import { useParams, useLocation, useNavigate, Link } from "react-router-dom";
import BlogLayout from "./BlogLayout";
import { useMemberAuth } from "../context/MemberAuthContext";
import {
  getPostBySlug,
  getCommentsByBlogId,
  updatePostViews,
  getAdsByZone,
} from "../services/api";

export default function DynamicBlog() {
  const { blogId } = useParams(); // Expecting slug
  const { isLoggedIn } = useMemberAuth();
  const [blog, setBlog] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [commentsCount, setCommentsCount] = useState(0);
  const [relatedBlogs, setRelatedBlogs] = useState([]);
  const [premiumLocked, setPremiumLocked] = useState(false);
  const [sidebarAd, setSidebarAd] = useState({
    active: false,
    image: "",
    link: "",
  });

  const location = useLocation();
  const navigate = useNavigate();

  // Check for Virtual Blog (API) + Track Views
  useEffect(() => {
    if (!blogId) return;

    // Generate or retrieve visitor_token from localStorage
    let visitorToken = localStorage.getItem("visitor_token");
    if (!visitorToken) {
      visitorToken =
        "visitor_" + Math.random().toString(36).substr(2, 9) + Date.now();
      localStorage.setItem("visitor_token", visitorToken);
    }

    // Fetch blog from API
    getPostBySlug(blogId)
      .then((response) => {
        // Handle both simple JSON and Laravel Resource response
        let postData = response.data || response;

        // If returns an array (Laravel sometimes does this), take the first item
        if (Array.isArray(postData)) {
          postData = postData[0];
        }

        if (!postData || (!postData.title && !postData.id)) {
          console.error("DEBUG: Blog postData invalid", postData);
          throw new Error("Blog not found");
        }

        // DRAFT PROTECTION: If the post is a draft, do not show it publicly
        if (postData.status === 'draft') {
          console.warn("DEBUG: Attempted access to draft blog. Blocking.");
          throw new Error("Blog not found");
        }

        // ROUTING VALIDATION
        const pathSegments = location.pathname.split("/").filter(Boolean);
        const urlCategory = pathSegments[0];

        if (postData.category && urlCategory !== "blogs") {
          const canonicalCategory = postData.category
            .toLowerCase()
            .replace(/\s+/g, "-");
          const currentCategory = urlCategory.toLowerCase();

          if (canonicalCategory !== currentCategory) {
            console.warn(
              `DEBUG: Category mismatch. Found: ${currentCategory}, Expected: ${canonicalCategory}. Redirecting...`,
            );
            navigate(`/${canonicalCategory}/${postData.slug}`, {
              replace: true,
            });
            return;
          }
        }

        setBlog(postData);
        // Re-check unlock state in case context loaded after this fetch
        setPremiumLocked(!!postData.premium_locked);
        setLoading(false);

        // Title and Meta Description are now strictly managed by BlogLayout's <SEO> block
        // to prevent React-Helmet race conditions that cause tab titles to revert to defaults.

        // Track view for virtual blog
        if (postData.id || postData.slug) {
          const postId = postData.slug || postData.id;
          updatePostViews({
            post_id: postId,
            visitor_token: visitorToken,
          }).catch((err) => console.error("View tracking failed:", err));
        }

        // Fetch related blogs if present
        if (postData.related_blogs) {
          let relatedIds = [];
          try {
            relatedIds = typeof postData.related_blogs === 'string'
              ? JSON.parse(postData.related_blogs.replace(/\\"/g, '"'))
              : postData.related_blogs;
          } catch (e) { console.error("JSON parse error for related_blogs", e); }

          if (Array.isArray(relatedIds) && relatedIds.length > 0) {
            import("../services/api").then(({ getBlogs }) => {
              getBlogs().then(res => {
                const allBlogs = Array.isArray(res.data) ? res.data : res.data.data || [];
                // Use robust ID comparison (convert both to String)
                const filtered = allBlogs.filter(b => 
                  relatedIds.some(id => String(id) === String(b.id))
                );
                setRelatedBlogs(filtered);
              }).catch(err => console.error("Error fetching all blogs for related", err));
            }).catch(err => console.error("Dynamic import failed", err));
          }
        }
      })
      .catch((err) => {
        console.error("Error loading blog details from API", err);
        setError("Blog not found");
        setBlog(null);
        setLoading(false);
      });

    // Fetch sidebar ad
    getAdsByZone("sidebar")
      .then((res) => {
        const data = res.data;
        if (data && data.active) {
          setSidebarAd(data);
        }
      })
      .catch(() => {
        // Silent fail for ads
      });

    // Fetch comments count
    if (blogId) {
      getCommentsByBlogId(blogId)
        .then((res) => {
          const data = res.data;
          if (Array.isArray(data)) {
            const topLevelComments = data.filter((c) => !c.parent_id);
            setCommentsCount(topLevelComments.length);
          }
        })
        .catch((err) => console.error("Comments fetch failed", err));
    }
  }, [blogId, location.pathname, navigate, isLoggedIn]);

  const handleCommentAdded = () => {
    setCommentsCount((prevCount) => prevCount + 1);
  };

  // RENDER LOADING
  if (loading) {
    return (
      <div style={{ padding: "100px", textAlign: "center" }}>
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
        <p>Blog...</p>
      </div>
    );
  }

  // RENDER ERROR
  if (error || !blog) {
    return (
      <div style={{ padding: "100px", textAlign: "center" }}>
        <h1>404 - Blog Not Found</h1>
        <p>
          The article you are looking for does not exist or has been removed.
        </p>
        <Link
          to="/"
          style={{
            display: "inline-block",
            marginTop: "20px",
            padding: "12px 30px",
            background: "#1e293b",
            color: "white",
            borderRadius: "8px",
            textDecoration: "none",
            fontWeight: "600",
          }}
        >
          Go Back Home
        </Link>
      </div>
    );
  }

  const isExclusive = Number(blog.is_members_only) === 1;

  // Called by PremiumPaywall after successful payment — re-fetch to get full content
  const handlePaymentSuccess = () => {
    setLoading(true);
    getPostBySlug(blogId)
      .then((response) => {
        const postData = Array.isArray(response.data) ? response.data[0] : response.data;
        if (postData?.title) {
          setBlog(postData);
          setPremiumLocked(!!postData.premium_locked);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  return (
    <>
      <BlogLayout
        blogId={blogId}
        title={blog.title}
        content={
          <div
            className="blog-content-body"
            dangerouslySetInnerHTML={{ __html: blog.content }}
          />
        }
        isPremium={Number(blog.is_premium) === 1}
        isPremiumLocked={premiumLocked}
        creditsRequired={Number(blog.credits_required) || 1}
        blogSlug={blog.slug || blogId}
        onPaymentSuccess={handlePaymentSuccess}
        image={blog.image || blog.featured_image}
        image_alt={blog.image_alt || blog.title}
        date={blog.date || blog.published_at || blog.created_at}
        author_name={blog.author_name}
        author_image={blog.author_image}
        author_bio={blog.author_bio}
        author_designation={blog.author_designation}
        author_linkedin={blog.author_linkedin}
        author_twitter={blog.author_twitter}
        author_website={blog.author_website}
        category={blog.category}
        sidebarAd={sidebarAd}
        relatedBlogs={relatedBlogs}
        dynamicRecentPosts={[]}
        viewCount={blog.view_count || 0}
        commentCount={commentsCount}
        onCommentAdded={handleCommentAdded}
        isExclusive={isExclusive}
        metaTitle={blog.meta_title}
        metaDescription={blog.meta_description}
        metaKeywords={blog.meta_keywords}
        isMembersOnly={isExclusive}
        co_authors={(() => {
          if (!blog.co_authors) return [];
          if (Array.isArray(blog.co_authors)) return blog.co_authors;
          try { const p = JSON.parse(blog.co_authors); return Array.isArray(p) ? p : []; } catch { return []; }
        })()}
        faqs={(() => {
          if (!blog.faqs || blog.faqs === "null") return [];
          if (Array.isArray(blog.faqs)) return blog.faqs;
          try {
            const p = JSON.parse(blog.faqs);
            return Array.isArray(p) ? p : [];
          } catch {
            return [];
          }
        })()}
        cta={{
          title: blog.cta_title,
          description: blog.cta_description,
          buttonText: blog.cta_button_text,
          buttonLink: blog.cta_button_link,
        }}
      />
    </>
  );
}
