<?php
require_once __DIR__ . '/../models/User.php';
require_once __DIR__ . '/../config/jwt.php';
require_once __DIR__ . '/../middleware/jwtCheckToken.php';

$database = new Database();
$db = $database->getConnection();
$user = new User($db);

$requestMethod = $_SERVER["REQUEST_METHOD"];
$action = $_GET['action'] ?? '';

// ── POST ──────────────────────────────────────────────────────────────────────
if ($requestMethod === "POST") {
    $data = json_decode(file_get_contents("php://input"));

    // REGISTER
    if ($action === 'register') {
        if (!empty($data->name) && !empty($data->email) && !empty($data->password) && !empty($data->role)) {
            $dormitory = !empty($data->dormitory) ? $data->dormitory : null;
            if ($user->createUser($data->name, $data->email, $data->password, $data->role, $dormitory)) {
                $userData = $user->getUserByEmail($data->email);
                $token = JwtHandler::generateToken($userData['id']);
                echo json_encode(["message" => "Регистрацията е успешна.", "token" => $token]);
            } else {
                http_response_code(400);
                echo json_encode(["message" => "Грешка при регистрация."]);
            }
        } else {
            http_response_code(400);
            echo json_encode(["message" => "Всички полета са задължителни."]);
        }
        exit;
    }

    // LOGIN
    if ($action === 'login') {
        if (!empty($data->email) && !empty($data->password)) {
            $userData = $user->getUserByEmail($data->email);
            if ($userData && password_verify($data->password, $userData['password_hash'])) {
                $token = JwtHandler::generateToken($userData['id']);
                echo json_encode(["message" => "Входът е успешен.", "token" => $token]);
            } else {
                http_response_code(401);
                echo json_encode(["message" => "Грешен email или парола."]);
            }
        } else {
            http_response_code(400);
            echo json_encode(["message" => "Всички полета са задължителни."]);
        }
        exit;
    }

    // UPDATE STATUS
    if ($action === 'update_status') {
        if (!empty($data->userId) && !empty($data->status)) {

            if ($user->hasPendingRequest($data->userId)) {
                echo json_encode(["message" => "Имате чакаща заявка за отписване. Изчакайте одобрение от дежурния възпитател."]);
                exit;
            }

            $lastStatus = $user->getLastStatus($data->userId);

            if ($lastStatus === 'enrolled' && $data->status === 'enrolled') {
                echo json_encode(["message" => "Вече сте записани."]);
                exit;
            }
            if ($lastStatus === 'unenrolled' && $data->status === 'unenrolled') {
                echo json_encode(["message" => "Вече сте отписани."]);
                exit;
            }

            $location  = $data->status === 'unenrolled' ? trim($data->location  ?? '') : null;
            $signature = $data->status === 'unenrolled' ? ($data->signature ?? null) : null;

            if ($data->status === 'unenrolled' && empty($location)) {
                http_response_code(400);
                echo json_encode(["message" => "Моля, въведете локация при отписване."]);
                exit;
            }

            if ($user->updateStudentStatus($data->userId, $data->status, $location, $signature)) {
                if ($data->status === 'unenrolled') {
                    echo json_encode(["message" => "Заявката е изпратена. Изчаква одобрение от дежурния възпитател."]);
                } else {
                    echo json_encode(["message" => "Статусът е успешно актуализиран."]);
                }
            } else {
                http_response_code(500);
                echo json_encode(["message" => "Грешка при записване."]);
            }
        } else {
            http_response_code(400);
            echo json_encode(["message" => "Всички полета са задължителни."]);
        }
        exit;
    }

    // START SHIFT
    if ($action === 'start_shift') {
        $user_id = authenticate();
        $dormitory = $data->dormitory ?? null;
        if (!in_array($dormitory, ['1', '2'])) {
            http_response_code(400);
            echo json_encode(["message" => "Невалидно общежитие."]);
            exit;
        }
        if ($user->startShift($user_id, $dormitory)) {
            echo json_encode(["message" => "Смяната е започната.", "dormitory" => $dormitory]);
        } else {
            http_response_code(500);
            echo json_encode(["message" => "Грешка при стартиране на смяна."]);
        }
        exit;
    }

    // END SHIFT
    if ($action === 'end_shift') {
        $user_id = authenticate();
        if ($user->endShift($user_id)) {
            echo json_encode(["message" => "Смяната е приключена."]);
        } else {
            http_response_code(500);
            echo json_encode(["message" => "Грешка при приключване на смяна."]);
        }
        exit;
    }

    // APPROVE UNENROLLMENT
    if ($action === 'approve_unenrollment') {
        $user_id = authenticate();
        if (empty($data->statusId)) {
            http_response_code(400);
            echo json_encode(["message" => "Липсва statusId."]);
            exit;
        }
        if ($user->approveUnenrollment($data->statusId, $user_id)) {
            echo json_encode(["message" => "Отписването е одобрено."]);
        } else {
            http_response_code(500);
            echo json_encode(["message" => "Грешка при одобрение."]);
        }
        exit;
    }

    // REJECT UNENROLLMENT
    if ($action === 'reject_unenrollment') {
        $user_id = authenticate();
        if (empty($data->statusId)) {
            http_response_code(400);
            echo json_encode(["message" => "Липсва statusId."]);
            exit;
        }
        if ($user->rejectUnenrollment($data->statusId, $user_id)) {
            echo json_encode(["message" => "Отписването е отказано."]);
        } else {
            http_response_code(500);
            echo json_encode(["message" => "Грешка при отказване."]);
        }
        exit;
    }
}

