import React, { useMemo, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { FaEye, FaEyeSlash, FaCheck, FaTimes, FaShieldAlt } from "react-icons/fa";
import { register, SYSTEM_ADMIN_EMAIL } from "../api/auth";
import {
  passwordPolicyChecks,
  passwordStrengthScore,
  validatePassword,
} from "../utils/passwordPolicy";

const getErrors = ({ name, email, password, confirmPassword, dormitory }) => {
  const errors = {};
  const trimmedName = name.trim();
  const trimmedEmail = email.trim().toLowerCase();
  const isAdminEmail = trimmedEmail === SYSTEM_ADMIN_EMAIL;

  if (!trimmedName) {
    errors.name = "Полето е задължително.";
  } else if (trimmedName.length < 3) {
    errors.name = "Поне 3 символа.";
  } else if (trimmedName.length > 100) {
    errors.name = "Максимум 100 символа.";
  } else if (!/^[\p{L}\s-]+$/u.test(trimmedName)) {
    errors.name = "Само букви, интервали и тирета.";
  } else if (trimmedName.split(/\s+/).filter(Boolean).length < 2) {
    errors.name = "Въведете собствено и фамилно име.";
  }

  if (!trimmedEmail) {
    errors.email = "Полето е задължително.";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(trimmedEmail)) {
    errors.email = "Невалиден имейл адрес.";
  }

  const passwordError = validatePassword(password);
  if (passwordError) {
    errors.password = passwordError;
  }

  if (!confirmPassword) {
    errors.confirmPassword = "Потвърдете паролата.";
  } else if (password !== confirmPassword) {
    errors.confirmPassword = "Паролите не съвпадат.";
  }

  if (!isAdminEmail && !["1", "2"].includes(dormitory)) {
    errors.dormitory = "Изберете общежитие.";
  }

  return errors;
};

const Register = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [dormitory, setDormitory] = useState("1");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [touched, setTouched] = useState({});
  const [serverError, setServerError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const normalizedEmail = email.trim().toLowerCase();
  const isAdminEmail = normalizedEmail === SYSTEM_ADMIN_EMAIL;
  const errors = useMemo(
    () => getErrors({ name, email, password, confirmPassword, dormitory }),
    [name, email, password, confirmPassword, dormitory]
  );

  const touch = (field) => setTouched((prev) => ({ ...prev, [field]: true }));
  const fieldError = (field) => touched[field] && errors[field];
  const fieldOk = (field) => touched[field] && !errors[field];

  const fieldClass = (field) =>
    `w-full px-4 py-3 border rounded-xl bg-white focus:outline-none focus:ring-2 transition text-sm ${
      fieldError(field)
        ? "border-red-400 focus:ring-red-200 focus:border-red-400"
        : fieldOk(field)
        ? "border-green-400 focus:ring-green-200 focus:border-green-400"
        : "border-slate-200 focus:ring-[#791c1c]/30 focus:border-[#791c1c]"
    }`;

  const handleRegister = async (event) => {
    event.preventDefault();
    setTouched({
      name: true,
      email: true,
      password: true,
      confirmPassword: true,
      dormitory: true,
    });

    if (Object.keys(errors).length > 0) return;

    setServerError("");
    setLoading(true);

    try {
      const data = await register(name.trim(), normalizedEmail, password, isAdminEmail ? null : dormitory);
      if (data?.token) {
        localStorage.setItem("token", data.token);
        navigate("/");
        return;
      }

      setServerError(data?.message || "Грешка при регистрация.");
    } catch {
      setServerError("Грешка при свързване със сървъра.");
    } finally {
      setLoading(false);
    }
  };

  const score = passwordStrengthScore(password);
  const strengthInfo =
    score <= 1
      ? { label: "Слаба", width: "w-1/4", color: "bg-red-400", text: "text-red-500" }
      : score <= 4
      ? { label: "Средна", width: "w-2/4", color: "bg-yellow-400", text: "text-yellow-600" }
      : { label: "Силна", width: "w-full", color: "bg-green-500", text: "text-green-600" };

  const passwordRequirements = passwordPolicyChecks(password);

  return (
    <div className="min-h-screen bg-[#791c1c] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-full bg-white mx-auto mb-4 flex items-center justify-center shadow-xl">
            <span className="text-[#791c1c] font-black text-3xl leading-none select-none">У</span>
          </div>
          <h1 className="text-white text-xl font-bold tracking-widest">УКТЦ</h1>
          <p className="text-red-200 text-xs uppercase tracking-widest mt-0.5">Система за присъствие</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-1">Създай акаунт</h2>
          <p className="text-gray-400 text-sm mb-6">
            Вече имаш акаунт?{" "}
            <Link to="/login" className="text-[#791c1c] font-semibold hover:underline">
              Влез тук
            </Link>
          </p>

          <div className="mb-5 rounded-2xl border border-red-100 bg-red-50 p-4">
            <div className="flex items-start gap-3">
              <div className="mt-1 flex h-9 w-9 items-center justify-center rounded-xl bg-white text-[#791c1c]">
                <FaShieldAlt size={14} />
              </div>
              <div className="text-sm text-slate-600">
                Роля не се избира ръчно. Само <span className="font-semibold">{SYSTEM_ADMIN_EMAIL}</span>{" "}
                получава администраторски права, а всички останали профили се създават като ученици.
              </div>
            </div>
          </div>

          <form onSubmit={handleRegister} noValidate className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-600 mb-1.5">Пълно име</label>
              <input
                type="text"
                placeholder="Иван Иванов"
                value={name}
                onChange={(event) => setName(event.target.value)}
                onBlur={() => touch("name")}
                className={fieldClass("name")}
              />
              {fieldError("name") && <FieldMsg type="error">{errors.name}</FieldMsg>}
              {fieldOk("name") && <FieldMsg type="ok">Изглежда добре</FieldMsg>}
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-600 mb-1.5">Имейл адрес</label>
              <input
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                onBlur={() => touch("email")}
                className={fieldClass("email")}
              />
              {fieldError("email") && <FieldMsg type="error">{errors.email}</FieldMsg>}
              {fieldOk("email") && <FieldMsg type="ok">Валиден адрес</FieldMsg>}
              {isAdminEmail && <FieldMsg type="ok">Този имейл ще бъде регистриран като администратор.</FieldMsg>}
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-600 mb-1.5">Парола</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  onBlur={() => touch("password")}
                  className={`${fieldClass("password")} pr-11`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  tabIndex={-1}
                >
                  {showPassword ? <FaEyeSlash size={16} /> : <FaEye size={16} />}
                </button>
              </div>

              {password && (
                <div className="mt-2">
                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${strengthInfo.width} ${strengthInfo.color}`}
                    />
                  </div>
                  <p className="text-xs mt-1 text-slate-400">
                    Сила: <span className={strengthInfo.text}>{strengthInfo.label}</span>
                  </p>
                </div>
              )}

              {(touched.password || password) && (
                <ul className="mt-2 space-y-0.5">
                  {passwordRequirements.map(({ label, ok }) => (
                    <li
                      key={label}
                      className={`text-xs flex items-center gap-1.5 ${ok ? "text-green-600" : "text-slate-400"}`}
                    >
                      {ok ? <FaCheck size={9} /> : <span className="inline-block w-2 h-2 rounded-full border border-slate-300" />}
                      {label}
                    </li>
                  ))}
                </ul>
              )}

              {fieldError("password") && <FieldMsg type="error">{errors.password}</FieldMsg>}
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-600 mb-1.5">Потвърди паролата</label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  onBlur={() => touch("confirmPassword")}
                  className={`${fieldClass("confirmPassword")} pr-11`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  tabIndex={-1}
                >
                  {showConfirmPassword ? <FaEyeSlash size={16} /> : <FaEye size={16} />}
                </button>
              </div>
              {fieldError("confirmPassword") && <FieldMsg type="error">{errors.confirmPassword}</FieldMsg>}
              {fieldOk("confirmPassword") && <FieldMsg type="ok">Паролите съвпадат</FieldMsg>}
            </div>

            {!isAdminEmail && (
              <div>
                <label className="block text-sm font-semibold text-gray-600 mb-2">Общежитие</label>
                <div className="grid grid-cols-2 gap-2">
                  {["1", "2"].map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => {
                        setDormitory(value);
                        touch("dormitory");
                      }}
                      className={`py-3 px-4 rounded-xl border-2 font-semibold text-sm transition-all ${
                        dormitory === value
                          ? "border-[#791c1c] bg-red-50 text-[#791c1c]"
                          : "border-slate-200 text-gray-600 hover:border-slate-300"
                      }`}
                    >
                      Общежитие {value}
                    </button>
                  ))}
                </div>
                {fieldError("dormitory") && <FieldMsg type="error">{errors.dormitory}</FieldMsg>}
              </div>
            )}

            {serverError && (
              <div className="bg-red-50 border border-red-100 rounded-xl p-3.5 text-red-600 text-sm flex items-center gap-2">
                <FaTimes size={12} /> {serverError}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-[#791c1c] text-white font-semibold rounded-xl hover:bg-[#6b1818] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm mt-2"
            >
              {loading ? "Регистриране..." : "Създай акаунт →"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

const FieldMsg = ({ type, children }) => (
  <p className={`text-xs mt-1 flex items-center gap-1 ${type === "error" ? "text-red-500" : "text-green-600"}`}>
    {type === "error" ? <FaTimes size={9} /> : <FaCheck size={9} />}
    {children}
  </p>
);

export default Register;
