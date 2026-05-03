<?php
class Database {
    private $host;
    private $port;
    private $db_name;
    private $username;
    private $password;
    public $conn;

    public function __construct() {
        $this->host     = getenv('DB_HOST')     ?: 'localhost';
        $this->port     = getenv('DB_PORT')     ?: '3306';
        $this->db_name  = getenv('DB_NAME')     ?: 'checkin_checkout';
        $this->username = getenv('DB_USER')     ?: 'root';
        $this->password = getenv('DB_PASSWORD') ?: '';
    }

    public function getConnection() {
        $this->conn = null;
        try {
            $dsn = "mysql:host={$this->host};port={$this->port};dbname={$this->db_name};charset=utf8mb4";
            $this->conn = new PDO($dsn, $this->username, $this->password);
            $this->conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
            $this->initializeSchema();
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(["message" => "Database connection error."]);
            exit;
        }
        return $this->conn;
    }

    private function initializeSchema(): void
    {
        $this->conn->exec("
            CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                full_name VARCHAR(255) NOT NULL,
                email VARCHAR(255) NOT NULL UNIQUE,
                password_hash VARCHAR(255) NOT NULL,
                role ENUM('admin', 'student', 'counselor') NOT NULL DEFAULT 'student',
                dormitory ENUM('1', '2') NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ");

        $this->conn->exec("
            CREATE TABLE IF NOT EXISTS student_status (
                id INT AUTO_INCREMENT PRIMARY KEY,
                student_id INT NOT NULL,
                status ENUM('enrolled', 'unenrolled') NOT NULL,
                location VARCHAR(255) NULL,
                signature MEDIUMTEXT NULL,
                approval_status ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'approved',
                approved_by INT NULL,
                approved_at TIMESTAMP NULL,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL
            )
        ");

        $this->conn->exec("
            CREATE TABLE IF NOT EXISTS calendar_events (
                id INT AUTO_INCREMENT PRIMARY KEY,
                title VARCHAR(255) NOT NULL,
                description TEXT NULL,
                event_date DATE NOT NULL,
                end_date DATE NULL,
                created_by INT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
            )
        ");

        $this->conn->exec("
            CREATE TABLE IF NOT EXISTS email_notifications (
                id INT AUTO_INCREMENT PRIMARY KEY,
                recipient_email VARCHAR(255) NOT NULL,
                subject VARCHAR(255) NOT NULL,
                body TEXT NOT NULL,
                event_type VARCHAR(100) NOT NULL,
                status ENUM('sent', 'failed', 'logged') NOT NULL DEFAULT 'logged',
                error_message TEXT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ");
    }
}
