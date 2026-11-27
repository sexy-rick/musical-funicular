<?php
// Website -> Cloudflare bridge. The public catalog contains only display metadata.
function catalogRequest(string $path): array {
    $file = __DIR__ . '/../config.php';
    if (!is_file($file)) throw new RuntimeException('Configuration missing');
    $cfg = require $file;
    $url = is_array($cfg) ? ($cfg['catalog_url'] ?? '') : '';
    if (!is_string($url) || !preg_match('/^https:\/\/[a-z0-9-]+\.[a-z0-9-]+\.workers\.dev$/iD', $url)) throw new RuntimeException('Catalog URL not configured');
    if (!function_exists('curl_init')) throw new RuntimeException('cURL unavailable');
    $ch = curl_init($url . $path);
    curl_setopt_array($ch, [CURLOPT_RETURNTRANSFER => true, CURLOPT_CONNECTTIMEOUT => 4, CURLOPT_TIMEOUT => 8, CURLOPT_FOLLOWLOCATION => false, CURLOPT_PROTOCOLS => CURLPROTO_HTTPS, CURLOPT_HTTPHEADER => ['Accept: application/json']]);
    $body = curl_exec($ch); $status = curl_getinfo($ch, CURLINFO_HTTP_CODE); curl_close($ch);
    if ($status === 404) return ['ok' => false, 'not_found' => true];
    if ($status !== 200 || !is_string($body) || strlen($body) > 262144) throw new RuntimeException('Catalog unavailable');
    $data = json_decode($body, true);
    if (!is_array($data) || ($data['ok'] ?? false) !== true) throw new RuntimeException('Invalid catalog response');
    return $data;
}
function catalogList(string $category, string $search, int $page): array {
    return catalogRequest('/addons?' . http_build_query(['cat' => $category, 'q' => $search, 'page' => $page]));
}
function catalogGet(string $id): ?array {
    $result = catalogRequest('/addons/' . rawurlencode($id));
    if (!empty($result['not_found'])) return null;
    if (!isset($result['item']) || !is_array($result['item'])) throw new RuntimeException('Invalid catalog item');
    return $result['item'];
}
