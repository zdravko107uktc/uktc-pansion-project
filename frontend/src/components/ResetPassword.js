import React, { useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { resetPassword } from "../api/auth";
import { passwordPolicyChecks, validatePassword } from "../utils/passwordPolicy";

const getPasswordErrors = (password, confirmPassword) => {
  const errors = {};

  const passwordError = validatePassword(password);
  if (passwordError) {
    errors.password = passwordError;
  }

  if (!confirmPassword) {
    errors.confirmPassword = "Потвърдете паролата.";
  } else if (password !== confirmPassword) {
    errors.confirmPassword = "Паролите не съвпадат.";
  }

  return errors;
};

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token") || "";
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [touched, setTouched] = useState({});
  const [message, setMessage] = useState({ text: "", type: "" });
  const [loading, setLoading] = useState(false);

  const errors = useMemo(() => getPasswordErrors(password, confirmPassword), [password, confirmPassword]);
  const passwordRequirements = useMemo(() => passwordPolicyChecks(password), [password]);
  const fieldError = (field) => touched[field] && errors[field];

  const handleSubmit = async (event) => {
    event.preventDefault();
    setTouched({ password: true, confirmPassword: true });

    if (!token) {
      setMessage({ text: "Липсва токен за смяна на парола.", type: "error" });
      return;
    }

    if (Object.keys(errors).length > 0) {
      return;
    }

    setLoading(true);
    setMessage({ text: "", type: "" });

    try {
      const data = await resetPassword(token, password);
      if (data?.message) {
        setMessage({ text: data.message, type: "success" });
        setTimeout(() => navigate("/login"), 1200);
      } else {
        setMessage({ text: "Неуспешна смяна на паролата.", type: "error" });
      }
    } catch (error) {
      setMessage({
        text: error?.data?.message || "Грешка при смяна на паролата.",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Нова парола</h1>
          <p className="text-sm text-slate-400 mt-1">Задайте нова парола за профила си.</p>
        </div>

        {!token ? (
          <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">
            Линкът е невалиден. Поискайте нов имейл за смяна на паролата.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-600 mb-1.5">Нова парола</label>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                onBlur={() => setTouched((prev) => ({ ...prev, password: true }))}
                className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#791c1c]/30 focus:border-[#791c1c] transition"
              />
              {fieldError("password") && <p className="text-xs text-red-500 mt-1">{errors.password}</p>}
              {(touched.password || password) && (
                <ul className="mt-2 space-y-0.5">
                  {passwordRequirements.map(({ key, label, ok }) => (
                    <li key={key} className={`text-xs ${ok ? "text-green-600" : "text-slate-400"}`}>
                      {ok ? "• " : "○ "} {label}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-600 mb-1.5">Потвърди паролата</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                onBlur={() => setTouched((prev) => ({ ...prev, confirmPassword: true }))}
                className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#791c1c]/30 focus:border-[#791c1c] transition"
              />
              {fieldError("confirmPassword") && <p className="text-xs text-red-500 mt-1">{errors.confirmPassword}</p>}
            </div>

            {message.text && (
              <div
                className={`rounded-xl border px-4 py-3 text-sm ${
                  message.type === "success"
                    ? "bg-green-50 border-green-100 text-green-700"
                    : "bg-red-50 border-red-100 text-red-600"
                }`}
              >
                {message.text}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-[#791c1c] text-white font-semibold rounded-xl hover:bg-[#6b1818] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
            >
              {loading ? "Запазване..." : "Запази новата парола"}
            </button>
          </form>
        )}

        <p className="text-center text-sm text-slate-400 mt-6">
          <Link to="/login" className="text-[#791c1c] font-semibold hover:underline">
            Обратно към вход
          </Link>
        </p>
      </div>
    </div>
  );
};

export default ResetPassword;
