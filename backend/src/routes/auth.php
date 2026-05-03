<?php
require_once __DIR__ . '/../models/User.php';
require_once __DIR__ . '/../config/jwt.php';
require_once __DIR__ . '/../middleware/jwtCheckToken.php';
require_once __DIR__ . '/../services/SystemRoles.php';
require_once __DIR__ . '/../services/AppClock.php';
require_once __DIR__ . '/../services/EmailNotifier.php';
require_once __DIR__ . '/../services/ApiException.php';
require_once __DIR__ . '/../services/StudentStatusWorkflow.php';
require_once __DIR__ . '/../services/PasswordResetService.php';

$database = new Database();
$db = $database->getConnection();

$db->exec(
    "CREATE TABLE IF NOT EXISTS calendar_events (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT NULL,
        event_date DATE NOT NULL,
        end_date DATE NULL,
        created_by INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
    )"
);

$db->exec(
    "CREATE TABLE IF NOT EXISTS email_notifications (
        id INT AUTO_INCREMENT PRIMARY KEY,
        recipient_email VARCHAR(255) NOT NULL,
        subject VARCHAR(255) NOT NULL,
        body TEXT NOT NULL,
        event_type VARCHAR(100) NOT NULL,
        status ENUM('sent', 'failed', 'logged') NOT NULL DEFAULT 'logged',
        error_message TEXT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )"
);

$user = new User($db);
$notifier = new EmailNotifier($db);
$studentStatusWorkflow = new StudentStatusWorkflow($user, $notifier);
$passwordResetService = new PasswordResetService($user, $notifier);

$requestMethod = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

function jsonResponse($payload, int $statusCode = 200): void
{
    http_response_code($statusCode);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function readJsonBody(): array
{
    $rawBody = file_get_contents('php://input');
    if (!$rawBody) {
        return [];
    }

    $decoded = json_decode($rawBody, true);
    return is_array($decoded) ? $decoded : [];
}

function normalizeMonth(?string $monthValue): string
{
    if ($monthValue && preg_match('/^\d{4}-\d{2}$/', $monthValue)) {
        return $monthValue;
    }

    return date('Y-m');
}

function createMonthBounds(string $monthValue): array
{
    $start = DateTime::createFromFormat('Y-m-d', $monthValue . '-01') ?: new DateTime('first day of this month');
    $end = clone $start;
    $end->modify('last day of this month');

    return [
        'start' => $start->format('Y-m-d'),
        'end' => $end->format('Y-m-d'),
    ];
}

function requireAdminAccess(User $userModel, int $userId): array
{
    $currentUser = $userModel->ensureSystemRoleById($userId);
    if (!$currentUser || $currentUser['role'] !== 'admin') {
        jsonResponse(['message' => 'Само администраторът има достъп до това действие.'], 403);
    }

    return $currentUser;
}

function requireStaffAccess(User $userModel, int $userId): array
{
    $currentUser = $userModel->ensureSystemRoleById($userId);
    if (!$currentUser || !in_array($currentUser['role'], ['admin', 'counselor'], true)) {
        jsonResponse(['message' => 'Само администратор или възпитател има достъп до това действие.'], 403);
    }

    return $currentUser;
}

function sendAdminNotification(EmailNotifier $emailNotifier, string $subject, string $body, string $eventType): void
{
    $emailNotifier->send(systemAdminEmail(), $subject, $body, $eventType);
}

function validateFullName(string $name): void
{
    if (mb_strlen($name) < 3) {
        jsonResponse(['message' => 'Името трябва да е поне 3 символа.'], 400);
    }
    if (mb_strlen($name) > 100) {
        jsonResponse(['message' => 'Името не може да е повече от 100 символа.'], 400);
    }
    if (!preg_match('/^[\p{L}\s\-]+$/u', $name)) {
        jsonResponse(['message' => 'Името може да съдържа само букви, интервали и тирета.'], 400);
    }
    if (count(array_filter(preg_split('/\s+/u', $name))) < 2) {
        jsonResponse(['message' => 'Въведете собствено и фамилно име.'], 400);
    }
}

function validateEmailAddress(string $email): void
{
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        jsonResponse(['message' => 'Невалиден имейл адрес.'], 400);
    }
}

