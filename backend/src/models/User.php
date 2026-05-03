<?php
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../services/SystemRoles.php';

class User
{
    private PDO $conn;
    private string $table = 'users';

    public function __construct(PDO $db)
    {
        $this->conn = $db;
    }

    public function createUser(string $name, string $email, string $password, string $role = 'student', ?string $dormitory = null): bool
    {
        $hashedPassword = password_hash($password, PASSWORD_BCRYPT);
        $normalizedRole = normalizeManagedRole($role, $email);
        $effectiveDormitory = $normalizedRole === 'admin' ? null : $dormitory;
        $query = "INSERT INTO {$this->table} (full_name, email, password_hash, role, dormitory)
                  VALUES (:name, :email, :password, :role, :dormitory)";
        $stmt = $this->conn->prepare($query);

        return $stmt->execute([
            ':name' => $name,
            ':email' => trim($email),
            ':password' => $hashedPassword,
            ':role' => $normalizedRole,
            ':dormitory' => $effectiveDormitory,
        ]);
    }

    public function getUserByEmail(string $email): ?array
    {
        $stmt = $this->conn->prepare("SELECT * FROM {$this->table} WHERE email = :email");
        $stmt->execute([':email' => trim($email)]);
        $result = $stmt->fetch(PDO::FETCH_ASSOC);

        return $result ?: null;
    }

    public function getUserById(int $id): ?array
    {
        $stmt = $this->conn->prepare("SELECT * FROM {$this->table} WHERE id = :id");
        $stmt->execute([':id' => $id]);
        $result = $stmt->fetch(PDO::FETCH_ASSOC);

        return $result ?: null;
    }

    public function updateUserRole(int $userId, string $role): bool
    {
        $stmt = $this->conn->prepare("UPDATE {$this->table} SET role = :role WHERE id = :id");
        return $stmt->execute([
            ':role' => $role,
            ':id' => $userId,
        ]);
    }

    public function ensureSystemRoleById(int $userId): ?array
    {
        $user = $this->getUserById($userId);
        if (!$user) {
            return null;
        }

        $expectedRole = isSystemAdminEmail($user['email'])
            ? 'admin'
            : normalizeManagedRole($user['role'], $user['email']);
        if ($user['role'] !== $expectedRole) {
            $this->updateUserRole($userId, $expectedRole);
            $user['role'] = $expectedRole;
        }

        return $user;
    }

