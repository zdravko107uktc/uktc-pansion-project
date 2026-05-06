<?php

require_once __DIR__ . '/../config/jwt.php';

function resolveAuthorizationHeader(): ?string
{
    $headerCandidates = [
        $_SERVER['HTTP_AUTHORIZATION'] ?? null,
        $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? null,
        $_SERVER['Authorization'] ?? null,
        $_SERVER['authorization'] ?? null,
    ];

    if (function_exists('getallheaders')) {
        $headers = getallheaders();
        $headerCandidates[] = $headers['Authorization'] ?? null;
        $headerCandidates[] = $headers['authorization'] ?? null;
    }

    foreach ($headerCandidates as $candidate) {
        if (is_string($candidate) && trim($candidate) !== '') {
            return trim($candidate);
        }
    }

    return null;
}

function extractBearerToken(?string $authorizationHeader): ?string
{
    if (!$authorizationHeader) {
        return null;
    }

    if (preg_match('/^\s*Bearer\s+(.+)\s*$/i', $authorizationHeader, $matches) !== 1) {
        return null;
    }

    $token = trim($matches[1]);
    return $token !== '' ? $token : null;
}

function authenticate()
{
    $authorizationHeader = resolveAuthorizationHeader();
    $token = extractBearerToken($authorizationHeader);

    if (!$token) {
        http_response_code(401);
        echo json_encode(["message" => "Липсва валиден Authorization Bearer хедър."]);
        exit;
    }

    $decoded = JwtHandler::verifyToken($token);
    if ($decoded && isset($decoded->sub)) {
        return $decoded->sub;
    }

    http_response_code(401);
    echo json_encode(["message" => "Невалиден или изтекъл токен."]);
    exit;
}
