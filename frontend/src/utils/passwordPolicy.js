export const PASSWORD_MIN_LENGTH = 10;
export const PASSWORD_MAX_LENGTH = 72;

export const passwordPolicyChecks = (password = "") => [
  { key: "length", label: `Поне ${PASSWORD_MIN_LENGTH} символа`, ok: password.length >= PASSWORD_MIN_LENGTH },
  { key: "upper", label: "Главна буква (A-Z)", ok: /[A-Z]/.test(password) },
  { key: "lower", label: "Малка буква (a-z)", ok: /[a-z]/.test(password) },
  { key: "digit", label: "Цифра (0-9)", ok: /[0-9]/.test(password) },
  { key: "special", label: "Специален символ", ok: /[^A-Za-z0-9]/.test(password) },
  { key: "spaces", label: "Без интервали", ok: password !== "" && !/\s/.test(password) },
];

export const passwordStrengthScore = (password = "") =>
  passwordPolicyChecks(password).filter((check) => check.ok).length;

export const validatePassword = (password = "") => {
  if (!password) {
    return "Полето е задължително.";
  }

  if (password.length < PASSWORD_MIN_LENGTH) {
    return `Паролата трябва да е поне ${PASSWORD_MIN_LENGTH} символа.`;
  }

  if (password.length > PASSWORD_MAX_LENGTH) {
    return `Паролата не може да е повече от ${PASSWORD_MAX_LENGTH} символа.`;
  }

  if (!/[A-Z]/.test(password)) {
    return "Добавете поне една главна буква.";
  }

  if (!/[a-z]/.test(password)) {
    return "Добавете поне една малка буква.";
  }

  if (!/[0-9]/.test(password)) {
    return "Добавете поне една цифра.";
  }

  if (!/[^A-Za-z0-9]/.test(password)) {
    return "Добавете поне един специален символ.";
  }

  if (/\s/.test(password)) {
    return "Паролата не може да съдържа интервали.";
  }

  return "";
};
