import React, { useState } from "react";
import { Link } from "react-router-dom";
import { requestPasswordReset } from "../api/auth";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState({ text: "", type: "" });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setMessage({ text: "", type: "" });

    try {
      const data = await requestPasswordReset(email.trim());
      setMessage({
        text: data?.message || "Ако съществува акаунт с този имейл, изпратихме линк за смяна на паролата.",
        type: "success",
      });
    } catch (error) {
      setMessage({
        text: error?.data?.message || "Грешка при изпращане на заявката.",
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
          <h1 className="text-2xl font-bold text-gray-900">Забравена парола</h1>
          <p className="text-sm text-slate-400 mt-1">
            Въведете имейла си и ще ви изпратим линк за задаване на нова парола.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-600 mb-1.5">Имейл адрес</label>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              placeholder="your@email.com"
              className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#791c1c]/30 focus:border-[#791c1c] transition"
            />
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
            {loading ? "Изпращане..." : "Изпрати линк"}
          </button>
        </form>

        <p className="text-center text-sm text-slate-400 mt-6">
          <Link to="/login" className="text-[#791c1c] font-semibold hover:underline">
            Назад към вход
          </Link>
        </p>
      </div>
    </div>
  );
};

export default ForgotPassword;
