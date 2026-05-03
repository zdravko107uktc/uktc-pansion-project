<?php

class ApiException extends RuntimeException
{
    private int $statusCode;
    private array $payload;

    public function __construct(string $message, int $statusCode = 400, array $payload = [])
    {
        parent::__construct($message);
        $this->statusCode = $statusCode;
        $this->payload = $payload ?: ['message' => $message];
    }

    public function getStatusCode(): int
    {
        return $this->statusCode;
    }

    public function getPayload(): array
    {
        return $this->payload;
    }
}
