<?php

require_once __DIR__ . '/MailTransportInterface.php';

class PhpMailTransport implements MailTransportInterface
{
    public function send(
        string $fromEmail,
        string $fromName,
        string $recipientEmail,
        string $subject,
        string $body
    ): void {
        if (!function_exists('mail')) {
            throw new RuntimeException('PHP mail() is not available in this environment.');
        }

        $encodedSubject = '=?UTF-8?B?' . base64_encode($subject) . '?=';
        $headers = [
            'MIME-Version: 1.0',
            'Content-Type: text/plain; charset=UTF-8',
            'From: ' . $this->encodeDisplayName($fromName) . ' <' . $fromEmail . '>',
        ];

        $wasSent = mail($recipientEmail, $encodedSubject, $body, implode("\r\n", $headers));
        if (!$wasSent) {
            throw new RuntimeException('mail() returned false. The server likely has no SMTP/sendmail transport configured.');
        }
    }

    private function encodeDisplayName(string $value): string
    {
        return '=?UTF-8?B?' . base64_encode($value) . '?=';
    }
}
