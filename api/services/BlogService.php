<?php
/**
 * api/services/BlogService.php - Handles Blog Database Operations
 */
require_once 'CacheService.php';

class BlogService {
    private $pdo;
    private $cache;

    public function __construct($pdo) {
        $this->pdo = $pdo;
        $this->cache = new CacheService();
    }

    private function invalidateHomepage() {
        $this->cache->invalidate('homepage_data_public');
    }

    public function getBlogs($currentUserId, $role, $currentDateTime, $authorOnly = false) {
        $isLoggedIn = !empty($currentUserId);
        $isAdmin = ($role === 'admin');
        $isContributor = ($role === 'contributor');

        $sql = "SELECT b.*, 
                       b.view_count,
                       (SELECT COUNT(*) FROM comments c_count WHERE c_count.post_id = b.slug AND c_count.status = 'approved') as comment_count,
                        u.id as author_id, u.username as author_username, u.role as author_role,
                        CASE 
                            WHEN u.role = 'admin' OR b.author_id IS NULL OR b.author_id = 1 THEN 'Raghu Boddu'
                            ELSE COALESCE(c.full_name, u.full_name, u.username, b.author)
                        END as author_name,
                        CASE 
                            WHEN u.role = 'admin' OR b.author_id IS NULL OR b.author_id = 1 THEN '/assets/raghu_boddu.png'
                            ELSE COALESCE(c.image, u.profile_image)
                        END as author_image,
                        COALESCE(c.short_bio, u.bio) as author_bio,
                        COALESCE(c.designation, u.designation) as author_designation,
                        COALESCE(c.linkedin, u.linkedin) as author_linkedin,
                        COALESCE(c.twitter_handle, u.twitter_handle) as author_twitter,
                        COALESCE(c.personal_website, u.personal_website) as author_website
                 FROM blogs b
                 LEFT JOIN users u ON b.author_id = u.id
                 LEFT JOIN contributors c ON u.contributor_id = c.id";
        $params = [];

        if ($isContributor && $authorOnly) {
            // Management view: strictly filter by author
            $sql .= " WHERE b.author_id = ?";
            $params[] = $currentUserId;
        } elseif (!$isLoggedIn || ($isContributor && !$authorOnly)) {
            // Public view (Guest or Contributor-visitor): show only approved/published, never drafts
            $sql .= " WHERE b.status IN ('approved', 'published') AND b.status != 'draft' AND b.date <= ?";
            $params[] = $currentDateTime ?: gmdate('Y-m-d H:i:s');
        } elseif ($isAdmin) {
            // Admin: see everything, no filter added
        }

        $sql .= " ORDER BY b.created_at DESC";
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($params);
        $blogs = $stmt->fetchAll(PDO::FETCH_ASSOC);

        foreach ($blogs as &$b) {
            // Defensive author checks - fallback if no user/contributor found
            if (!$b['author_name']) {
                $b['author_name'] = "Guest Author";
                $b['author_image'] = "https://placehold.co/100x100?text=Author";
            }
        }

        return $blogs;
    }

