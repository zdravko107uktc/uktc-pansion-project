<?php
require_once __DIR__ . '/../models/User.php';
require_once __DIR__ . '/../middleware/jwtCheckToken.php';

$database = new Database();
$db = $database->getConnection();
$user = new User($db);

$user_id = authenticate();

$userData = $user->ensureSystemRoleById((int) $user_id);
unset($userData['password_hash']);

echo json_encode(["user" => $userData]);
