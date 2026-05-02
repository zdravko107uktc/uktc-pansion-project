<?php
require_once __DIR__ . '/../config/jwt.php';

function authenticate() {
    $headers = getallheaders();
    $authHeader = $headers['Authorization'] ?? $headers['authorization'] ?? null;

    if ($authHeader) {
        $token = str_replace("Bearer ", "", $authHeader);
        $decoded = JwtHandler::verifyToken($token);

        if ($decoded) {
            return $decoded->sub;
        }

        http_response_code(401);
        echo json_encode(["message" => "Невалиден или изтекъл токен."]);
        exit;
    }

    http_response_code(401);
    echo json_encode(["message" => "Липсва Authorization хедър."]);
    exit;
}
