const SOFIA_TIMEZONE = "Europe/Sofia";

export const parseServerDateTime = (value) => {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  const normalized = String(value).trim();
  if (!normalized) {
    return null;
  }

  const plainMatch = normalized.match(
    /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?$/
  );

  if (plainMatch) {
    const [, year, month, day, hour, minute, second = "00"] = plainMatch;
    return new Date(
      Number(year),
      Number(month) - 1,
      Number(day),
      Number(hour),
      Number(minute),
      Number(second)
    );
  }

  const dateOnlyMatch = normalized.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (dateOnlyMatch) {
    const [, year, month, day] = dateOnlyMatch;
    return new Date(Number(year), Number(month) - 1, Number(day));
  }

  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

export const formatDateTimeBg = (value, options = {}) => {
  const parsed = parseServerDateTime(value);
  if (!parsed) {
    return "";
  }

  return new Intl.DateTimeFormat("bg-BG", {
    timeZone: SOFIA_TIMEZONE,
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    ...options,
  }).format(parsed);
};

export const formatDateOnlyBg = (value, options = {}) => {
  const parsed = parseServerDateTime(value);
  if (!parsed || Number.isNaN(parsed.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("bg-BG", {
    timeZone: SOFIA_TIMEZONE,
    day: "numeric",
    month: "long",
    year: "numeric",
    ...options,
  }).format(parsed);
};

export const formatTimeBg = (value, options = {}) => {
  const parsed = parseServerDateTime(value);
  if (!parsed) {
    return "";
  }

  return new Intl.DateTimeFormat("bg-BG", {
    timeZone: SOFIA_TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    ...options,
  }).format(parsed);
};
