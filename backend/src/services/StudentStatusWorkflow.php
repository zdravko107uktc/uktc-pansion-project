<?php

require_once __DIR__ . '/ApiException.php';
require_once __DIR__ . '/EmailNotifier.php';
require_once __DIR__ . '/../models/User.php';

class StudentStatusWorkflow
{
    private User $userModel;
    private EmailNotifier $notifier;

    public function __construct(User $userModel, EmailNotifier $notifier)
    {
        $this->userModel = $userModel;
        $this->notifier = $notifier;
    }

    public function submitStatusChange(int $userId, array $payload): array
    {
        $currentUser = $this->userModel->ensureSystemRoleById($userId);
        if (!$currentUser || $currentUser['role'] !== 'student') {
            throw new ApiException('Само студенти могат да променят своя статус.', 403);
        }

        $status = $payload['status'] ?? '';
        if (!in_array($status, ['enrolled', 'unenrolled'], true)) {
            throw new ApiException('Невалиден статус.', 400);
        }

        if ($this->userModel->hasPendingRequest($userId)) {
            throw new ApiException(
                'Имате чакаща заявка за отписване. Изчакайте администраторско решение.',
                400
            );
        }

        $lastStatus = $this->userModel->getLastStatus($userId);
        if ($lastStatus === $status) {
            throw new ApiException(
                $status === 'enrolled' ? 'Вече сте записани.' : 'Вече сте отписани.',
                400
            );
        }

        $location = $status === 'unenrolled' ? trim($payload['location'] ?? '') : null;
        $signature = $status === 'unenrolled' ? ($payload['signature'] ?? null) : null;
        if ($status === 'unenrolled' && $location === '') {
            throw new ApiException('Моля, въведете локация при отписване.', 400);
        }

        if (!$this->userModel->updateStudentStatus($userId, $status, $location, $signature)) {
            throw new ApiException('Грешка при записване.', 500);
        }

        if ($status === 'unenrolled') {
            $userBody = "Заявката ви за отписване е подадена успешно.\n\nЛокация: {$location}\nСтатус: очаква одобрение.";
            $this->notifier->send($currentUser['email'], 'Подадена заявка за отписване', $userBody, 'unenroll_request_user');

            $adminBody = "Нова заявка за отписване.\n\n"
                . "Студент: {$currentUser['full_name']}\nИмейл: {$currentUser['email']}\n"
                . "Общежитие: {$currentUser['dormitory']}\nЛокация: {$location}";
            $this->sendAdminNotification('Нова заявка за отписване', $adminBody, 'unenroll_request_admin');

            return ['message' => 'Заявката е изпратена. Изчаква одобрение от администратора.'];
        }

        $this->notifier->send(
            $currentUser['email'],
            'Потвърдено записване',
            "Статусът ви е променен успешно на \"Записан\".\n\nЧас: " . date('d.m.Y H:i'),
            'enrolled_user'
        );
        $this->sendAdminNotification(
            'Студент се записа',
            "Студент: {$currentUser['full_name']}\nИмейл: {$currentUser['email']}\nОбщежитие: {$currentUser['dormitory']}",
            'enrolled_admin'
        );

        return ['message' => 'Статусът е успешно актуализиран.'];
    }

    public function reviewUnenrollmentRequest(int $staffUserId, int $statusId, string $decision): array
    {
        $staffUser = $this->userModel->ensureSystemRoleById($staffUserId);
        if (!$staffUser || !in_array($staffUser['role'], ['admin', 'counselor'], true)) {
            throw new ApiException('Само администратор или възпитател има достъп до това действие.', 403);
        }

        if ($statusId <= 0) {
            throw new ApiException('Липсва statusId.', 400);
        }

        $pendingRequest = $this->userModel->getPendingRequestById($statusId);
        if (!$pendingRequest || $pendingRequest['approval_status'] !== 'pending') {
            throw new ApiException('Заявката не е намерена или вече е обработена.', 404);
        }

        if ($staffUser['role'] === 'counselor' && $staffUser['dormitory'] !== $pendingRequest['student_dormitory']) {
            throw new ApiException('Нямате достъп до заявки от друго общежитие.', 403);
        }

        $approved = $decision === 'approve';
        $success = $approved
            ? $this->userModel->approveUnenrollment($statusId, $staffUserId)
            : $this->userModel->rejectUnenrollment($statusId, $staffUserId);

        if (!$success) {
            throw new ApiException('Грешка при обработка на заявката. ', 500);
        }

        $studentSubject = $approved ? 'Одобрена заявка за отписване' : 'Отказана заявка за отписване';
        $studentBody = "Вашата заявка за отписване беше "
            . ($approved ? 'одобрена' : 'отказана')
            . ".\n\nЛокация: {$pendingRequest['location']}\nЧас: " . date('d.m.Y H:i');
        $this->notifier->send(
            $pendingRequest['email'],
            $studentSubject,
            $studentBody,
            $approved ? 'approve_user' : 'reject_user'
        );

        $this->sendAdminNotification(
            $approved ? 'Одобрено отписване' : 'Отказано отписване',
            "Администраторът {$staffUser['full_name']} обработи заявка.\n\nСтудент: {$pendingRequest['full_name']}\nИмейл: {$pendingRequest['email']}",
            $approved ? 'approve_admin' : 'reject_admin'
        );

        return [
            'message' => $approved ? 'Отписването е одобрено.' : 'Отписването е отказано.',
        ];
    }

    private function sendAdminNotification(string $subject, string $body, string $eventType): void
    {
        $this->notifier->send(systemAdminEmail(), $subject, $body, $eventType);
    }
}