function validatePasswordValue(string $password): void
{
    if (strlen($password) < 10) {
        jsonResponse(['message' => 'Паролата трябва да е поне 10 символа.'], 400);
    }
    if (strlen($password) > 72) {
        jsonResponse(['message' => 'Паролата не може да е повече от 72 символа.'], 400);
    }
    if (!preg_match('/[A-Z]/', $password)) {
        jsonResponse(['message' => 'Паролата трябва да съдържа поне една главна буква.'], 400);
    }
    if (!preg_match('/[a-z]/', $password)) {
        jsonResponse(['message' => 'Паролата трябва да съдържа поне една малка буква.'], 400);
    }
    if (!preg_match('/[0-9]/', $password)) {
        jsonResponse(['message' => 'Паролата трябва да съдържа поне една цифра.'], 400);
    }
    if (!preg_match('/[^A-Za-z0-9]/', $password)) {
        jsonResponse(['message' => 'Паролата трябва да съдържа поне един специален символ.'], 400);
    }
    if (preg_match('/\s/', $password)) {
        jsonResponse(['message' => 'Паролата не може да съдържа интервали.'], 400);
    }
}

function validateDormitory(?string $dormitory): void
{
    if (!in_array($dormitory, ['1', '2'], true)) {
        jsonResponse(['message' => 'Изберете валидно общежитие.'], 400);
    }
}

function normalizeEventPayload(array $data): array
{
    $title = trim($data['title'] ?? '');
    $description = trim($data['description'] ?? '');
    $eventDate = $data['eventDate'] ?? '';
    $endDate = $data['endDate'] ?? null;

    if ($title === '' || !$eventDate) {
        jsonResponse(['message' => 'Заглавието и датата са задължителни.'], 400);
    }

    $eventStart = DateTime::createFromFormat('Y-m-d', $eventDate);
    $eventEnd = $endDate ? DateTime::createFromFormat('Y-m-d', $endDate) : null;
    if (!$eventStart || ($endDate && !$eventEnd)) {
        jsonResponse(['message' => 'Невалиден формат на дата.'], 400);
    }
    if ($eventEnd && $eventEnd < $eventStart) {
        jsonResponse(['message' => 'Крайната дата не може да е преди началната.'], 400);
    }

    return [
        'title' => $title,
        'description' => $description !== '' ? $description : null,
        'eventDate' => $eventStart->format('Y-m-d'),
        'endDate' => $eventEnd ? $eventEnd->format('Y-m-d') : null,
    ];
}

function monthDateLabel(string $date): string
{
    return date('d.m.Y', strtotime($date));
}

function displayRoleLabel(string $role): string
{
    return $role === 'admin' ? 'администратор' : ($role === 'counselor' ? 'възпитател' : 'ученик');
}

function normalizeDateTimeValue(?string $value): ?string
{
    if ($value === null || trim($value) === '') {
        return null;
    }

    return AppClock::parse($value)?->format(DateTimeInterface::ATOM);
}

function normalizeDateTimeFields(array $records, array $fields): array
{
    return array_map(
        static function (array $record) use ($fields): array {
            foreach ($fields as $field) {
                if (array_key_exists($field, $record)) {
                    $record[$field] = normalizeDateTimeValue($record[$field]);
                }
            }

            return $record;
        },
        $records
    );
}

if ($requestMethod === 'POST' && $action === 'update_status') {
    $userId = authenticate();

    try {
        jsonResponse($studentStatusWorkflow->submitStatusChange((int) $userId, readJsonBody()));
    } catch (ApiException $exception) {
        jsonResponse($exception->getPayload(), $exception->getStatusCode());
    }
}

if ($requestMethod === 'POST' && ($action === 'approve_unenrollment' || $action === 'reject_unenrollment')) {
    $userId = authenticate();
    $payload = readJsonBody();
    $statusId = (int) ($payload['statusId'] ?? 0);
    $decision = $action === 'approve_unenrollment' ? 'approve' : 'reject';
    $reviewSignature = $payload['reviewSignature'] ?? null;

    try {
        jsonResponse($studentStatusWorkflow->reviewUnenrollmentRequest((int) $userId, $statusId, $decision, $reviewSignature));
    } catch (ApiException $exception) {
        jsonResponse($exception->getPayload(), $exception->getStatusCode());
    }
}

