<?php

require_once __DIR__ . '/ApiException.php';
require_once __DIR__ . '/AppClock.php';
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
            throw new ApiException('Само ученици могат да променят своя статус.', 403);
        }

        $status = $payload['status'] ?? '';
        if (!in_array($status, ['enrolled', 'unenrolled'], true)) {
            throw new ApiException('Невалиден статус.', 400);
        }

        if ($this->userModel->hasPendingRequest($userId)) {
            throw new ApiException(
                'Имате чакаща заявка за отписване. Изчакайте решение от администратор или възпитател.',
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
            throw new ApiException('Моля, въведете точна локация при отписване.', 400);
        }

        if (!$this->userModel->updateStudentStatus($userId, $status, $location, $signature)) {
            throw new ApiException('Грешка при записване.', 500);
        }

        if ($status === 'unenrolled') {
            $this->notifier->send(
                $currentUser['email'],
                'Подадена заявка за отписване',
                "Заявката ви за отписване е подадена успешно.\n\n"
                    . "Локация: {$location}\n"
                    . 'Статус: очаква одобрение.',
                'unenroll_request_user'
            );

            $this->notifier->sendMany(
                $this->userModel->getStaffEmailsForDormitory($currentUser['dormitory'] ?? null),
                'Нова заявка за отписване',
                "Нова заявка за отписване.\n\n"
                    . "Ученик: {$currentUser['full_name']}\n"
                    . "Имейл: {$currentUser['email']}\n"
                    . "Общежитие: {$currentUser['dormitory']}\n"
                    . "Локация: {$location}",
                'unenroll_request_staff'
            );

            return [
                'message' => 'Заявката е изпратена. Изчаква одобрение от възпитател или администратор.',
            ];
        }

        $this->notifier->send(
            $currentUser['email'],
            'Потвърдено записване',
            "Статусът ви е променен успешно на \"Записан\".\n\nЧас: " . AppClock::formatBg(),
            'enrolled_user'
        );

        $this->notifier->sendMany(
            $this->userModel->getStaffEmailsForDormitory($currentUser['dormitory'] ?? null),
            'Ученикът се записа',
            "Ученик: {$currentUser['full_name']}\nИмейл: {$currentUser['email']}\nОбщежитие: {$currentUser['dormitory']}",
            'enrolled_staff'
        );

        return [
            'message' => 'Статусът е успешно актуализиран.',
        ];
    }

    public function reviewUnenrollmentRequest(
        int $staffUserId,
        int $statusId,
        string $decision,
        ?string $reviewSignature = null
    ): array {
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

        if (!$reviewSignature || !str_starts_with($reviewSignature, 'data:image/')) {
            throw new ApiException('Подписът на възпитателя или администратора е задължителен.', 400);
        }

        $approved = $decision === 'approve';
        $success = $approved
            ? $this->userModel->approveUnenrollment($statusId, $staffUserId, $reviewSignature)
            : $this->userModel->rejectUnenrollment($statusId, $staffUserId, $reviewSignature);

        if (!$success) {
            throw new ApiException('Грешка при обработка на заявката.', 500);
        }

        $reviewerLabel = $staffUser['role'] === 'admin' ? 'администратор' : 'възпитател';
        $studentSubject = $approved ? 'Одобрена заявка за отписване' : 'Отказана заявка за отписване';
        $studentBody = "Вашата заявка за отписване беше "
            . ($approved ? 'одобрена' : 'отказана')
            . ".\n\nЛокация: {$pendingRequest['location']}\n"
            . "Обработил: {$staffUser['full_name']} ({$reviewerLabel})\n"
            . 'Час: ' . AppClock::formatBg();

        $this->notifier->send(
            $pendingRequest['email'],
            $studentSubject,
            $studentBody,
            $approved ? 'approve_user' : 'reject_user'
        );

        $this->notifier->sendMany(
            $this->userModel->getStaffEmailsForDormitory($pendingRequest['student_dormitory'] ?? null),
            $approved ? 'Одобрено отписване' : 'Отказано отписване',
            ($staffUser['role'] === 'admin' ? 'Администратор' : 'Възпитател') . ": {$staffUser['full_name']} обработи заявка.\n\n"
                . "Ученик: {$pendingRequest['full_name']}\n"
                . "Имейл: {$pendingRequest['email']}\n"
                . "Локация: {$pendingRequest['location']}",
            $approved ? 'approve_staff' : 'reject_staff'
        );

        return [
            'message' => $approved ? 'Отписването е одобрено.' : 'Отписването е отказано.',
        ];
    }
}
