<?php

require_once __DIR__ . '/MailTransportInterface.php';
require_once __DIR__ . '/PhpMailTransport.php';
require_once __DIR__ . '/SmtpMailTransport.php';

class EmailNotifier
{
    private PDO $conn;
    private string $fromEmail;
    private string $fromName;
    private bool $logOnly;
    private ?MailTransportInterface $transport;

    public function __construct(PDO $conn)
    {
        $this->conn = $conn;
        $this->fromEmail = getenv('MAIL_FROM') ?: 'school.inventory.bot@gmail.com';
        $this->fromName = getenv('MAIL_FROM_NAME') ?: 'school-inventory-management-system';
        $this->logOnly = filter_var(getenv('MAIL_FORCE_LOG_ONLY') ?: '0', FILTER_VALIDATE_BOOLEAN);
        $this->transport = $this->createTransport();
    }

    public function send(string $recipientEmail, string $subject, string $body, string $eventType): array
    {
        $status = 'logged';
        $errorMessage = $this->logOnly
            ? 'Email delivery is disabled because MAIL_FORCE_LOG_ONLY is enabled.'
            : null;

        if (!$this->logOnly) {
            if (!$this->transport) {
                $status = 'failed';
                $errorMessage = 'No email transport is configured. Set SMTP variables or enable PHP mail().';
                $this->logNotification($recipientEmail, $subject, $body, $eventType, $status, $errorMessage);

                return [
                    'recipient' => $recipientEmail,
                    'status' => $status,
                    'error' => $errorMessage,
                ];
            }

            try {
                $this->transport->send($this->fromEmail, $this->fromName, $recipientEmail, $subject, $body);
                $status = 'sent';
                $errorMessage = null;
            } catch (Throwable $exception) {
                $status = 'failed';
                $errorMessage = $exception->getMessage();
            }
        }

        $this->logNotification($recipientEmail, $subject, $body, $eventType, $status, $errorMessage);

        return [
            'recipient' => $recipientEmail,
            'status' => $status,
            'error' => $errorMessage,
        ];
    }

    public function sendMany(array $recipientEmails, string $subject, string $body, string $eventType): array
    {
        $results = [];
        foreach (array_unique(array_filter($recipientEmails)) as $recipientEmail) {
            $results[] = $this->send($recipientEmail, $subject, $body, $eventType);
        }

        return $results;
    }

    private function createTransport(): ?MailTransportInterface
    {
        $smtpHost = trim((string) (getenv('MAIL_SMTP_HOST') ?: ''));
        if ($smtpHost !== '') {
            return new SmtpMailTransport(
                $smtpHost,
                (int) (getenv('MAIL_SMTP_PORT') ?: 25),
                (string) (getenv('MAIL_SMTP_ENCRYPTION') ?: ''),
                (string) (getenv('MAIL_SMTP_USERNAME') ?: ''),
                (string) (getenv('MAIL_SMTP_PASSWORD') ?: ''),
                (int) (getenv('MAIL_SMTP_TIMEOUT') ?: 10),
                (string) (getenv('MAIL_EHLO_DOMAIN') ?: 'localhost')
            );
        }

        if (function_exists('mail')) {
            return new PhpMailTransport();
        }

        return null;
    }

    private function logNotification(
        string $recipientEmail,
        string $subject,
        string $body,
        string $eventType,
        string $status,
        ?string $errorMessage
    ): void {
        $stmt = $this->conn->prepare(
            'INSERT INTO email_notifications (recipient_email, subject, body, event_type, status, error_message)
             VALUES (:recipient_email, :subject, :body, :event_type, :status, :error_message)'
        );
        $stmt->execute([
            ':recipient_email' => $recipientEmail,
            ':subject' => $subject,
            ':body' => $body,
            ':event_type' => $eventType,
            ':status' => $status,
            ':error_message' => $errorMessage,
        ]);
    }
}