    public function getBlog($idOrSlug, $currentUserId, $role, $currentDateTime, $authorOnly = false) {
        $isLoggedIn = !empty($currentUserId);
        $isAdmin = ($role === 'admin');
        $isContributor = ($role === 'contributor');

        $sql = "SELECT b.*, 
                       b.view_count,
                       (SELECT COUNT(*) FROM comments c_count WHERE c_count.post_id = b.slug AND c_count.status = 'approved') as comment_count,
                       u.id as author_id, u.username as author_username, u.role as author_role, u.email as author_email,
                       CASE 
                           WHEN u.role = 'admin' OR b.author_id IS NULL OR b.author_id = 1 THEN 'Raghu Boddu'
                           ELSE COALESCE(c.full_name, u.full_name, u.username, b.author)
                       END as author_name,
                       CASE 
                           WHEN u.role = 'admin' OR b.author_id IS NULL OR b.author_id = 1 THEN '/assets/raghu_boddu.png'
                           ELSE COALESCE(c.image, u.profile_image)
                       END as author_image,
                       COALESCE(c.short_bio, u.bio) as author_bio,
                       COALESCE(c.designation, u.designation) as author_designation,
                       COALESCE(c.linkedin, u.linkedin) as author_linkedin,
                       COALESCE(c.twitter_handle, u.twitter_handle) as author_twitter,
                       COALESCE(c.personal_website, u.personal_website) as author_website
                FROM blogs b
                LEFT JOIN users u ON b.author_id = u.id
                LEFT JOIN contributors c ON u.contributor_id = c.id
                WHERE (b.slug = ? OR b.id = ?)";
        $params = [$idOrSlug, $idOrSlug];

        if ($isContributor && $authorOnly) {
            // Management/Preview: strictly filter by author
            $sql .= " AND b.author_id = ?";
            $params[] = $currentUserId;
        } elseif (!$isLoggedIn || ($isContributor && !$authorOnly)) {
            // Public View: Only approved/published blogs
            $sql .= " AND b.status IN ('approved', 'published')";
        } elseif ($isAdmin) {
            // Admin: no extra filters
        }

        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($params);
        $blog = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($blog) {
            if (!$blog['author_name']) {
                $blog['author_name'] = "Guest Author";
                $blog['author_image'] = "https://placehold.co/100x100?text=Author";
            }

            // ── Exclusivity Enforcement ──────────────────────────────────────────
            // If post is members-only, check for member session or admin/contributor status.
            $isMembersOnly = (int)($blog['is_members_only'] ?? 0);
            $isMember = !empty($_SESSION['member_logged_in']);
            $hasAdminAccess = !empty($currentUserId); // In this context, currentUserId is set if admin/contributor logged in

            if ($isMembersOnly && !$isMember && !$hasAdminAccess) {
                // 1-Para Teaser Logic: Extract first <p> or first 400 chars
                $teaser = '';
                if (preg_match('/<p>(.*?)<\/p>/is', $blog['content'], $matches)) {
                    $teaser = $matches[0]; // Include the tags
                } else {
                    $teaser = '<p>' . substr(strip_tags($blog['content']), 0, 400) . '...</p>';
                }
                $blog['content'] = $teaser;

                // Strict Redaction of sensitive fields
                $blog['faqs'] = null;
                $blog['cta_title'] = "Professional Content Locked";
                $blog['cta_description'] = "Join our expert community to access premium SAP security insights, technical guides, and member-only analysis.";
                $blog['cta_button_text'] = "Join Members Area";
                $blog['cta_button_link'] = "/member/signup";

                // Redact Author Everything (Protect the expert's identity for guests)
                $blog['author'] = "SAP Security Expert";
                $blog['author_name'] = "SAP Security Expert";
                $blog['author_bio'] = null;
                $blog['author_image'] = null;
                $blog['author_designation'] = null;
                $blog['author_linkedin'] = null;
                $blog['author_twitter'] = null;
                $blog['author_website'] = null;
            }
        }

        return $blog;
    }

