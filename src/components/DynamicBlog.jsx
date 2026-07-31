import { useState, useEffect } from "react";
import { useParams, useLocation, useNavigate, Link } from "react-router-dom";
import BlogLayout from "./BlogLayout";
import ScrollNudgeModal from "./ScrollNudgeModal";
import DownloadBlock from "./DownloadBlock";
import { useMemberAuth } from "../context/MemberAuthContext";
import {
  getPostBySlug,
  getCommentsByBlogId,
  updatePostViews,
  getAdsByZone,
  getBlogAdsForSlug,
  trackBlogAdClick,
  getSuggestedArticles,
  getMyDownloads,
} from "../services/api";

function InlineAd({ ad }) {
  const handleClick = () => {
    trackBlogAdClick(ad.id).catch(() => {});
    if (ad.link) window.open(ad.link, "_blank", "noopener,noreferrer");
  };
  return (
    <div className="in-article-ad" onClick={handleClick} style={{ cursor: ad.link ? "pointer" : "default" }}>
      <img src={ad.image} alt={ad.title || "Advertisement"} />
    </div>
  );
}

function StripAd({ ad }) {
  const handleClick = () => {
    trackBlogAdClick(ad.id).catch(() => {});
    if (ad.link) window.open(ad.link, "_blank", "noopener,noreferrer");
  };
  return (
    <div className="strip-ad" onClick={handleClick} style={{ cursor: ad.link ? "pointer" : "default" }}>
      <img src={ad.image} alt={ad.title || "Advertisement"} />
    </div>
  );
}

// Split HTML on download block markers, preserving their data attributes.
function splitOnDownloadBlocks(html) {
  const parts = [];
  const re = /<div[^>]*data-sap-download="1"[^>]*>([\s\S]*?)<\/div>/gi;
  let last = 0;
  let m;
  while ((m = re.exec(html)) !== null) {
    if (m.index > last) parts.push({ type: "html", html: html.slice(last, m.index) });
    const tag = m[0];
    const get = (attr) => { const r = new RegExp(`${attr}="([^"]*)"`, 'i'); const x = r.exec(tag); return x ? x[1] : ""; };
    parts.push({ type: "download", fileUrl: get("data-file-url"), fileName: get("data-file-name"), fileSize: get("data-file-size"), credits: get("data-credits") });
    last = m.index + m[0].length;
  }
  if (last < html.length) parts.push({ type: "html", html: html.slice(last) });
  return parts;
}

function buildContentWithAds(html, inlineAds, unlockedFileUrls = new Set()) {
  const segments = splitOnDownloadBlocks(html || "");
  const sorted = [...inlineAds].sort((a, b) => a.position - b.position);
  const nodes = [];
  let paraCount = 0;
  let key = 0;

  for (const seg of segments) {
    if (seg.type === "download") {
      nodes.push(
        <DownloadBlock
          key={`dl-${key++}`}
          fileUrl={seg.fileUrl}
          fileName={seg.fileName}
          fileSize={seg.fileSize}
          credits={seg.credits}
          alreadyUnlocked={unlockedFileUrls.has(seg.fileUrl)}
        />
      );
      continue;
    }

    // For html segments, interleave inline ads between paragraphs
    if (!inlineAds.length) {
      nodes.push(<div key={key++} dangerouslySetInnerHTML={{ __html: seg.html }} />);
      continue;
    }

    let remaining = seg.html;
    while (remaining.length) {
      const idx = remaining.indexOf('</p>');
      if (idx === -1) {
        nodes.push(<div key={key++} dangerouslySetInnerHTML={{ __html: remaining }} />);
        break;
      }
      paraCount++;
      const chunk = remaining.slice(0, idx + 4);
      remaining = remaining.slice(idx + 4);
      nodes.push(<div key={key++} dangerouslySetInnerHTML={{ __html: chunk }} />);
      for (const ad of sorted) {
        if (ad.position === paraCount) {
          nodes.push(<InlineAd key={`ad-${ad.id}-${paraCount}`} ad={ad} />);
        }
      }
    }
  }

  // Append ads whose target paragraph was never reached
  for (const ad of sorted) {
    if (ad.position > paraCount) {
      nodes.push(<InlineAd key={`ad-${ad.id}-end`} ad={ad} />);
    }
  }

  return <div className="blog-content-body">{nodes}</div>;
}

