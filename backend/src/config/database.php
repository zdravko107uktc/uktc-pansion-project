<?php
require_once __DIR__ . '/../services/AppClock.php';

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

        $dbHost = getenv('DB_HOST') ?: getenv('MYSQLHOST') ?: '';
        if ($dbHost === '') {
            error_log('No database environment variables were found. Falling back to localhost defaults. Set MYSQLHOST/MYSQLPORT/MYSQLDATABASE/MYSQLUSER/MYSQLPASSWORD or MYSQL_URL in Railway.');
        }

        $this->host = $dbHost !== '' ? $dbHost : 'localhost';
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
            $this->applyConnectionTimezone();
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
        $this->ensureUserSchema();

        $this->conn->exec("
            CREATE TABLE IF NOT EXISTS student_status (
                id INT AUTO_INCREMENT PRIMARY KEY,
                student_id INT NOT NULL,
                status ENUM('enrolled', 'unenrolled') NOT NULL,
                location VARCHAR(255) NULL,
                signature MEDIUMTEXT NULL,
                review_signature MEDIUMTEXT NULL,
                approval_status ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'approved',
                approved_by INT NULL,
                approved_at TIMESTAMP NULL,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL
            )
        ");
        $this->ensureStudentStatusSchema();

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
        $this->ensureCalendarEventSchema();

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
        $this->ensureEmailNotificationSchema();

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
        $this->ensurePasswordResetSchema();
    }

    private function ensureUserSchema(): void
    {
        $this->ensureColumn(
            'users',
            'role',
            "ALTER TABLE users ADD COLUMN role ENUM('admin', 'student', 'counselor') NOT NULL DEFAULT 'student'"
        );
        $this->ensureColumn(
            'users',
            'dormitory',
            "ALTER TABLE users ADD COLUMN dormitory ENUM('1', '2') NULL"
        );
        $this->conn->exec("ALTER TABLE users MODIFY COLUMN role ENUM('admin', 'student', 'counselor') NOT NULL DEFAULT 'student'");
        $this->conn->exec("ALTER TABLE users MODIFY COLUMN dormitory ENUM('1', '2') NULL");
    }

    private function ensureStudentStatusSchema(): void
    {
        $this->ensureColumn(
            'student_status',
            'location',
            "ALTER TABLE student_status ADD COLUMN location VARCHAR(255) NULL"
        );
        $this->ensureColumn(
            'student_status',
            'signature',
            "ALTER TABLE student_status ADD COLUMN signature MEDIUMTEXT NULL"
        );
        $this->ensureColumn(
            'student_status',
            'review_signature',
            "ALTER TABLE student_status ADD COLUMN review_signature MEDIUMTEXT NULL"
        );
        $this->ensureColumn(
            'student_status',
            'approval_status',
            "ALTER TABLE student_status ADD COLUMN approval_status ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'approved'"
        );
        $this->ensureColumn(
            'student_status',
            'approved_by',
            "ALTER TABLE student_status ADD COLUMN approved_by INT NULL"
        );
        $this->ensureColumn(
            'student_status',
            'approved_at',
            "ALTER TABLE student_status ADD COLUMN approved_at TIMESTAMP NULL"
        );
        $this->conn->exec("ALTER TABLE student_status MODIFY COLUMN location VARCHAR(255) NULL");
        $this->conn->exec("ALTER TABLE student_status MODIFY COLUMN signature MEDIUMTEXT NULL");
        $this->conn->exec("ALTER TABLE student_status MODIFY COLUMN review_signature MEDIUMTEXT NULL");
        $this->conn->exec("ALTER TABLE student_status MODIFY COLUMN approval_status ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'approved'");
        $this->ensureForeignKey(
            'student_status',
            'approved_by',
            'users',
            'id',
            "ALTER TABLE student_status ADD CONSTRAINT fk_student_status_approved_by FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL"
        );
    }

    private function ensureCalendarEventSchema(): void
    {
        $this->ensureColumn(
            'calendar_events',
            'description',
            "ALTER TABLE calendar_events ADD COLUMN description TEXT NULL"
        );
        $this->ensureColumn(
            'calendar_events',
            'end_date',
            "ALTER TABLE calendar_events ADD COLUMN end_date DATE NULL"
        );
        $this->conn->exec("ALTER TABLE calendar_events MODIFY COLUMN description TEXT NULL");
        $this->conn->exec("ALTER TABLE calendar_events MODIFY COLUMN end_date DATE NULL");
    }

    private function ensureEmailNotificationSchema(): void
    {
        $this->ensureColumn(
            'email_notifications',
            'event_type',
            "ALTER TABLE email_notifications ADD COLUMN event_type VARCHAR(100) NOT NULL DEFAULT 'generic'"
        );
        $this->ensureColumn(
            'email_notifications',
            'status',
            "ALTER TABLE email_notifications ADD COLUMN status ENUM('sent', 'failed', 'logged') NOT NULL DEFAULT 'logged'"
        );
        $this->ensureColumn(
            'email_notifications',
            'error_message',
            "ALTER TABLE email_notifications ADD COLUMN error_message TEXT NULL"
        );
        $this->conn->exec("ALTER TABLE email_notifications MODIFY COLUMN status ENUM('sent', 'failed', 'logged') NOT NULL DEFAULT 'logged'");
        $this->conn->exec("ALTER TABLE email_notifications MODIFY COLUMN error_message TEXT NULL");
    }

    private function ensurePasswordResetSchema(): void
    {
        $this->ensureColumn(
            'password_reset_tokens',
            'used_at',
            "ALTER TABLE password_reset_tokens ADD COLUMN used_at DATETIME NULL"
        );
    }

    private function ensureColumn(string $tableName, string $columnName, string $alterSql): void
    {
        if ($this->columnExists($tableName, $columnName)) {
            return;
        }

        $this->conn->exec($alterSql);
    }

    private function ensureForeignKey(
        string $tableName,
        string $columnName,
        string $referencedTable,
        string $referencedColumn,
        string $alterSql
    ): void
    {
        $stmt = $this->conn->prepare(
            "SELECT COUNT(*) FROM information_schema.KEY_COLUMN_USAGE
             WHERE TABLE_SCHEMA = DATABASE()
               AND TABLE_NAME = :table_name
               AND COLUMN_NAME = :column_name
               AND REFERENCED_TABLE_NAME = :referenced_table
               AND REFERENCED_COLUMN_NAME = :referenced_column"
        );
        $stmt->execute([
            ':table_name' => $tableName,
            ':column_name' => $columnName,
            ':referenced_table' => $referencedTable,
            ':referenced_column' => $referencedColumn,
        ]);

        if ((int) $stmt->fetchColumn() > 0) {
            return;
        }

        $this->conn->exec($alterSql);
    }

    private function columnExists(string $tableName, string $columnName): bool
    {
        $stmt = $this->conn->prepare(
            "SELECT COUNT(*) FROM information_schema.COLUMNS
             WHERE TABLE_SCHEMA = DATABASE()
               AND TABLE_NAME = :table_name
               AND COLUMN_NAME = :column_name"
        );
        $stmt->execute([
            ':table_name' => $tableName,
            ':column_name' => $columnName,
        ]);

        return (int) $stmt->fetchColumn() > 0;
    }

    private function applyConnectionTimezone(): void
    {
        $offset = AppClock::currentMysqlOffset();
        $this->conn->exec("SET time_zone = '{$offset}'");
    }
}
