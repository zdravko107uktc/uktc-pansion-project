<?php

const SYSTEM_ADMIN_EMAIL = 'zdravko.h.anev@gmail.com';

function normalizeSystemEmail(?string $email): string
{
    return mb_strtolower(trim((string) $email));
}

function isSystemAdminEmail(?string $email): bool
{
    return normalizeSystemEmail($email) === SYSTEM_ADMIN_EMAIL;
}

function getSystemRoleForEmail(?string $email): string
{
    return isSystemAdminEmail($email) ? 'admin' : 'student';
}

function normalizeManagedRole(?string $role, ?string $email = null): string
{
    if (isSystemAdminEmail($email)) {
        return 'admin';
    }

    return in_array($role, ['student', 'counselor'], true) ? $role : 'student';
}