    public function saveBlog($data, $currentUserId, $role, $currentDateTime) {
        $id = !empty($data['id']) ? $data['id'] : null;
        $isContributor = ($role === 'contributor');
        $isAdmin = ($role === 'admin');

        // Initial Author Identity (Defaults for New Blogs)
        $author_id = (int)$currentUserId;
        $authorName = $isAdmin ? "Raghu Boddu" : ($_SESSION['admin_username'] ?? 'Contributor');

        // Admin can override author by specifying an author_id in the payload
        if ($isAdmin && !empty($data['author_id']) && (int)$data['author_id'] !== (int)$currentUserId) {
            $overrideId = (int)$data['author_id'];
            // Resolve display name from users + contributors
            $stmt = $this->pdo->prepare(
                "SELECT COALESCE(c.full_name, u.full_name, u.username) as display_name
                 FROM users u
                 LEFT JOIN contributors c ON u.contributor_id = c.id
                 WHERE u.id = ? AND u.is_active = 1"
            );
            $stmt->execute([$overrideId]);
            $row = $stmt->fetch();
            if ($row) {
                $author_id = $overrideId;
                $authorName = $row['display_name'];
            }
        }

        // Fields
        $title = $data['title'] ?? '';
        $slug = $data['slug'] ?? '';
        $excerpt = $data['excerpt'] ?? '';
        $content = $data['content'] ?? '';
        $date = $data['date'] ?? gmdate('Y-m-d');
        $image = $data['image'] ?? '';
        $category = $data['category'] ?? '';
        $tags = $data['tags'] ?? '';
        $meta_title = $data['meta_title'] ?? '';
        $meta_description = $data['meta_description'] ?? '';
        $meta_keywords = $data['meta_keywords'] ?? '';
        $faqs = $data['faqs'] ?? [];
        $cta_title = $data['cta_title'] ?? null;
        $cta_description = $data['cta_description'] ?? null;
        $cta_button_text = $data['cta_button_text'] ?? null;
        $cta_button_link = $data['cta_button_link'] ?? null;
        $is_members_only = isset($data['is_members_only']) ? (int)$data['is_members_only'] : 0;
        $requestedStatus = $data['status'] ?? null;

        // Auto-generate slug if title is present but slug is missing
        if (empty($slug) && !empty($title)) {
            $slug = strtolower(trim(preg_replace('/[^A-Za-z0-9-]+/', '-', $title)));
            $slug = trim($slug, '-');
        }

        // Validation
        if (empty($category) || $category === 'Select Category' || $category === 'none') {
            return ['status' => 'error', 'message' => 'Please select a valid blog category'];
        }
 
        // Calculate SEO Score
        require_once __DIR__ . '/../utils.php';
        $seoScore = calculateSeoScore($data);

        $existingPlagScore = 0;

        if ($id) {
            // Update Logic
            $stmt = $this->pdo->prepare("SELECT author_id, author, submission_status, status, plagiarism_score, publish_date, slug FROM blogs WHERE id = ?");
            $stmt->execute([$id]);
            $existing = $stmt->fetch();

            $existingPlagScore = $existing['plagiarism_score'] ?? 0;
            $oldSlug = $existing['slug'] ?? '';
            
            // Cascading Slug Change: If slug changed, update linked data
            if (!empty($oldSlug) && !empty($slug) && $oldSlug !== $slug) {
                $this->pdo->prepare("UPDATE comments SET post_id = ? WHERE post_id = ?")->execute([$slug, $oldSlug]);
                $this->pdo->prepare("UPDATE post_views SET post_id = ? WHERE post_id = ?")->execute([$slug, $oldSlug]);
            }
            // Default: keep existing author
            $author_id = (int)$existing['author_id'];
            $authorName = $existing['author'];

            // Admin can re-assign an author when updating
            if ($isAdmin && !empty($data['author_id'])) {
                $overrideId = (int)$data['author_id'];
                $stmtA = $this->pdo->prepare(
                    "SELECT COALESCE(c.full_name, u.full_name, u.username) as display_name
                     FROM users u
                     LEFT JOIN contributors c ON u.contributor_id = c.id
                     WHERE u.id = ? AND u.is_active = 1"
                );
                $stmtA->execute([$overrideId]);
                $rowA = $stmtA->fetch();
                if ($rowA) {
                    $author_id = $overrideId;
                    $authorName = $rowA['display_name'];
                }
            }

            if (!$isAdmin && $existing['author_id'] != $currentUserId) {
                return ['status' => 'error', 'message' => 'Unauthorized'];
            }

            // Edit Preservation: If blog is already approved/published AND NOT ADMIN, use draft columns
            if (in_array($existing['status'], ['approved', 'published']) && !$isAdmin) {
                $sql = "UPDATE blogs SET 
                        draft_title = ?, draft_excerpt = ?, draft_content = ?, 
                        draft_meta_title = ?, draft_meta_description = ?, draft_meta_keywords = ?,
                        draft_image = ?, draft_category = ?, draft_faqs = ?,
                        draft_cta_title = ?, draft_cta_description = ?, 
                        draft_cta_button_text = ?, draft_cta_button_link = ?,
                        seo_score = ?, plagiarism_score = ?,
                        submission_status = 'edited', updated_at = CURRENT_TIMESTAMP
                        WHERE id = ?";
                $plagRes = checkPlagiarismScore($content, $id, $this->pdo);
                $plagScore = $plagRes['score'];
                // If failure, keep existing score. If success, use new score.
                $finalPlag = ($plagScore === -1) ? $existingPlagScore : $plagScore;
                
                $stmt = $this->pdo->prepare($sql);
                $stmt->execute([
                    $title, $excerpt, $content,
                    $meta_title, $meta_description, $meta_keywords,
                    $image, $category, json_encode($faqs),
                    $cta_title, $cta_description, $cta_button_text, $cta_button_link,
                    $seoScore, $finalPlag, $id
                ]);
                $this->invalidateHomepage();

                // Notify Admin
                try {
                    require_once __DIR__ . '/NotificationService.php';
                    $ns = new NotificationService();
                    $ns->notifyBlogSubmitted($title . " (Update)", $authorName);
                } catch (Exception $e) {
                    error_log("Notification Error: " . $e->getMessage());
                }
                $msg = 'Changes saved for review. Live version remains unchanged.';
                if ($plagScore === -1) $msg .= ' (Warning: Plagiarism check failed)';
                return ['status' => 'success', 'message' => $msg, 'plagiarism_score' => $finalPlag];
            } else {
                // Traditional Update (for drafts or initial admin creation/approval)
                $targetStatus = $isAdmin ? ($requestedStatus ?: 'approved') : 'draft';
                $subStatus = $isAdmin ? $targetStatus : 'submitted';

                // First Published Date Logic
                $publishDateUpdate = "";
                $publishDateParam = [];
                if (in_array($targetStatus, ['approved', 'published'])) {
                    if (empty($existing['publish_date'])) {
                        $publishDateUpdate = "publish_date = CURRENT_TIMESTAMP, date = COALESCE(NULLIF(?, ''), CURRENT_DATE), ";
                        $publishDateParam[] = $date;
                    }
                }

                $sql = "UPDATE blogs SET 
                        title=?, slug=?, excerpt=?, content=?, date=COALESCE(NULLIF(?, ''), CURRENT_DATE), image=?, category=?, tags=?, faqs=?,
                        cta_title=?, cta_description=?, cta_button_text=?, cta_button_link=?,
                        meta_title=?, meta_description=?, meta_keywords=?,
                        status=?, submission_status=?, rejection_feedback = NULL,
                        author_id = ?, author = ?, seo_score = ?, plagiarism_score = ?, plagiarism_status = 'completed',
                        is_members_only = ?, related_blogs = ?, updated_at = CURRENT_TIMESTAMP, 
                        $publishDateUpdate
                        draft_title=NULL, draft_content=NULL, draft_excerpt=NULL, draft_image=NULL, 
                        draft_category=NULL, draft_faqs=NULL, draft_meta_title=NULL, draft_meta_description=NULL,
                        draft_meta_keywords=NULL, draft_cta_title=NULL, draft_cta_description=NULL,
                        draft_cta_button_text=NULL, draft_cta_button_link=NULL
                        WHERE id=?";
                $plagRes = checkPlagiarismScore($content, $id, $this->pdo);
                $plagScore = $plagRes['score'];
                $finalPlag = ($plagScore === -1) ? $existingPlagScore : $plagScore;

                $relatedBlogs = $data['related_blogs'] ?? null;
                if (is_array($relatedBlogs)) $relatedBlogs = json_encode($relatedBlogs);

                $params = array_merge([
                    $title, $slug, $excerpt, $content, $date, $image, $category, $tags, json_encode($faqs),
                    $cta_title, $cta_description, $cta_button_text, $cta_button_link,
                    $meta_title, $meta_description, $meta_keywords,
                    $targetStatus, $subStatus,
                    $author_id, $authorName, $seoScore, $finalPlag, $is_members_only, $relatedBlogs
                ], $publishDateParam, [$id]);

                $this->pdo->prepare($sql)->execute($params);
                $this->invalidateHomepage();



                $msg = 'Blog updated';
                if ($plagScore === -1) $msg .= ' (Warning: Plagiarism check failed)';
                return ['status' => 'success', 'message' => $msg, 'plagiarism_score' => $finalPlag];
            }
        } else {
            // Insert Logic
            $id = !empty($data['id']) ? $data['id'] : uniqid('blog_');
            $targetStatus = $isAdmin ? ($requestedStatus ?: 'approved') : 'draft';
            $subStatus = $isAdmin ? $targetStatus : 'submitted';
            
            $publishDateVal = null;
            if (in_array($targetStatus, ['approved', 'published'])) {
                $publishDateVal = gmdate('Y-m-d H:i:s');
            }

            $sql = "INSERT INTO blogs 
                    (id, title, slug, excerpt, content, author, author_id, date, image, category, tags, faqs,
                     cta_title, cta_description, cta_button_text, cta_button_link,
                     meta_title, meta_description, meta_keywords, status, submission_status, seo_score, plagiarism_score, plagiarism_status, is_members_only, related_blogs, publish_date, created_at, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, COALESCE(NULLIF(?, ''), CURRENT_DATE), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'completed', ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)";
            $plagRes = checkPlagiarismScore($content, $id, $this->pdo);
            $plagScore = $plagRes['score'];
            $finalPlag = ($plagScore === -1) ? 0 : $plagScore; // New blog fallback is 0 (Not Checked)
            $relatedBlogsInsert = $data['related_blogs'] ?? null;
            if (is_array($relatedBlogsInsert)) $relatedBlogsInsert = json_encode($relatedBlogsInsert);

            $params = [
                $id, $title, $slug, $excerpt, $content, $authorName, $author_id, $date, $image, $category, $tags, json_encode($faqs),
                $cta_title, $cta_description, $cta_button_text, $cta_button_link,
                $meta_title, $meta_description, $meta_keywords, $targetStatus, $subStatus, $seoScore, $finalPlag, $is_members_only, $relatedBlogsInsert,
                $publishDateVal
            ];
            $this->pdo->prepare($sql)->execute($params);
            $this->invalidateHomepage();
            
            // Notify Admin if it's a contributor submission
            if (!$isAdmin) {
                try {
                    require_once __DIR__ . '/NotificationService.php';
                    $ns = new NotificationService();
                    $ns->notifyBlogSubmitted($title, $authorName);
                } catch (Exception $e) {
                    error_log("Notification Error: " . $e->getMessage());
                }
            }



            $msg = 'Blog created';
            if ($plagScore === -1) $msg .= ' (Warning: Plagiarism check failed)';
            return ['status' => 'success', 'message' => $msg, 'plagiarism_score' => $finalPlag];
        }
    }

    public function deleteBlog($id, $currentUserId, $role) {
        // Authorization & Data Fetch
        $stmt = $this->pdo->prepare("SELECT author_id, image FROM blogs WHERE id = ? OR slug = ?");
        $stmt->execute([$id, $id]);
        $blog = $stmt->fetch();

        if (!$blog) return false;
        if ($role !== 'admin' && $blog['author_id'] != $currentUserId) return false;

        // Cleanup Image
        if (!empty($blog['image'])) {
            deleteImage($blog['image']);
        }

        $stmt = $this->pdo->prepare("DELETE FROM blogs WHERE id = ? OR slug = ?");
        $res = $stmt->execute([$id, $id]);
        $this->invalidateHomepage();
        return $res;
    }
}
?>
