<?php
require_once __DIR__ . '/../src/services/AppClock.php';

AppClock::configure();

function getAllowedOrigins(): array
{
    $rawOrigins = getenv('CORS_ALLOWED_ORIGINS') ?: 'http://localhost:8080,http://localhost:3000,http://127.0.0.1:8080,http://127.0.0.1:3000';
    return array_values(array_filter(array_map('trim', explode(',', $rawOrigins))));
}

function applyCorsHeaders(): void
{
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    $allowedOrigins = getAllowedOrigins();

    if (in_array('*', $allowedOrigins, true)) {
        header('Access-Control-Allow-Origin: *');
    } elseif ($origin !== '' && in_array($origin, $allowedOrigins, true)) {
        header('Access-Control-Allow-Origin: ' . $origin);
        header('Vary: Origin');
    }

    header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
    header('Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS');
}

applyCorsHeaders();
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$uri = trim($uri, '/');

switch ($uri) {
    case '':
    case 'health':
        http_response_code(200);
        echo json_encode([
            'status' => 'ok',
            'service' => 'uktc-tessis-backend',
        ]);
        break;
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