if ($requestMethod === 'POST' && $action === 'request_password_reset') {
    $payload = readJsonBody();
    $email = trim($payload['email'] ?? '');

    if ($email === '') {
        jsonResponse(['message' => 'Моля, въведете имейл адрес.'], 400);
    }

    validateEmailAddress($email);
    jsonResponse($passwordResetService->requestReset($email));
}

if ($requestMethod === 'POST' && $action === 'reset_password') {
    $payload = readJsonBody();
    $token = trim($payload['token'] ?? '');
    $password = $payload['password'] ?? '';

    if ($password === '') {
        jsonResponse(['message' => 'Моля, въведете нова парола.'], 400);
    }

    validatePasswordValue($password);

    try {
        jsonResponse($passwordResetService->resetPassword($token, $password));
    } catch (ApiException $exception) {
        jsonResponse($exception->getPayload(), $exception->getStatusCode());
    }
}

if ($requestMethod === 'POST') {
    $data = readJsonBody();

    if ($action === 'register' || $action === 'create_managed_user') {
        $actorId = null;
        if ($action === 'create_managed_user') {
            $actorId = authenticate();
            requireAdminAccess($user, (int) $actorId);
        }

        $name = trim($data['name'] ?? '');
        $email = trim($data['email'] ?? '');
        $password = $data['password'] ?? '';
        $dormitory = !empty($data['dormitory']) ? (string) $data['dormitory'] : null;
        $role = $action === 'create_managed_user'
            ? normalizeManagedRole($data['role'] ?? 'student', $email)
            : getSystemRoleForEmail($email);
        $isAdminRegistration = $role === 'admin';

        if (!$name || !$email || !$password) {
            jsonResponse(['message' => 'Всички полета са задължителни.'], 400);
        }

        validateFullName($name);
        validateEmailAddress($email);
        validatePasswordValue($password);

        if (!$isAdminRegistration) {
            validateDormitory($dormitory);
        }

        if ($user->getUserByEmail($email)) {
            jsonResponse(['message' => 'Имейлът вече е регистриран.'], 400);
        }

        if (!$user->createUser($name, $email, $password, $role, $isAdminRegistration ? null : $dormitory)) {
            jsonResponse(['message' => 'Грешка при записване. Опитайте отново.'], 500);
        }

        $createdUser = $user->getUserByEmail($email);
        if (!$createdUser) {
            jsonResponse(['message' => 'Грешка при създаване на профила.'], 500);
        }

        $token = null;
        if ($action === 'register') {
            $token = JwtHandler::generateToken((int) $createdUser['id']);
        }

        $roleLabel = $role === 'admin' ? 'администратор' : ($role === 'counselor' ? 'възпитател' : 'ученик');
        $welcomeBody = "Здравейте, {$name},\n\n"
            . "Вашият профил в UKTC TESSIS беше създаден успешно.\n"
            . "Роля: {$roleLabel}\n"
            . (!$isAdminRegistration ? "Общежитие: {$dormitory}\n" : '')
            . "\nТова е автоматично известие.";
        $notifier->send($email, 'Успешна регистрация в UKTC TESSIS', $welcomeBody, 'register_user');

        $adminBody = "Нов профил беше създаден в системата.\n\n"
            . "Име: {$name}\nИмейл: {$email}\nРоля: {$roleLabel}\n"
            . (!$isAdminRegistration ? "Общежитие: {$dormitory}\n" : '');
        sendAdminNotification($notifier, 'Създаден нов профил', $adminBody, 'register_admin');

        $response = ['message' => $action === 'register' ? 'Регистрацията е успешна.' : 'Потребителят е създаден успешно.', 'user' => $createdUser];
        if ($token) {
            $response['token'] = $token;
        }
        jsonResponse($response);
    }

    if ($action === 'login') {
        $email = trim($data['email'] ?? '');
        $password = $data['password'] ?? '';

        if (!$email || !$password) {
            jsonResponse(['message' => 'Всички полета са задължителни.'], 400);
        }

        $userData = $user->getUserByEmail($email);
        if (!$userData || !password_verify($password, $userData['password_hash'])) {
            jsonResponse(['message' => 'Грешен email или парола.'], 401);
        }

        $userData = $user->ensureSystemRoleById((int) $userData['id']);
        $token = JwtHandler::generateToken((int) $userData['id']);

        $loginBody = "Здравейте, {$userData['full_name']},\n\n"
            . 'Има нов вход във вашия акаунт в UKTC TESSIS на ' . AppClock::formatBg() . ".\n\n"
            . 'Ако не сте били вие, сменете паролата си.';
        $notifier->send($userData['email'], 'Успешен вход в UKTC TESSIS', $loginBody, 'login_user');

        $adminBody = "Потребител влезе в системата.\n\n"
            . "Име: {$userData['full_name']}\nИмейл: {$userData['email']}\nРоля: " . displayRoleLabel($userData['role']) . "\n"
            . 'Час: ' . AppClock::formatBg();
        sendAdminNotification($notifier, 'Вход в UKTC TESSIS', $adminBody, 'login_admin');

        jsonResponse(['message' => 'Входът е успешен.', 'token' => $token]);
    }

    if ($action === 'create_calendar_event' || $action === 'update_calendar_event') {
        $userId = authenticate();
        $adminUser = requireAdminAccess($user, (int) $userId);
        $payload = normalizeEventPayload($data);

        if ($action === 'create_calendar_event') {
            $saved = $user->createCalendarEvent($payload['title'], $payload['description'], $payload['eventDate'], $payload['endDate'], (int) $userId);
            if (!$saved) {
                jsonResponse(['message' => 'Грешка при създаване на събитието.'], 500);
            }
            $event = $user->getLatestCalendarEvent();
            $subject = 'Ново календарно събитие';
            $eventType = 'calendar_event';
            $message = 'Събитието е създадено успешно.';
        } else {
            $eventId = (int) ($data['eventId'] ?? 0);
            if (!$eventId) {
                jsonResponse(['message' => 'Липсва eventId.'], 400);
            }
            if (!$user->getCalendarEventById($eventId)) {
                jsonResponse(['message' => 'Събитието не е намерено.'], 404);
            }
            $saved = $user->updateCalendarEvent($eventId, $payload['title'], $payload['description'], $payload['eventDate'], $payload['endDate']);
            if (!$saved) {
                jsonResponse(['message' => 'Грешка при редакция на събитието.'], 500);
            }
            $event = $user->getCalendarEventById($eventId);
            $subject = 'Редактирано календарно събитие';
            $eventType = 'calendar_event_updated';
            $message = 'Събитието е редактирано успешно.';
        }

        $allUsers = $user->getAllUsers();
        $body = ($action === 'create_calendar_event' ? 'Създадено е' : 'Редактирано е') . " календарно събитие в UKTC TESSIS.\n\n"
            . "Заглавие: {$payload['title']}\n"
            . 'Дата: ' . monthDateLabel($payload['eventDate'])
            . ($payload['endDate'] ? ' - ' . monthDateLabel($payload['endDate']) : '') . "\n"
            . ($payload['description'] ? "Описание: {$payload['description']}\n" : '')
            . "\nОт: {$adminUser['full_name']}";
        $notifier->sendMany(array_column($allUsers, 'email'), $subject, $body, $eventType);

        jsonResponse(['message' => $message, 'event' => $event]);
    }

    if ($action === 'delete_calendar_event') {
        $userId = authenticate();
        $adminUser = requireAdminAccess($user, (int) $userId);
        $eventId = (int) ($data['eventId'] ?? 0);
        if (!$eventId) {
            jsonResponse(['message' => 'Липсва eventId.'], 400);
        }
        $event = $user->getCalendarEventById($eventId);
        if (!$event) {
            jsonResponse(['message' => 'Събитието не е намерено.'], 404);
        }
        if (!$user->deleteCalendarEvent($eventId)) {
            jsonResponse(['message' => 'Грешка при изтриване на събитието.'], 500);
        }

        $allUsers = $user->getAllUsers();
        $body = "Изтрито е календарно събитие в UKTC TESSIS.\n\n"
            . "Заглавие: {$event['title']}\n"
            . 'Дата: ' . monthDateLabel($event['event_date'])
            . ($event['end_date'] ? ' - ' . monthDateLabel($event['end_date']) : '') . "\n"
            . "\nОт: {$adminUser['full_name']}";
        $notifier->sendMany(array_column($allUsers, 'email'), 'Изтрито календарно събитие', $body, 'calendar_event_deleted');

        jsonResponse(['message' => 'Събитието е изтрито успешно.']);
    }

    if ($action === 'update_user') {
        $userId = authenticate();
        requireAdminAccess($user, (int) $userId);
        $targetUserId = (int) ($data['userId'] ?? 0);
        $name = trim($data['name'] ?? '');
        $email = trim($data['email'] ?? '');
        $dormitory = !empty($data['dormitory']) ? (string) $data['dormitory'] : null;

        if (!$targetUserId || !$name || !$email) {
            jsonResponse(['message' => 'Липсват задължителни данни за редакция.'], 400);
        }

        $existingUser = $user->getUserById($targetUserId);
        if (!$existingUser) {
            jsonResponse(['message' => 'Потребителят не е намерен.'], 404);
        }

        validateFullName($name);
        validateEmailAddress($email);

        if (isSystemAdminEmail($existingUser['email']) && normalizeSystemEmail($email) !== systemAdminEmail()) {
            jsonResponse(['message' => 'Имейлът на системния админ не може да бъде променян.'], 400);
        }
        if ($user->emailExistsForOtherUser($email, $targetUserId)) {
            jsonResponse(['message' => 'Имейлът вече се използва от друг потребител.'], 400);
        }

        $targetRole = normalizeManagedRole($data['role'] ?? $existingUser['role'], $email);
        if ($targetRole !== 'admin') {
            validateDormitory($dormitory);
        }

        if (!$user->updateUserProfile($targetUserId, $name, $email, $targetRole, $dormitory)) {
            jsonResponse(['message' => 'Грешка при обновяване на потребителя.'], 500);
        }

        $updatedUser = $user->getUserById($targetUserId);
        $notifier->send($email, 'Профилът ви беше обновен', 'Профилът ви в UKTC TESSIS беше обновен от администратор.', 'user_updated');

        jsonResponse(['message' => 'Потребителят е обновен успешно.', 'user' => $updatedUser]);
    }

    if ($action === 'delete_user') {
        $userId = authenticate();
        requireAdminAccess($user, (int) $userId);
        $targetUserId = (int) ($data['userId'] ?? 0);
        if (!$targetUserId) {
            jsonResponse(['message' => 'Липсва userId.'], 400);
        }
        if ((int) $userId === $targetUserId) {
            jsonResponse(['message' => 'Не можете да изтриете собствения си акаунт.'], 400);
        }

        $existingUser = $user->getUserById($targetUserId);
        if (!$existingUser) {
            jsonResponse(['message' => 'Потребителят не е намерен.'], 404);
        }
        if (isSystemAdminEmail($existingUser['email'])) {
            jsonResponse(['message' => 'Системният админ не може да бъде изтрит.'], 400);
        }

        if (!$user->deleteUser($targetUserId)) {
            jsonResponse(['message' => 'Грешка при изтриване на потребителя.'], 500);
        }

        $notifier->send($existingUser['email'], 'Профилът ви беше изтрит', 'Профилът ви в UKTC TESSIS беше изтрит от администратор.', 'user_deleted');
        jsonResponse(['message' => 'Потребителят е изтрит успешно.']);
    }

    if ($action === 'delete_notification' || $action === 'clear_notifications') {
        $userId = authenticate();
        requireAdminAccess($user, (int) $userId);

        if ($action === 'delete_notification') {
            $notificationId = (int) ($data['notificationId'] ?? 0);
            if (!$notificationId) {
                jsonResponse(['message' => 'Липсва notificationId.'], 400);
            }
            if (!$user->deleteNotificationLog($notificationId)) {
                jsonResponse(['message' => 'Грешка при изтриване на лог записа.'], 500);
            }
            jsonResponse(['message' => 'Известието е изтрито.']);
        }

        if (!$user->clearNotificationLogs()) {
            jsonResponse(['message' => 'Грешка при изчистване на логовете.'], 500);
        }
        jsonResponse(['message' => 'Логовете са изчистени.']);
    }
}

