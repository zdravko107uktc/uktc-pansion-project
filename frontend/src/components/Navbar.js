import React from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { FaSignOutAlt, FaUserCircle } from "react-icons/fa";

const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const token = localStorage.getItem("token");

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/login");
  };

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="bg-[#791c1c] shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-9 h-9 rounded-full bg-white flex items-center justify-center shadow-sm group-hover:bg-red-50 transition-colors">
              <span className="text-[#791c1c] font-black text-lg leading-none select-none">У</span>
            </div>
            <div>
              <div className="text-white font-bold text-lg leading-tight tracking-wider">УКТЦ</div>
              <div className="text-red-200 text-[10px] leading-tight uppercase tracking-widest">Система за присъствие</div>
            </div>
          </Link>

          {token ? (
            <div className="flex items-center gap-1">
              <Link
                to="/"
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive("/") || isActive("/home") || isActive("/admin")
                    ? "bg-white/20 text-white"
                    : "text-red-100 hover:bg-white/10 hover:text-white"
                }`}
              >
                Начало
              </Link>
              <Link
                to="/account"
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                  isActive("/account")
                    ? "bg-white/20 text-white"
                    : "text-red-100 hover:bg-white/10 hover:text-white"
                }`}
              >
                <FaUserCircle size={14} />
                Акаунт
              </Link>
              <button
                onClick={handleLogout}
                className="ml-2 px-4 py-2 bg-white text-[#791c1c] rounded-lg text-sm font-semibold hover:bg-red-50 transition-colors flex items-center gap-2"
              >
                <FaSignOutAlt size={13} />
                Излез
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                to="/login"
                className="px-4 py-2 text-red-100 hover:text-white text-sm font-medium transition-colors rounded-lg hover:bg-white/10"
              >
                Вход
              </Link>
              <Link
                to="/register"
                className="px-4 py-2 bg-white text-[#791c1c] rounded-lg text-sm font-semibold hover:bg-red-50 transition-colors"
              >
                Регистрация
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
