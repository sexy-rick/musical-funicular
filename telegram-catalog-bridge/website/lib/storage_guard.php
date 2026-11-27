<?php
// Hard core limit at 9.4 GiB (see tasks/plan.md §11.1)
// ponytail: 9.4 GiB leaves 0.6 GiB buffer for Cloudflare rounding; revisit if R2 free tier changes
const STORAGE_LIMIT_BYTES = 10092649186; // 9.4 * 1024^3

function storageUsedBytes(PDO $pdo): int {
    $stmt = $pdo->query('SELECT COALESCE(SUM(file_size), 0) AS total FROM addons');
    $row = $stmt->fetch();
    return (int)($row['total'] ?? 0);
}

// Returns true if new file fits, false if it would exceed limit.
// For updates (same uuid), pass oldSize so net change is checked.
function storageAllows(PDO $pdo, int $newSize, int $oldSize = 0): bool {
    try {
        $used = storageUsedBytes($pdo);
    } catch (Throwable $ex) {
        // Fail-closed: if we can't check, block the upload
        error_log('storage guard check failed: ' . $ex->getMessage());
        return false;
    }
    $projected = $used - $oldSize + $newSize;
    return $projected <= STORAGE_LIMIT_BYTES;
}
