import React, { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { FaBell, FaSignOutAlt, FaUserCircle } from "react-icons/fa";
import { getNotificationFeed } from "../api/auth";
import { formatDateTimeBg } from "../utils/dateTime";

const SEEN_STORAGE_KEY = "notif_seen_ids";

const readSeenIds = () => {
  try {
    const raw = localStorage.getItem(SEEN_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const severityDot = (severity) => {
  if (severity === "warning") return "bg-amber-500";
  if (severity === "success") return "bg-green-500";
  return "bg-blue-500";
};

const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const token = localStorage.getItem("token");

  const [feed, setFeed] = useState([]);
  const [seenIds, setSeenIds] = useState(readSeenIds);
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/login");
  };

  const isActive = (path) => location.pathname === path;

  const loadFeed = useCallback(async () => {
    if (!token) {
      setFeed([]);
      return;
    }
    try {
      const data = await getNotificationFeed(token);
      setFeed(Array.isArray(data) ? data : []);
    } catch {
      setFeed([]);
    }
  }, [token]);

  // Refresh on navigation (and mount) so the badge reflects the latest state after actions.
  useEffect(() => {
    loadFeed();
  }, [loadFeed, location.pathname]);

  // Close the dropdown when clicking outside it.
  useEffect(() => {
    if (!open) return undefined;
    const onClick = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const unreadCount = feed.filter((item) => !seenIds.includes(item.id)).length;

  const toggleDropdown = () => {
    const next = !open;
    setOpen(next);
    if (next && feed.length > 0) {
      // Opening the center marks everything currently shown as seen.
      const ids = feed.map((item) => item.id);
      setSeenIds(ids);
      try {
        localStorage.setItem(SEEN_STORAGE_KEY, JSON.stringify(ids));
      } catch {
        /* ignore storage failures */
      }
    }
  };

  return (
    <nav className="bg-[#791c1c] shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="py-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Link to="/" className="flex items-center gap-3 min-w-0 group">
            <div className="w-9 h-9 rounded-full bg-white flex items-center justify-center shadow-sm group-hover:bg-red-50 transition-colors flex-shrink-0">
              <span className="text-[#791c1c] font-black text-lg leading-none select-none">У</span>
            </div>
            <div className="min-w-0">
              <div className="text-white font-bold text-base sm:text-lg leading-tight tracking-wider">УКТЦ</div>
              <div className="text-red-200 text-[10px] leading-tight uppercase tracking-[0.2em] sm:tracking-widest truncate">
                Система за присъствие
              </div>
            </div>
          </Link>

          {token ? (
            <div className="grid grid-cols-4 gap-2 sm:flex sm:flex-wrap sm:items-center sm:gap-2">
              <Link
                to="/"
                className={`px-3 py-2 rounded-lg text-center text-xs sm:text-sm font-medium transition-colors ${
                  isActive("/") || isActive("/home") || isActive("/admin")
                    ? "bg-white/20 text-white"
                    : "text-red-100 hover:bg-white/10 hover:text-white"
                }`}
              >
                Начало
              </Link>
              <Link
                to="/account"
                className={`px-3 py-2 rounded-lg text-center text-xs sm:text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                  isActive("/account")
                    ? "bg-white/20 text-white"
                    : "text-red-100 hover:bg-white/10 hover:text-white"
                }`}
              >
                <FaUserCircle size={14} />
                Акаунт
              </Link>

              <div className="relative flex justify-center" ref={dropdownRef}>
                <button
                  type="button"
                  onClick={toggleDropdown}
                  aria-label="Известия"
                  className="relative px-3 py-2 rounded-lg text-red-100 hover:bg-white/10 hover:text-white transition-colors flex items-center justify-center w-full sm:w-auto"
                >
                  <FaBell size={15} />
                  {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-amber-400 text-[#791c1c] text-[10px] font-bold flex items-center justify-center">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                </button>

                {open && (
                  <div className="absolute right-0 top-full mt-2 z-50 w-80 max-w-[90vw] rounded-2xl border border-slate-200 bg-white shadow-xl">
                    <div className="px-4 py-3 border-b border-slate-100">
                      <span className="text-sm font-semibold text-slate-900">Известия</span>
                    </div>
                    <div className="max-h-96 overflow-y-auto">
                      {feed.length === 0 ? (
                        <div className="px-4 py-8 text-center text-sm text-slate-400">
                          Няма нови известия.
                        </div>
                      ) : (
                        feed.map((item) => (
                          <div
                            key={item.id}
                            className="flex gap-3 px-4 py-3 border-b border-slate-50 last:border-b-0"
                          >
                            <span
                              className={`mt-1.5 h-2 w-2 flex-shrink-0 rounded-full ${severityDot(item.severity)}`}
                            />
                            <div className="min-w-0">
                              <div className="text-sm font-medium text-slate-800">{item.title}</div>
                              <div className="text-xs text-slate-500 break-words">{item.message}</div>
                              <div className="mt-0.5 text-[11px] text-slate-400">
                                {formatDateTimeBg(item.created_at, { month: "short" })}
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              <button
                onClick={handleLogout}
                className="px-3 py-2 bg-white text-[#791c1c] rounded-lg text-xs sm:text-sm font-semibold hover:bg-red-50 transition-colors flex items-center justify-center gap-2"
              >
                <FaSignOutAlt size={13} />
                Излез
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
              <Link
                to="/login"
                className="px-4 py-2 text-center text-red-100 hover:text-white text-sm font-medium transition-colors rounded-lg hover:bg-white/10"
              >
                Вход
              </Link>
              <Link
                to="/register"
                className="px-4 py-2 text-center bg-white text-[#791c1c] rounded-lg text-sm font-semibold hover:bg-red-50 transition-colors"
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
