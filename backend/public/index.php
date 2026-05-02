<?php
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$uri = trim($uri, '/');

switch ($uri) {
    case 'auth':
        require_once __DIR__ . '/../src/routes/auth.php';
        break;
    case 'user':
        require_once __DIR__ . '/../src/routes/user.php';
        break;
    default:
        http_response_code(404);
        echo json_encode(['message' => 'Route not found']);
}