if ($requestMethod === 'GET' && $action === 'get_week_records') {
    $userId = authenticate();
    $currentUser = requireStaffAccess($user, (int) $userId);

    $startOfWeek = date('Y-m-d 00:00:00', strtotime('monday this week'));
    $endOfWeek = date('Y-m-d 23:59:59', strtotime('sunday this week'));

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
        WHERE 1 = 1
    ";

    $params = [
        ':start' => $startOfWeek,
        ':end' => $endOfWeek,
    ];

    if ($currentUser['role'] === 'counselor') {
        $sql .= " AND u.dormitory = :dormitory";
        $params[':dormitory'] = $currentUser['dormitory'];
    }

    $sql .= "
        ORDER BY ss.timestamp DESC
    ";

    $stmt = $db->prepare($sql);
    $stmt->execute($params);
    jsonResponse(
        normalizeDateTimeFields(
            $stmt->fetchAll(PDO::FETCH_ASSOC),
            ['timestamp']
        )
    );
}

if ($requestMethod === 'GET' && $action === 'get_my_history') {
    $userId = authenticate();
    $stmt = $db->prepare(
        "SELECT ss.status,
                ss.location,
                ss.signature,
                ss.review_signature,
                ss.approval_status,
                ss.approved_at,
                ss.timestamp,
                reviewer.full_name AS approved_by_name,
                reviewer.role AS approved_by_role
         FROM student_status ss
         LEFT JOIN users reviewer ON reviewer.id = ss.approved_by
         WHERE student_id = :id
         ORDER BY timestamp DESC
         LIMIT 10"
    );
    $stmt->execute([':id' => $userId]);
    jsonResponse(
        normalizeDateTimeFields(
            $stmt->fetchAll(PDO::FETCH_ASSOC),
            ['approved_at', 'timestamp']
        )
    );
}

