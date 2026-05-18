<?php
/**
 * api/utils.php - Common utility functions for SAP Security Expert
 */

/**
 * Robustly deletes an image from the filesystem, handling legacy and new paths.
 * 
 * @param string $imagePath The relative path stored in DB (e.g. /uploads/blogs/img.jpg or /assets/img.jpg)
 * @return bool True if deleted, false otherwise
 */
function deleteImage($imagePath)
{
    if (empty($imagePath)) {
        return false;
    }

    // Clean path (ensure it starts with / for consistency in concatenation)
    if ($imagePath[0] !== '/') {
        $imagePath = '/' . $imagePath;
    }

    $possiblePaths = [
        // 1. Direct relative to root
        __DIR__ . '/..' . $imagePath,

        // 2. Direct relative to public
        __DIR__ . '/../public' . $imagePath,

        // 3. Legacy assets handling: /assets/... -> /public/assets/...
        __DIR__ . '/../public/assets' . str_replace('/assets', '', $imagePath),

        // 4. Normalized uploads handling: /uploads/... -> /public/uploads/...
        __DIR__ . '/../public/uploads' . str_replace('/uploads', '', $imagePath),

        // 5. Old root-level assets
        __DIR__ . '/../assets' . str_replace('/assets', '', $imagePath)
    ];

    foreach ($possiblePaths as $path) {
        // Normalize slashes (windows/unix compatibility though primarily unix here)
        $normalizedPath = str_replace(['//', '\\\\'], ['/', '\\'], $path);

        if (file_exists($normalizedPath) && is_file($normalizedPath)) {
            if (unlink($normalizedPath)) {
                return true;
            }
        }
    }

    return false;
}

/**
 * Calculate SEO Score (0-100) based on meta tags and content
 */
function calculateSeoScore($blog)
{
    $score = 100;

    $metaTitle = trim($blog['meta_title'] ?? '');
    $metaTitleLength = mb_strlen($metaTitle);

    $metaDesc = trim($blog['meta_description'] ?? '');
    $metaDescLength = mb_strlen($metaDesc);

    $content = $blog['content'] ?? '';
    // Consistent with JS: strip tags, split by whitespace
    $textOnly = strip_tags($content);
    $words = preg_split('/\s+/', trim($textOnly), -1, PREG_SPLIT_NO_EMPTY);
    $wordCount = is_array($words) ? count($words) : 0;

    if ($metaTitleLength < 50 || $metaTitleLength > 70) {
        $score -= 15;
    }

    if ($metaDescLength < 140 || $metaDescLength > 165) {
        $score -= 15;
    }

    if ($wordCount < 600) {
        $score -= 20;
    }

    if (empty($blog['image'])) {
        $score -= 10;
    }

    // Bonuses from frontend AdminBlogs.jsx
    if ($metaDescLength >= 120) {
        $score += 5;
    }

    $keywords = trim($blog['meta_keywords'] ?? '');
    if (!empty($keywords)) {
        // frontend logic: data.meta_keywords.split(",").length >= 3
        if (count(explode(',', $keywords)) >= 3) {
            $score += 5;
        }
    }

    return max(0, min(100, $score));
}

/**
 * Checks Plagiarism using the external API. Returns an array ['score' => int|null, 'error' => string|null].
 * Fully deterministic: falls back to existing score on failure.
 * Includes logging to plagiarism_logs if $pdo is provided.
 */
function checkPlagiarismScore($text, $blogId = null, $pdo = null)
{
    if (empty(trim($text))) {
        return ['score' => 0, 'error' => null];
    }

    $token = getenv('PLAGIARISM_API_TOKEN');
    if (!$token) {
        return ['score' => -1, 'error' => 'API Token missing'];
    }

    $cleanText = strip_tags($text);
    $ch = curl_init('https://plagiarismcheck.org/api/v1/text');
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST => true,
        CURLOPT_TIMEOUT => 15,
        CURLOPT_CONNECTTIMEOUT => 5,
        CURLOPT_HTTPHEADER => ["X-API-TOKEN: $token"],
        CURLOPT_POSTFIELDS => http_build_query([
            'language' => 'en',
            'text' => $cleanText,
        ]),
    ]);

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    $errorMsg = null;
    if ($httpCode === 409) {
        $errorMsg = "API Credits Exhausted (409)";
    } elseif ($httpCode !== 200 && $httpCode !== 201) {
        $errorMsg = "API Error (Code: $httpCode)";
    }
    if ($response && ($httpCode === 200 || $httpCode === 201)) {
        $result = json_decode($response, true);
        $id = $result['data']['text']['id'] ?? null;

        if ($id) {
            // Polling Loop: Wait up to 15 seconds for the check to complete
            $maxRetries = 10;
            for ($i = 0; $i < $maxRetries; $i++) {
                sleep(1.5); // Wait between polls

                $ch = curl_init("https://plagiarismcheck.org/api/v1/text/$id");
                curl_setopt_array($ch, [
                    CURLOPT_RETURNTRANSFER => true,
                    CURLOPT_HTTPHEADER => ["X-API-TOKEN: $token"],
                    CURLOPT_TIMEOUT => 5,
                ]);
                $pollRes = curl_exec($ch);
                $pollCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
                curl_close($ch);

                if ($pollRes && $pollCode === 200) {
                    $pollResult = json_decode($pollRes, true);
                    $state = $pollResult['data']['text']['state'] ?? 0;

                    if ($state === 5) { // STATE_CHECKED
                        // Retrieve the final report to get the similarity score
                        $chReport = curl_init("https://plagiarismcheck.org/api/v1/text/$id/report");
                        curl_setopt_array($chReport, [
                            CURLOPT_RETURNTRANSFER => true,
                            CURLOPT_HTTPHEADER => ["X-API-TOKEN: $token"],
                            CURLOPT_TIMEOUT => 5,
                        ]);
                        $repRes = curl_exec($chReport);
                        curl_close($chReport);

                        if ($repRes) {
                            $repData = json_decode($repRes, true);
                            $percent = $repData['data']['report']['percent'] ?? null;
                            if ($percent !== null) {
                                $score = max(0, 100 - (int) $percent);
                                if ($pdo && $blogId) {
                                    $pdo->prepare("INSERT INTO plagiarism_logs (blog_id, score, raw_response) VALUES (?, ?, ?)")
                                        ->execute([$blogId, $score, $repRes]);
                                }
                                return ['score' => $score, 'error' => null];
                            }
                        }
                        break; // Exit if checked but report failed
                    }
                }
            }
        }
    }

    if ($pdo && $blogId) {
        $pdo->prepare("INSERT INTO plagiarism_logs (blog_id, score, raw_response) VALUES (?, ?, ?)")
            ->execute([$blogId, -1, $response ?: 'No response']);
    }

    return ['score' => -1, 'error' => $errorMsg ?: 'Connection failure'];
}

/**
 * Dynamically determines the site URL based on the current request.
 * Falls back to getenv('SITE_URL') if not in a web context.
 */
function getSiteUrl()
{
    if (isset($_SERVER['HTTP_HOST'])) {
        $protocol = (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on') ? "https" : "http";
        return "$protocol://" . $_SERVER['HTTP_HOST'];
    }
    return getenv('SITE_URL') ?: 'https://sapsecurityexpert.com';
}
?>