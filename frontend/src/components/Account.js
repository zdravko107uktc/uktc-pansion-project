import React, { useEffect, useState } from "react";
import { getUserInfo } from "../api/auth";
import { useNavigate } from "react-router-dom";
import { FaEnvelope, FaCalendarAlt, FaShieldAlt, FaUserGraduate } from "react-icons/fa";

const Account = () => {
  const [user, setUser] = useState(null);
  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  useEffect(() => {
    if (!token) { navigate("/login"); return; }
    getUserInfo(token).then((data) => {
      if (data.user) setUser(data.user);
      else { localStorage.removeItem("token"); navigate("/login"); }
    });
  }, [token, navigate]);

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-slate-400 text-sm">Зареждане...</div>
      </div>
    );
  }

  const initial = user.full_name?.charAt(0)?.toUpperCase() || "?";
  const isAdmin = user.role === "admin";

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-lg mx-auto px-4 py-8">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {/* Red header banner */}
          <div className="bg-[#791c1c] h-32 relative">
            <div className="absolute inset-0 opacity-10 overflow-hidden">
              <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full bg-white" />
              <div className="absolute -bottom-4 -left-4 w-24 h-24 rounded-full bg-white" />
            </div>
          </div>

          <div className="px-6 pb-6">
            {/* Avatar + role badge */}
            <div className="-mt-10 mb-4 flex items-end justify-between">
              <div className="w-20 h-20 rounded-2xl bg-white border-4 border-white shadow-lg flex items-center justify-center text-[#791c1c] font-black text-3xl select-none">
                {initial}
              </div>
              <span className={`mb-1 px-3 py-1 rounded-full text-xs font-semibold ${
                isAdmin
                  ? "bg-red-100 text-[#791c1c]"
                  : "bg-blue-100 text-blue-700"
              }`}>
                {isAdmin ? "Администратор" : "Студент"}
              </span>
            </div>

            <h2 className="text-xl font-bold text-gray-900 mb-0.5">{user.full_name}</h2>
            <p className="text-gray-400 text-sm mb-6">{user.email}</p>

            <div className="space-y-1 border-t border-slate-100 pt-5">
              <InfoRow
                icon={<FaEnvelope size={13} />}
                label="Имейл адрес"
                value={user.email}
              />
              <InfoRow
                icon={isAdmin ? <FaShieldAlt size={13} /> : <FaUserGraduate size={13} />}
                label="Роля в системата"
                value={isAdmin ? "Администратор" : "Студент"}
              />
              <InfoRow
                icon={<FaCalendarAlt size={13} />}
                label="Дата на регистрация"
                value={new Date(user.created_at).toLocaleDateString("bg-BG", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              />
            </div>
          </div>
        </div>

        <button
          onClick={() => navigate(-1)}
          className="mt-4 w-full py-3 text-sm font-medium text-slate-500 hover:text-slate-700 transition-colors"
        >
          ← Назад
        </button>
      </div>
    </div>
  );
};

const InfoRow = ({ icon, label, value }) => (
  <div className="flex items-center gap-3 py-3 border-b border-slate-50 last:border-0">
    <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 flex-shrink-0">
      {icon}
    </div>
    <div className="min-w-0">
      <p className="text-xs text-gray-400 leading-none mb-0.5">{label}</p>
      <p className="text-sm font-medium text-gray-800 truncate">{value}</p>
    </div>
  </div>
);

export default Account;
