<?php
class Database {
    private $host;
    private $port;
    private $db_name;
    private $username;
    private $password;
    public $conn;

    public function __construct() {
        $databaseUrl = getenv('DATABASE_URL') ?: getenv('MYSQL_URL') ?: '';
        if ($databaseUrl !== '') {
            $parts = parse_url($databaseUrl);
            if ($parts === false) {
                error_log('Invalid database URL provided via DATABASE_URL or MYSQL_URL.');
                $parts = [];
            }
            $this->host = $parts['host'] ?? 'localhost';
            $this->port = (string) ($parts['port'] ?? 3306);
            $this->db_name = isset($parts['path']) ? rawurldecode(ltrim($parts['path'], '/')) : 'checkin_checkout';
            $this->username = isset($parts['user']) ? rawurldecode($parts['user']) : 'root';
            $this->password = isset($parts['pass']) ? rawurldecode($parts['pass']) : '';
            return;
        }

        $this->host = getenv('DB_HOST') ?: getenv('MYSQLHOST') ?: 'localhost';
        $this->port = getenv('DB_PORT') ?: getenv('MYSQLPORT') ?: '3306';
        $this->db_name = getenv('DB_NAME') ?: getenv('MYSQLDATABASE') ?: 'checkin_checkout';
        $this->username = getenv('DB_USER') ?: getenv('MYSQLUSER') ?: 'root';
        $this->password = getenv('DB_PASSWORD') ?: getenv('MYSQLPASSWORD') ?: '';
    }

    public function getConnection() {
        $this->conn = null;
        try {
            $dsn = "mysql:host={$this->host};port={$this->port};dbname={$this->db_name};charset=utf8mb4";
            $this->conn = new PDO($dsn, $this->username, $this->password);
            $this->conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
            $this->conn->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
            $this->initializeSchema();
        } catch (PDOException $e) {
            $safeHost = $this->host ?: '(empty)';
            $safePort = $this->port ?: '(empty)';
            $safeDb = $this->db_name ?: '(empty)';
            $safeUser = $this->username ?: '(empty)';
            error_log(sprintf(
                'Database bootstrap failed. host=%s port=%s db=%s user=%s message=%s',
                $safeHost,
                $safePort,
                $safeDb,
                $safeUser,
                $e->getMessage()
            ));
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

        $this->conn->exec("
            CREATE TABLE IF NOT EXISTS password_reset_tokens (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                token_hash CHAR(64) NOT NULL UNIQUE,
                expires_at DATETIME NOT NULL,
                used_at DATETIME NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        ");
    }
}
