import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import { login, API_BASE } from "../api/auth";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await login(email, password);
      if (data?.token) {
        localStorage.setItem("token", data.token);
        const res = await fetch(`${API_BASE}/user`, {
          headers: { Authorization: `Bearer ${data.token}`, Accept: "application/json" },
        });
        const result = await res.json();
        if (res.ok && result.user) {
          navigate(result.user.role === "student" ? "/home" : "/admin");
        } else {
          setError("Неуспешно извличане на потребителска информация.");
        }
      } else {
        setError(data?.message || "Грешен email или парола.");
      }
    } catch {
      setError("Грешка при свързване със сървъра.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex lg:w-1/2 bg-[#791c1c] flex-col justify-center items-center p-12 relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.07]">
          <div className="absolute top-[-20%] left-[-20%] w-[600px] h-[600px] rounded-full bg-white" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[400px] h-[400px] rounded-full bg-white" />
          <div className="absolute top-[40%] right-[-5%] w-[200px] h-[200px] rounded-full bg-white" />
        </div>
        <div className="relative z-10 text-center">
          <div className="w-24 h-24 rounded-full bg-white mx-auto mb-6 flex items-center justify-center shadow-2xl">
            <span className="text-[#791c1c] font-black text-5xl leading-none select-none">У</span>
          </div>
          <h1 className="text-white text-4xl font-black tracking-widest mb-2">УКТЦ</h1>
          <p className="text-red-200 text-sm uppercase tracking-widest mb-10">Система за присъствие</p>
        </div>
      </div>

      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-slate-50">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-3 mb-10">
            <div className="w-10 h-10 rounded-full bg-[#791c1c] flex items-center justify-center">
              <span className="text-white font-black text-xl">У</span>
            </div>
            <div>
              <div className="font-bold text-gray-900 tracking-wide">УКТЦ</div>
              <div className="text-gray-400 text-xs uppercase tracking-widest">Система за присъствие</div>
            </div>
          </div>

          <h2 className="text-3xl font-bold text-gray-900 mb-1">Добре дошли</h2>
          <p className="text-gray-400 mb-8 text-sm">Въведете данните за вашия акаунт</p>

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-gray-600 mb-1.5">Имейл адрес</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="your@email.com"
                className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#791c1c]/30 focus:border-[#791c1c] transition"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-600 mb-1.5">Парола</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="w-full px-4 py-3 pr-11 border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#791c1c]/30 focus:border-[#791c1c] transition"
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
            </div>

            {error && (
              <div className="bg-red-50 border border-red-100 rounded-xl p-3.5 text-red-600 text-sm flex items-center gap-2.5">
                <span className="text-base">⚠</span>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-[#791c1c] text-white font-semibold rounded-xl hover:bg-[#6b1818] active:scale-[0.99] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
            >
              {loading ? "Влизане..." : "Вход в системата"}
            </button>
          </form>

          <p className="text-center text-gray-400 text-sm mt-8">
            Нямаш акаунт?{" "}
            <Link to="/register" className="text-[#791c1c] font-semibold hover:underline">
              Регистрирай се
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