if ($requestMethod === 'GET' && $action === 'get_pending_requests') {
    $userId = authenticate();
    $currentUser = requireStaffAccess($user, (int) $userId);
    if ($currentUser['role'] === 'counselor') {
        jsonResponse(
            normalizeDateTimeFields(
                $user->getPendingRequests($currentUser['dormitory'] ?: null),
                ['timestamp']
            )
        );
    }
    jsonResponse(normalizeDateTimeFields($user->getAllPendingRequests(), ['timestamp']));
}

if ($requestMethod === 'GET' && $action === 'get_calendar_data') {
    $userId = authenticate();
    $currentUser = $user->ensureSystemRoleById((int) $userId);
    if (!$currentUser) {
        jsonResponse(['message' => 'Потребителят не е намерен.'], 404);
    }

    $month = normalizeMonth($_GET['month'] ?? null);
    $bounds = createMonthBounds($month);
    $events = $user->getCalendarEvents($bounds['start'], $bounds['end']);

    $response = [
        'month' => $month,
        'events' => $events,
        'canManageEvents' => $currentUser['role'] === 'admin',
    ];

    if ($currentUser['role'] === 'admin') {
        $response['dailySummary'] = $user->getMonthlyAttendanceSummary($bounds['start'], $bounds['end']);
    } else {
        $response['attendance'] = $user->getStudentAttendanceForMonth((int) $userId, $bounds['start'], $bounds['end']);
    }

    jsonResponse($response);
}

if ($requestMethod === 'GET' && $action === 'get_recent_notifications') {
    $userId = authenticate();
    requireAdminAccess($user, (int) $userId);
    jsonResponse(normalizeDateTimeFields($user->getRecentNotificationLogs(), ['created_at']));
}

if ($requestMethod === 'GET' && $action === 'get_users') {
    $userId = authenticate();
    requireAdminAccess($user, (int) $userId);
    jsonResponse($user->getAllUsers());
}

jsonResponse(['message' => 'Route not found.'], 404);