// ── GET ───────────────────────────────────────────────────────────────────────

if ($requestMethod === "GET" && $action === 'get_week_records') {
    authenticate();

    $startOfWeek = date("Y-m-d 00:00:00", strtotime("monday this week"));
    $endOfWeek   = date("Y-m-d 23:59:59", strtotime("sunday this week"));

    $sql = "
        SELECT u.id, u.full_name, u.email, u.dormitory AS student_dormitory,
               ss.id AS status_id, ss.status, ss.timestamp, ss.location, ss.signature, ss.approval_status
        FROM student_status ss
        INNER JOIN (
            SELECT student_id, MAX(timestamp) AS latest_time
            FROM student_status
            WHERE timestamp BETWEEN :start AND :end
            GROUP BY student_id
        ) latest ON ss.student_id = latest.student_id AND ss.timestamp = latest.latest_time
        INNER JOIN users u ON u.id = ss.student_id
        ORDER BY ss.timestamp DESC
    ";

    $stmt = $db->prepare($sql);
    $stmt->bindParam(':start', $startOfWeek);
    $stmt->bindParam(':end', $endOfWeek);
    $stmt->execute();

    $results = $stmt->fetchAll(PDO::FETCH_ASSOC);
    echo json_encode($results, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

if ($requestMethod === "GET" && $action === 'get_my_history') {
    $user_id = authenticate();

    $stmt = $db->prepare(
        "SELECT status, location, signature, approval_status, approved_at, timestamp
         FROM student_status
         WHERE student_id = :id
         ORDER BY timestamp DESC
         LIMIT 10"
    );
    $stmt->bindParam(':id', $user_id);
    $stmt->execute();

    $results = $stmt->fetchAll(PDO::FETCH_ASSOC);
    echo json_encode($results, JSON_UNESCAPED_UNICODE);
    exit;
}

if ($requestMethod === "GET" && $action === 'get_pending_requests') {
    $user_id = authenticate();
    $counselorData = $user->getUserById($user_id);

    if (!$counselorData || !$counselorData['dormitory']) {
        echo json_encode([]);
        exit;
    }

    $results = $user->getPendingRequests($counselorData['dormitory']);
    echo json_encode($results, JSON_UNESCAPED_UNICODE);
    exit;
}

if ($requestMethod === "GET" && $action === 'get_all_pending') {
    authenticate();
    $results = $user->getAllPendingRequests();
    echo json_encode($results, JSON_UNESCAPED_UNICODE);
    exit;
}
