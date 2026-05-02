import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { register } from "../api/auth";

const ROLES = [
  { value: "student",   label: "Ученик",         icon: "🎓", desc: "Записвай и отписвай присъствие" },
  { value: "counselor", label: "Възпитател",      icon: "🧑‍🏫", desc: "Преглед и одобрение на отписвания" },
  { value: "admin",     label: "Администратор",   icon: "🛡️", desc: "Пълен достъп и управление" },
];

const Register = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("student");
  const [dormitory, setDormitory] = useState("1");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    setError("");
    if (role === "student" && !dormitory) {
      setError("Моля, изберете общежитие.");
      return;
    }
    setLoading(true);
    try {
      const data = await register(
        name, email, password, role,
        role === "student" ? dormitory : null
      );
      if (data.token) {
        localStorage.setItem("token", data.token);
        navigate("/");
      } else {
        setError(data.message || "Грешка при регистрация.");
      }
    } catch {
      setError("Грешка при свързване със сървъра.");
    } finally {
      setLoading(false);
    }
  };

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

          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-600 mb-1.5">Пълно име</label>
              <input
                type="text"
                placeholder="Иван Иванов"
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#791c1c]/30 focus:border-[#791c1c] transition"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-600 mb-1.5">Имейл адрес</label>
              <input
                type="email"
                placeholder="your@email.com"
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#791c1c]/30 focus:border-[#791c1c] transition"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-600 mb-1.5">Парола</label>
              <input
                type="password"
                placeholder="••••••••"
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#791c1c]/30 focus:border-[#791c1c] transition"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-600 mb-2">Роля</label>
              <div className="grid grid-cols-3 gap-2">
                {ROLES.map(({ value, label, icon, desc }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setRole(value)}
                    className={`p-3 rounded-xl border-2 text-left transition-all ${
                      role === value
                        ? "border-[#791c1c] bg-red-50"
                        : "border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    <div className="text-xl mb-1">{icon}</div>
                    <div className={`text-xs font-semibold leading-tight ${role === value ? "text-[#791c1c]" : "text-gray-700"}`}>
                      {label}
                    </div>
                    <div className="text-[10px] text-gray-400 mt-0.5 leading-tight">{desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Dormitory selection for students */}
            {role === "student" && (
              <div>
                <label className="block text-sm font-semibold text-gray-600 mb-2">Общежитие</label>
                <div className="grid grid-cols-2 gap-2">
                  {["1", "2"].map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setDormitory(d)}
                      className={`py-3 px-4 rounded-xl border-2 font-semibold text-sm transition-all ${
                        dormitory === d
                          ? "border-[#791c1c] bg-red-50 text-[#791c1c]"
                          : "border-slate-200 text-gray-600 hover:border-slate-300"
                      }`}
                    >
                      Общежитие {d}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-100 rounded-xl p-3.5 text-red-600 text-sm flex items-center gap-2">
                <span>⚠</span> {error}
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

export default Register;
