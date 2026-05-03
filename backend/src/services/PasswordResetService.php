<?php

require_once __DIR__ . '/ApiException.php';
require_once __DIR__ . '/EmailNotifier.php';
require_once __DIR__ . '/../models/User.php';

class PasswordResetService
{
    private User $userModel;
    private EmailNotifier $notifier;
    private string $frontendBaseUrl;
    private int $tokenLifetimeMinutes;

    public function __construct(User $userModel, EmailNotifier $notifier)
    {
        $this->userModel = $userModel;
        $this->notifier = $notifier;
        $this->frontendBaseUrl = rtrim(getenv('FRONTEND_BASE_URL') ?: 'http://localhost:8080', '/');
        $this->tokenLifetimeMinutes = (int) (getenv('PASSWORD_RESET_TOKEN_MINUTES') ?: 30);
    }

    public function requestReset(string $email): array
    {
        $genericMessage = 'Ако съществува акаунт с този имейл, изпратихме линк за смяна на паролата.';
        $user = $this->userModel->getUserByEmail($email);

        if (!$user) {
            return ['message' => $genericMessage];
        }

        $rawToken = bin2hex(random_bytes(32));
        $tokenHash = hash('sha256', $rawToken);
        $expiresAt = (new DateTimeImmutable())
            ->modify('+' . max(5, $this->tokenLifetimeMinutes) . ' minutes')
            ->format('Y-m-d H:i:s');

        $this->userModel->invalidatePasswordResetTokens((int) $user['id']);
        $this->userModel->createPasswordResetToken((int) $user['id'], $tokenHash, $expiresAt);

        $resetUrl = $this->frontendBaseUrl . '/reset-password?token=' . urlencode($rawToken);
        $body = "Здравейте, {$user['full_name']},\n\n"
            . "Получихме заявка за смяна на паролата ви в UKTC TESSIS.\n"
            . "Използвайте този линк в следващите {$this->tokenLifetimeMinutes} минути:\n{$resetUrl}\n\n"
            . "Ако не сте поискали смяна, просто игнорирайте това писмо.";

        $this->notifier->send($user['email'], 'Смяна на парола в UKTC TESSIS', $body, 'password_reset_request');

        return ['message' => $genericMessage];
    }

    public function resetPassword(string $token, string $newPassword): array
    {
        if (trim($token) === '') {
            throw new ApiException('Липсва токен за смяна на парола.', 400);
        }

        $tokenHash = hash('sha256', $token);
        $tokenRecord = $this->userModel->getActivePasswordResetToken($tokenHash);
        if (!$tokenRecord) {
            throw new ApiException('Линкът за смяна на парола е невалиден или е изтекъл.', 400);
        }

        if (!$this->userModel->updatePassword((int) $tokenRecord['user_id'], $newPassword)) {
            throw new ApiException('Неуспешна смяна на паролата.', 500);
        }

        $this->userModel->markPasswordResetTokenUsed((int) $tokenRecord['id']);
        $this->userModel->invalidatePasswordResetTokens((int) $tokenRecord['user_id']);

        $user = $this->userModel->getUserById((int) $tokenRecord['user_id']);
        if ($user) {
            $body = "Здравейте, {$user['full_name']},\n\n"
                . 'Паролата ви за UKTC TESSIS беше сменена успешно на ' . date('d.m.Y H:i') . ".\n\n"
                . 'Ако това не сте били вие, свържете се с администратор веднага.';
            $this->notifier->send($user['email'], 'Паролата ви беше сменена', $body, 'password_reset_success');
        }

        return ['message' => 'Паролата беше сменена успешно.'];
    }
}
