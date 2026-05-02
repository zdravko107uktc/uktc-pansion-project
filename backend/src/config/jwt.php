<?php
require_once __DIR__ . '/../../vendor/autoload.php';

use Firebase\JWT\JWT;
use Firebase\JWT\Key;

class JwtHandler
{
    private static $algorithm = "HS256";

    private static function secret() {
        return getenv('JWT_SECRET') ?: 'f2d4c95ec095862af68ae607be05ae45556aa2ae2b87a9306185cac71295bae2';
    }

    public static function generateToken($user_id)
    {
        $payload = [
            "iss" => "uktc-tessis",
            "iat" => time(),
            "exp" => time() + 14400,
            "sub" => $user_id
        ];

        return JWT::encode($payload, self::secret(), self::$algorithm);
    }

    public static function verifyToken($token)
    {
        try {
            return JWT::decode($token, new Key(self::secret(), self::$algorithm));
        } catch (Exception $e) {
            return null;
        }
    }
}
