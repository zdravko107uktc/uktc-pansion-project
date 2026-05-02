<?php
require_once __DIR__ . '/../config/database.php';

class User {
    private $conn;
    private $table = "users";

    public function __construct($db) {
        $this->conn = $db;
    }

    public function createUser($name, $email, $password, $role, $dormitory = null) {
        $hashedPassword = password_hash($password, PASSWORD_BCRYPT);
        $query = "INSERT INTO users (full_name, email, password_hash, role, dormitory)
                  VALUES (:name, :email, :password, :role, :dormitory)";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(":name", $name);
        $stmt->bindParam(":email", $email);
        $stmt->bindParam(":password", $hashedPassword);
        $stmt->bindParam(":role", $role);
        $stmt->bindParam(":dormitory", $dormitory);
        return $stmt->execute();
    }

    public function getUserByEmail($email) {
        $stmt = $this->conn->prepare("SELECT * FROM users WHERE email = :email");
        $stmt->bindParam(":email", $email);
        $stmt->execute();
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }

    public function getUserById($id) {
        $stmt = $this->conn->prepare("SELECT * FROM users WHERE id = :id");
        $stmt->bindParam(":id", $id);
        $stmt->execute();
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }

    // Returns the effective last status — only approved unenrollments count.
    public function getLastStatus($userId) {
        $stmt = $this->conn->prepare(
            "SELECT status FROM student_status
             WHERE student_id = :id
               AND (status = 'enrolled' OR approval_status = 'approved')
             ORDER BY timestamp DESC LIMIT 1"
        );
        $stmt->bindParam(':id', $userId);
        $stmt->execute();
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        return $result ? $result['status'] : null;
    }

    public function hasPendingRequest($userId) {
        $stmt = $this->conn->prepare(
            "SELECT COUNT(*) AS cnt FROM student_status
             WHERE student_id = :id AND approval_status = 'pending'"
        );
        $stmt->bindParam(':id', $userId);
        $stmt->execute();
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        return $result['cnt'] > 0;
    }

    public function updateStudentStatus($userId, $status, $location = null, $signature = null) {
        if ($status === 'unenrolled') {
            $approvalStatus = 'pending';
            $query = "INSERT INTO student_status (student_id, status, location, signature, approval_status)
                      VALUES (:student_id, :status, :location, :signature, 'pending')";
        } else {
            $query = "INSERT INTO student_status (student_id, status, approval_status)
                      VALUES (:student_id, :status, 'approved')";
        }

        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':student_id', $userId);
        $stmt->bindParam(':status', $status);

        if ($status === 'unenrolled') {
            $stmt->bindParam(':location', $location);
            $stmt->bindParam(':signature', $signature);
        }

        return $stmt->execute();
    }

    public function startShift($userId, $dormitory) {
        $stmt = $this->conn->prepare("UPDATE users SET dormitory = :dorm WHERE id = :id");
        $stmt->bindParam(':dorm', $dormitory);
        $stmt->bindParam(':id', $userId);
        return $stmt->execute();
    }

    public function endShift($userId) {
        $stmt = $this->conn->prepare("UPDATE users SET dormitory = NULL WHERE id = :id");
        $stmt->bindParam(':id', $userId);
        return $stmt->execute();
    }

    public function getPendingRequests($dormitory) {
        $stmt = $this->conn->prepare(
            "SELECT ss.id, ss.student_id, ss.location, ss.signature, ss.timestamp,
                    u.full_name, u.email, u.dormitory AS student_dormitory
             FROM student_status ss
             JOIN users u ON u.id = ss.student_id
             WHERE ss.approval_status = 'pending'
               AND ss.status = 'unenrolled'
               AND u.dormitory = :dorm
             ORDER BY ss.timestamp ASC"
        );
        $stmt->bindParam(':dorm', $dormitory);
        $stmt->execute();
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function approveUnenrollment($statusId, $counselorId) {
        $stmt = $this->conn->prepare(
            "UPDATE student_status
             SET approval_status = 'approved', approved_by = :counselor_id, approved_at = NOW()
             WHERE id = :id AND approval_status = 'pending'"
        );
        $stmt->bindParam(':counselor_id', $counselorId);
        $stmt->bindParam(':id', $statusId);
        return $stmt->execute();
    }

    public function rejectUnenrollment($statusId, $counselorId) {
        $stmt = $this->conn->prepare(
            "UPDATE student_status
             SET approval_status = 'rejected', approved_by = :counselor_id, approved_at = NOW()
             WHERE id = :id AND approval_status = 'pending'"
        );
        $stmt->bindParam(':counselor_id', $counselorId);
        $stmt->bindParam(':id', $statusId);
        return $stmt->execute();
    }

    public function getAllPendingRequests() {
        $stmt = $this->conn->prepare(
            "SELECT ss.id, ss.student_id, ss.location, ss.signature, ss.timestamp,
                    u.full_name, u.email, u.dormitory AS student_dormitory
             FROM student_status ss
             JOIN users u ON u.id = ss.student_id
             WHERE ss.approval_status = 'pending'
               AND ss.status = 'unenrolled'
             ORDER BY ss.timestamp ASC"
        );
        $stmt->execute();
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
}
?>
