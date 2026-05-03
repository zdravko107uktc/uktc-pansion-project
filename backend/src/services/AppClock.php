<?php

class AppClock
{
    public static function timezoneName(): string
    {
        return getenv('APP_TIMEZONE') ?: 'Europe/Sofia';
    }

    public static function timezone(): DateTimeZone
    {
        static $timezone = null;

        if ($timezone === null) {
            $timezone = new DateTimeZone(self::timezoneName());
        }

        return $timezone;
    }

    public static function configure(): void
    {
        date_default_timezone_set(self::timezone()->getName());
    }

    public static function now(): DateTimeImmutable
    {
        return new DateTimeImmutable('now', self::timezone());
    }

    public static function parse(?string $value): ?DateTimeImmutable
    {
        if ($value === null || trim($value) === '') {
            return null;
        }

        return new DateTimeImmutable($value, self::timezone());
    }

    public static function formatBg(DateTimeInterface|string|null $value = null): string
    {
        if ($value instanceof DateTimeInterface) {
            $date = DateTimeImmutable::createFromInterface($value);
        } elseif ($value === null || trim((string) $value) === '') {
            $date = self::now();
        } else {
            $date = self::parse((string) $value) ?? self::now();
        }

        return $date->setTimezone(self::timezone())->format('d.m.Y H:i');
    }

    public static function currentMysqlOffset(): string
    {
        $seconds = self::timezone()->getOffset(self::now());
        $sign = $seconds >= 0 ? '+' : '-';
        $seconds = abs($seconds);
        $hours = str_pad((string) floor($seconds / 3600), 2, '0', STR_PAD_LEFT);
        $minutes = str_pad((string) floor(($seconds % 3600) / 60), 2, '0', STR_PAD_LEFT);

        return "{$sign}{$hours}:{$minutes}";
    }
}
