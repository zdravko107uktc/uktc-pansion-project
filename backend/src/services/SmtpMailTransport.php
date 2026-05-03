<?php

require_once __DIR__ . '/MailTransportInterface.php';

class SmtpMailTransport implements MailTransportInterface
{
    private string $host;
    private int $port;
    private string $encryption;
    private string $username;
    private string $password;
    private int $timeout;
    private string $ehloDomain;

    public function __construct(
        string $host,
        int $port = 25,
        string $encryption = '',
        string $username = '',
        string $password = '',
        int $timeout = 10,
        string $ehloDomain = 'localhost'
    ) {
        $this->host = $host;
        $this->port = $port;
        $this->encryption = strtolower(trim($encryption));
        $this->username = $username;
        $this->password = $password;
        $this->timeout = $timeout;
        $this->ehloDomain = $ehloDomain;
    }

    public function send(
        string $fromEmail,
        string $fromName,
        string $recipientEmail,
        string $subject,
        string $body
    ): void {
        $socket = $this->openSocket();

        try {
            $this->expect($socket, [220]);
            $this->command($socket, 'EHLO ' . $this->ehloDomain, [250]);

            if ($this->encryption === 'tls') {
                $this->command($socket, 'STARTTLS', [220]);
                if (!stream_socket_enable_crypto($socket, true, STREAM_CRYPTO_METHOD_TLS_CLIENT)) {
                    throw new RuntimeException('Failed to start TLS encryption for SMTP transport.');
                }
                $this->command($socket, 'EHLO ' . $this->ehloDomain, [250]);
            }

            if ($this->username !== '') {
                $this->command($socket, 'AUTH LOGIN', [334]);
                $this->command($socket, base64_encode($this->username), [334]);
                $this->command($socket, base64_encode($this->password), [235]);
            }

            $this->command($socket, 'MAIL FROM:<' . $fromEmail . '>', [250]);
            $this->command($socket, 'RCPT TO:<' . $recipientEmail . '>', [250, 251]);
            $this->command($socket, 'DATA', [354]);

            $headers = [
                'Date: ' . date(DATE_RFC2822),
                'From: ' . $this->encodeDisplayName($fromName) . ' <' . $fromEmail . '>',
                'To: <' . $recipientEmail . '>',
                'Subject: ' . $this->encodeDisplayName($subject),
                'MIME-Version: 1.0',
                'Content-Type: text/plain; charset=UTF-8',
                'Content-Transfer-Encoding: 8bit',
            ];

            $message = implode("\r\n", $headers)
                . "\r\n\r\n"
                . $this->normalizeBody($body)
                . "\r\n.";

            $this->command($socket, $message, [250]);
            $this->command($socket, 'QUIT', [221]);
        } finally {
            fclose($socket);
        }
    }

    private function openSocket()
    {
        $protocol = $this->encryption === 'ssl' ? 'ssl://' : '';
        $socket = @stream_socket_client(
            $protocol . $this->host . ':' . $this->port,
            $errorCode,
            $errorMessage,
            $this->timeout
        );

        if (!$socket) {
            throw new RuntimeException("SMTP connection failed: {$errorMessage} ({$errorCode})");
        }

        stream_set_timeout($socket, $this->timeout);

        return $socket;
    }

    private function command($socket, string $command, array $expectedCodes): void
    {
        fwrite($socket, $command . "\r\n");
        $this->expect($socket, $expectedCodes);
    }

    private function expect($socket, array $expectedCodes): void
    {
        $response = '';

        while (($line = fgets($socket, 515)) !== false) {
            $response .= $line;

            if (isset($line[3]) && $line[3] === ' ') {
                break;
            }
        }

        if ($response === '') {
            throw new RuntimeException('SMTP server did not return a response.');
        }

        $code = (int) substr($response, 0, 3);
        if (!in_array($code, $expectedCodes, true)) {
            throw new RuntimeException('SMTP error: ' . trim($response));
        }
    }

    private function normalizeBody(string $body): string
    {
        $normalized = preg_replace("/\r\n|\r|\n/", "\r\n", $body) ?? $body;

        return preg_replace('/^\./m', '..', $normalized) ?? $normalized;
    }

    private function encodeDisplayName(string $value): string
    {
        return '=?UTF-8?B?' . base64_encode($value) . '?=';
    }
}