    public function getAllUsers(): array
    {
        $stmt = $this->conn->query("SELECT id, full_name, email, role, dormitory, created_at FROM {$this->table} ORDER BY created_at DESC");
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function emailExistsForOtherUser(string $email, int $userId): bool
    {
        $stmt = $this->conn->prepare("SELECT COUNT(*) AS cnt FROM {$this->table} WHERE email = :email AND id != :id");
        $stmt->execute([
            ':email' => trim($email),
            ':id' => $userId,
        ]);
        $result = $stmt->fetch(PDO::FETCH_ASSOC);

        return (int) ($result['cnt'] ?? 0) > 0;
    }

    public function updateUserProfile(int $userId, string $fullName, string $email, string $role, ?string $dormitory): bool
    {
        $expectedRole = normalizeManagedRole($role, $email);
        $effectiveDormitory = $expectedRole === 'admin' ? null : $dormitory;

        $stmt = $this->conn->prepare(
            "UPDATE {$this->table}
             SET full_name = :full_name,
                 email = :email,
                 role = :role,
                 dormitory = :dormitory
             WHERE id = :id"
        );

        return $stmt->execute([
            ':full_name' => $fullName,
            ':email' => trim($email),
            ':role' => $expectedRole,
            ':dormitory' => $effectiveDormitory,
            ':id' => $userId,
        ]);
    }

    public function deleteUser(int $userId): bool
    {
        $stmt = $this->conn->prepare("DELETE FROM {$this->table} WHERE id = :id");
        return $stmt->execute([':id' => $userId]);
    }

    public function updatePassword(int $userId, string $password): bool
    {
        $stmt = $this->conn->prepare("UPDATE {$this->table} SET password_hash = :password_hash WHERE id = :id");

        return $stmt->execute([
            ':password_hash' => password_hash($password, PASSWORD_BCRYPT),
            ':id' => $userId,
        ]);
    }

    public function createPasswordResetToken(int $userId, string $tokenHash, string $expiresAt): bool
    {
        $stmt = $this->conn->prepare(
            "INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
             VALUES (:user_id, :token_hash, :expires_at)"
        );

        return $stmt->execute([
            ':user_id' => $userId,
            ':token_hash' => $tokenHash,
            ':expires_at' => $expiresAt,
        ]);
    }

    public function invalidatePasswordResetTokens(int $userId): bool
    {
        $stmt = $this->conn->prepare(
            "UPDATE password_reset_tokens
             SET used_at = COALESCE(used_at, NOW())
             WHERE user_id = :user_id AND used_at IS NULL"
        );

        return $stmt->execute([':user_id' => $userId]);
    }

    public function getActivePasswordResetToken(string $tokenHash): ?array
    {
        $stmt = $this->conn->prepare(
            "SELECT id, user_id, token_hash, expires_at, used_at, created_at
             FROM password_reset_tokens
             WHERE token_hash = :token_hash
               AND used_at IS NULL
               AND expires_at >= NOW()
             LIMIT 1"
        );
        $stmt->execute([':token_hash' => $tokenHash]);
        $result = $stmt->fetch(PDO::FETCH_ASSOC);

        return $result ?: null;
    }

    public function markPasswordResetTokenUsed(int $tokenId): bool
    {
        $stmt = $this->conn->prepare(
            "UPDATE password_reset_tokens
             SET used_at = NOW()
             WHERE id = :id AND used_at IS NULL"
        );

        return $stmt->execute([':id' => $tokenId]);
    }

    public function getLastStatus(int $userId): ?string
    {
        $stmt = $this->conn->prepare(
            "SELECT status FROM student_status
             WHERE student_id = :id
               AND (status = 'enrolled' OR approval_status = 'approved')
             ORDER BY timestamp DESC
             LIMIT 1"
        );
        $stmt->execute([':id' => $userId]);
        $result = $stmt->fetch(PDO::FETCH_ASSOC);

        return $result['status'] ?? null;
    }

    public function hasPendingRequest(int $userId): bool
    {
        $stmt = $this->conn->prepare(
            "SELECT COUNT(*) AS cnt
             FROM student_status
             WHERE student_id = :id AND approval_status = 'pending'"
        );
        $stmt->execute([':id' => $userId]);
        $result = $stmt->fetch(PDO::FETCH_ASSOC);

        return (int) ($result['cnt'] ?? 0) > 0;
    }

    public function updateStudentStatus(int $userId, string $status, ?string $location = null, ?string $signature = null): bool
    {
        if ($status === 'unenrolled') {
            $stmt = $this->conn->prepare(
                "INSERT INTO student_status (student_id, status, location, signature, approval_status)
                 VALUES (:student_id, :status, :location, :signature, 'pending')"
            );

            return $stmt->execute([
                ':student_id' => $userId,
                ':status' => $status,
                ':location' => $location,
                ':signature' => $signature,
            ]);
        }

        $stmt = $this->conn->prepare(
            "INSERT INTO student_status (student_id, status, approval_status)
             VALUES (:student_id, :status, 'approved')"
        );

        return $stmt->execute([
            ':student_id' => $userId,
            ':status' => $status,
        ]);
    }

    public function startShift(int $userId, string $dormitory): bool
    {
        $stmt = $this->conn->prepare("UPDATE {$this->table} SET dormitory = :dorm WHERE id = :id");
        return $stmt->execute([
            ':dorm' => $dormitory,
            ':id' => $userId,
        ]);
    }

    public function endShift(int $userId): bool
    {
        $stmt = $this->conn->prepare("UPDATE {$this->table} SET dormitory = NULL WHERE id = :id");
        return $stmt->execute([':id' => $userId]);
    }

    public function getPendingRequests(?string $dormitory = null): array
    {
        $sql = "SELECT ss.id, ss.student_id, ss.location, ss.signature, ss.timestamp,
                       u.full_name, u.email, u.dormitory AS student_dormitory
                FROM student_status ss
                JOIN {$this->table} u ON u.id = ss.student_id
                WHERE ss.approval_status = 'pending'
                  AND ss.status = 'unenrolled'";

        $params = [];
        if ($dormitory !== null) {
            $sql .= " AND u.dormitory = :dorm";
            $params[':dorm'] = $dormitory;
        }

        $sql .= " ORDER BY ss.timestamp ASC";
        $stmt = $this->conn->prepare($sql);
        $stmt->execute($params);

        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function getPendingRequestById(int $statusId): ?array
    {
        $stmt = $this->conn->prepare(
            "SELECT ss.id, ss.student_id, ss.location, ss.signature, ss.timestamp, ss.approval_status,
                    u.full_name, u.email, u.dormitory AS student_dormitory
             FROM student_status ss
             JOIN {$this->table} u ON u.id = ss.student_id
             WHERE ss.id = :id
             LIMIT 1"
        );
        $stmt->execute([':id' => $statusId]);
        $result = $stmt->fetch(PDO::FETCH_ASSOC);

        return $result ?: null;
    }

    public function approveUnenrollment(int $statusId, int $adminId): bool
    {
        $stmt = $this->conn->prepare(
            "UPDATE student_status
             SET approval_status = 'approved', approved_by = :admin_id, approved_at = NOW()
             WHERE id = :id AND approval_status = 'pending'"
        );

        $stmt->execute([
            ':admin_id' => $adminId,
            ':id' => $statusId,
        ]);

        return $stmt->rowCount() > 0;
    }

    public function rejectUnenrollment(int $statusId, int $adminId): bool
    {
        $stmt = $this->conn->prepare(
            "UPDATE student_status
             SET approval_status = 'rejected', approved_by = :admin_id, approved_at = NOW()
             WHERE id = :id AND approval_status = 'pending'"
        );

        $stmt->execute([
            ':admin_id' => $adminId,
            ':id' => $statusId,
        ]);

        return $stmt->rowCount() > 0;
    }

    public function getAllPendingRequests(): array
    {
        return $this->getPendingRequests();
    }

    public function getCalendarEvents(string $startDate, string $endDate): array
    {
        $stmt = $this->conn->prepare(
            "SELECT ce.id, ce.title, ce.description, ce.event_date, ce.end_date, ce.created_at,
                    creator.full_name AS created_by_name
             FROM calendar_events ce
             JOIN {$this->table} creator ON creator.id = ce.created_by
             WHERE ce.event_date <= :end_date
               AND COALESCE(ce.end_date, ce.event_date) >= :start_date
             ORDER BY ce.event_date ASC, ce.created_at DESC"
        );
        $stmt->execute([
            ':start_date' => $startDate,
            ':end_date' => $endDate,
        ]);

        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function getCalendarEventById(int $eventId): ?array
    {
        $stmt = $this->conn->prepare(
            "SELECT ce.id, ce.title, ce.description, ce.event_date, ce.end_date, ce.created_at,
                    creator.full_name AS created_by_name, creator.email AS created_by_email
             FROM calendar_events ce
             JOIN {$this->table} creator ON creator.id = ce.created_by
             WHERE ce.id = :id
             LIMIT 1"
        );
        $stmt->execute([':id' => $eventId]);
        $result = $stmt->fetch(PDO::FETCH_ASSOC);

        return $result ?: null;
    }

    public function createCalendarEvent(
        string $title,
        ?string $description,
        string $eventDate,
        ?string $endDate,
        int $createdBy
    ): bool {
        $stmt = $this->conn->prepare(
            "INSERT INTO calendar_events (title, description, event_date, end_date, created_by)
             VALUES (:title, :description, :event_date, :end_date, :created_by)"
        );

        return $stmt->execute([
            ':title' => $title,
            ':description' => $description,
            ':event_date' => $eventDate,
            ':end_date' => $endDate,
            ':created_by' => $createdBy,
        ]);
    }

    public function getLatestCalendarEvent(): ?array
    {
        $stmt = $this->conn->query(
            "SELECT ce.id, ce.title, ce.description, ce.event_date, ce.end_date, ce.created_at,
                    creator.full_name AS created_by_name
             FROM calendar_events ce
             JOIN {$this->table} creator ON creator.id = ce.created_by
             ORDER BY ce.id DESC
             LIMIT 1"
        );
        $result = $stmt->fetch(PDO::FETCH_ASSOC);

        return $result ?: null;
    }

    public function updateCalendarEvent(
        int $eventId,
        string $title,
        ?string $description,
        string $eventDate,
        ?string $endDate
    ): bool {
        $stmt = $this->conn->prepare(
            "UPDATE calendar_events
             SET title = :title,
                 description = :description,
                 event_date = :event_date,
                 end_date = :end_date
             WHERE id = :id"
        );

        return $stmt->execute([
            ':title' => $title,
            ':description' => $description,
            ':event_date' => $eventDate,
            ':end_date' => $endDate,
            ':id' => $eventId,
        ]);
    }

    public function deleteCalendarEvent(int $eventId): bool
    {
        $stmt = $this->conn->prepare("DELETE FROM calendar_events WHERE id = :id");
        return $stmt->execute([':id' => $eventId]);
    }

    public function getStudentAttendanceForMonth(int $userId, string $startDate, string $endDate): array
    {
        $stmt = $this->conn->prepare(
            "SELECT id, status, location, signature, approval_status, approved_at, timestamp
             FROM student_status
             WHERE student_id = :student_id
               AND DATE(timestamp) BETWEEN :start_date AND :end_date
             ORDER BY timestamp DESC"
        );
        $stmt->execute([
            ':student_id' => $userId,
            ':start_date' => $startDate,
            ':end_date' => $endDate,
        ]);

        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function getMonthlyAttendanceSummary(string $startDate, string $endDate): array
    {
        $stmt = $this->conn->prepare(
            "SELECT DATE(timestamp) AS day,
                    SUM(CASE WHEN status = 'enrolled' THEN 1 ELSE 0 END) AS enrolled_count,
                    SUM(CASE WHEN status = 'unenrolled' AND approval_status = 'approved' THEN 1 ELSE 0 END) AS unenrolled_count,
                    SUM(CASE WHEN approval_status = 'pending' THEN 1 ELSE 0 END) AS pending_count
             FROM student_status
             WHERE DATE(timestamp) BETWEEN :start_date AND :end_date
             GROUP BY DATE(timestamp)
             ORDER BY DATE(timestamp) ASC"
        );
        $stmt->execute([
            ':start_date' => $startDate,
            ':end_date' => $endDate,
        ]);

        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function getRecentNotificationLogs(int $limit = 25): array
    {
        $safeLimit = max(1, min($limit, 100));
        $stmt = $this->conn->query(
            "SELECT id, recipient_email, subject, event_type, status, error_message, created_at
             FROM email_notifications
             ORDER BY created_at DESC
             LIMIT {$safeLimit}"
        );

        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function deleteNotificationLog(int $notificationId): bool
    {
        $stmt = $this->conn->prepare("DELETE FROM email_notifications WHERE id = :id");
        return $stmt->execute([':id' => $notificationId]);
    }

    public function clearNotificationLogs(): bool
    {
        return $this->conn->exec("TRUNCATE TABLE email_notifications") !== false;
    }
}

?>