export default function DynamicBlog() {
  const { blogId } = useParams(); // Expecting slug
  const { isLoggedIn } = useMemberAuth();
  const [blog, setBlog] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [commentsCount, setCommentsCount] = useState(0);
  const [relatedBlogs, setRelatedBlogs] = useState([]);
  const [suggestedArticles, setSuggestedArticles] = useState([]);
  const [premiumLocked, setPremiumLocked] = useState(false);
  const [sidebarAd, setSidebarAd] = useState({
    active: false,
    image: "",
    link: "",
  });
  const [inlineAds, setInlineAds] = useState([]);
  const [stripAds, setStripAds] = useState([]);
  const [unlockedFileUrls, setUnlockedFileUrls] = useState(new Set());

  const location = useLocation();
  const navigate = useNavigate();

  const isLearningPath = location.pathname.split("/").filter(Boolean)[0] === "learning";

  // Check for Virtual Blog (API) + Track Views
  useEffect(() => {
    if (!blogId) return;

    // Generate or retrieve visitor_token from localStorage
    let visitorToken = localStorage.getItem("visitor_token");
    if (!visitorToken) {
      visitorToken =
        "visitor_" + Math.random().toString(36).substring(2, 11) + Date.now();
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

        // Learning articles use module slugs in the URL (e.g. /learning/security-fundamentals/slug)
        // while their DB category is also the module slug — skip redirect for these.
        const isLearningPath = urlCategory === "learning";

        if (postData.category && urlCategory !== "blogs" && !isLearningPath) {
          const canonicalCategory = postData.category
            .toLowerCase()
            .replace(/\s+/g, "-");
          const currentCategory = urlCategory.toLowerCase();

          if (canonicalCategory !== currentCategory) {
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
            import("../services/api").then(({ getPostsByIds }) => {
              getPostsByIds(relatedIds).then(res => {
                setRelatedBlogs(Array.isArray(res.data) ? res.data : []);
              }).catch(err => console.error("Error fetching related blogs", err));
            });
          }
        }
      })
      .catch((err) => {
        console.error("Error loading blog details from API", err);
        setError("Blog not found");
        setBlog(null);
        setLoading(false);
      });

    // Fetch suggested articles
    getSuggestedArticles(blogId)
      .then((res) => setSuggestedArticles(Array.isArray(res.data) ? res.data : []))
      .catch(() => {});

    // Fetch sidebar ad
    getAdsByZone("sidebar")
      .then((res) => {
        const data = res.data;
        if (data && data.active) {
          setSidebarAd(data);
        }
      })
      .catch(() => {});

    // Fetch in-article & strip ads
    getBlogAdsForSlug(blogId)
      .then((res) => {
        const ads = res.data?.ads || [];
        setInlineAds(ads.filter(a => a.ad_type === "inline"));
        setStripAds(ads.filter(a => a.ad_type === "strip"));
      })
      .catch(() => {});

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

    // Fetch files this member has already unlocked so DownloadBlocks can show
    // "Already unlocked / Download again" instead of the purchase flow.
    if (isLoggedIn) {
      getMyDownloads()
        .then((res) => {
          const urls = (res.data?.downloads || []).map((d) => d.file_url);
          setUnlockedFileUrls(new Set(urls));
        })
        .catch(() => {});
    } else {
      setUnlockedFileUrls(new Set());
    }
  }, [blogId, location.pathname, navigate, isLoggedIn]);

  // Remove SSR placeholder only when the article loads successfully.
  // On error, leave SSR content visible so Google (and users) always see the
  // article rather than a 404 if the client-side API call fails.
  useEffect(() => {
    if (!loading && blog) {
      window.__removeSsrContent?.();
    }
  }, [loading, blog]);

  const handleCommentAdded = () => {
    setCommentsCount((prevCount) => prevCount + 1);
  };

  // RENDER LOADING
  if (loading) {
    return (
      <div className="blog-post-wrapper">
        <div className="container">
          <div className="skel-article-container">
            <div className="skel-article-main">
              <div className="skel-block skel-article-image" />
              <div className="skel-block skel-article-title" />
              <div className="skel-block skel-article-meta" />
              <div className="skel-block skel-article-para" />
              <div className="skel-block skel-article-para" />
              <div className="skel-block skel-article-para w-80" />
              <div className="skel-block skel-article-para" />
              <div className="skel-block skel-article-para w-60" />
            </div>
            <div className="skel-article-sidebar">
              {/* Search widget skeleton */}
              <div className="skel-block" style={{ height: 44, borderRadius: 8, marginBottom: 32 }} />
              {/* Latest Posts widget title */}
              <div className="skel-block" style={{ height: 16, width: "55%", marginBottom: 20, borderRadius: 6 }} />
              {/* Latest Posts card skeletons */}
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} style={{ display: "flex", gap: 12, paddingBottom: 14, marginBottom: 14, borderBottom: i < 3 ? "1px solid #f1f5f9" : "none" }}>
                  <div className="skel-block" style={{ width: 64, height: 52, borderRadius: 8, flexShrink: 0 }} />
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
                    <div className="skel-block" style={{ height: 10, width: "45%", borderRadius: 4 }} />
                    <div className="skel-block" style={{ height: 12, width: "90%", borderRadius: 4 }} />
                    <div className="skel-block" style={{ height: 12, width: "70%", borderRadius: 4 }} />
                    <div className="skel-block" style={{ height: 10, width: "35%", borderRadius: 4 }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // RENDER ERROR
  if (error || !blog) {
    // SSR content is still in the DOM (API failed but SSR has the article) —
    // return null so the SSR article stays visible rather than showing 404.
    if (document.getElementById('ssr-blog-content')) {
      return null;
    }
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
          <>
            {buildContentWithAds(blog.content, inlineAds, unlockedFileUrls)}
            {stripAds.map(ad => <StripAd key={ad.id} ad={ad} />)}
          </>
        }
        rawContent={blog.content || ""}
        isPremium={!isLearningPath && Number(blog.is_premium) === 1}
        isPremiumLocked={!isLearningPath && premiumLocked}
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
        blogType={blog.type || null}
        sidebarAd={sidebarAd}
        relatedBlogs={relatedBlogs}
        suggestedArticles={suggestedArticles}
        badge_expert_reviewed={blog.badge_expert_reviewed}
        badge_sap_notes_verified={blog.badge_sap_notes_verified}
        badge_tested_s4hana={blog.badge_tested_s4hana}
        badge_field_validated={blog.badge_field_validated}
        difficulty_level={blog.difficulty_level || null}
        content_version={blog.content_version || null}
        preview_paragraphs={blog.paywall_preview ?? blog.preview_paragraphs ?? null}
        author_contributor_id={blog.author_contributor_id || null}
        dynamicRecentPosts={[]}
        viewCount={blog.view_count || 0}
        commentCount={commentsCount}
        onCommentAdded={handleCommentAdded}
        isExclusive={!isLearningPath && isExclusive}
        metaTitle={blog.meta_title}
        metaDescription={blog.meta_description}
        metaKeywords={blog.meta_keywords}
        isMembersOnly={!isLearningPath && isExclusive}
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
      <ScrollNudgeModal
        isFreeArticle={!isExclusive && !premiumLocked && Number(blog.is_premium) !== 1}
        isExclusiveArticle={isExclusive || premiumLocked || Number(blog.is_premium) === 1}
      />
    </>
  );
}
