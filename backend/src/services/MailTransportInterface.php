<?php

interface MailTransportInterface
{
    public function send(
        string $fromEmail,
        string $fromName,
        string $recipientEmail,
        string $subject,
        string $body
    ): void;
}
