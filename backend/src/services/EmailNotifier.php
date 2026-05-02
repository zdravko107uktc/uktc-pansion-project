<?php

class EmailNotifier
{
    private PDO $conn;
    private string $fromEmail;
    private string $fromName;
    private bool $logOnly;

    public function __construct(PDO $conn)
    {
        $this->conn = $conn;
        $this->fromEmail = getenv('MAIL_FROM') ?: 'school.inventory.bot@gmail.com';
        $this->fromName = getenv('MAIL_FROM_NAME') ?: 'school-inventory-management-system';
        $this->logOnly = filter_var(getenv('MAIL_FORCE_LOG_ONLY') ?: '0', FILTER_VALIDATE_BOOLEAN);
    }

    public function send(string $recipientEmail, string $subject, string $body, string $eventType): array
    {
        $status = 'logged';
        $errorMessage = $this->logOnly
            ? 'Email delivery is disabled because MAIL_FORCE_LOG_ONLY is enabled.'
            : null;

        if (!$this->logOnly) {
            if (!function_exists('mail')) {
                $status = 'failed';
                $errorMessage = 'PHP mail() is not available in this environment.';
                $this->logNotification($recipientEmail, $subject, $body, $eventType, $status, $errorMessage);

                return [
                    'recipient' => $recipientEmail,
                    'status' => $status,
                    'error' => $errorMessage,
                ];
            }

            $encodedSubject = '=?UTF-8?B?' . base64_encode($subject) . '?=';
            $headers = [
                'MIME-Version: 1.0',
                'Content-Type: text/plain; charset=UTF-8',
                'From: ' . $this->fromName . ' <' . $this->fromEmail . '>',
            ];

            try {
                $wasSent = mail($recipientEmail, $encodedSubject, $body, implode("\r\n", $headers));
                if ($wasSent) {
                    $status = 'sent';
                    $errorMessage = null;
                } else {
                    $status = 'failed';
                    $errorMessage = 'mail() returned false. The server likely has no SMTP/sendmail transport configured.';
                }
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
