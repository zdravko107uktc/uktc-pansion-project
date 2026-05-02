import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaMapMarkerAlt, FaCheckCircle, FaTimesCircle, FaClock, FaPenNib } from "react-icons/fa";
import { API_BASE, getCalendarData } from "../api/auth";
import SignaturePad from "./SignaturePad";
import CalendarPanel from "./CalendarPanel";

const currentMonthValue = () => {
  const now = new Date();
  return `${now.getFullYear()}-${`${now.getMonth() + 1}`.padStart(2, "0")}`;
};

const locationOptions = [
  "София",
  "Варна",
  "Пловдив",
  "Бургас",
  "Русе",
  "Стара Загора",
  "При родител/настойник",
  "Практика / стаж",
  "Друго",
];

const Home = () => {
  const [fullName, setFullName] = useState("");
  const [status, setStatus] = useState("");
  const [location, setLocation] = useState("");
  const [customLocation, setCustomLocation] = useState("");
  const [signature, setSignature] = useState(null);
  const [lastStatus, setLastStatus] = useState(null);
  const [history, setHistory] = useState([]);
  const [message, setMessage] = useState({ text: "", type: "" });
  const [submitting, setSubmitting] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(currentMonthValue());
  const [calendarData, setCalendarData] = useState({ attendance: [], events: [] });
  const navigate = useNavigate();

  const fetchHistoryAndUser = useCallback(async (token) => {
    const [userRes, historyRes] = await Promise.all([
      fetch(`${API_BASE}/user`, {
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      }),
      fetch(`${API_BASE}/auth?action=get_my_history`, {
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      }),
    ]);

    const userData = await userRes.json();
    const historyData = await historyRes.json();

    if (!userRes.ok || !userData.user) {
      throw new Error("Missing user");
    }

    if (userData.user.role === "admin") {
      navigate("/admin");
      return;
    }

    setFullName(userData.user.full_name);
    if (Array.isArray(historyData)) {
      setHistory(historyData);
      if (historyData[0]) setLastStatus(historyData[0].status);
    }
  }, [navigate]);

  const fetchCalendar = useCallback(async (token, month) => {
    const data = await getCalendarData(token, month);
    setCalendarData({
      attendance: Array.isArray(data.attendance) ? data.attendance : [],
      events: Array.isArray(data.events) ? data.events : [],
    });
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
      return;
    }

    const load = async () => {
      try {
        await fetchHistoryAndUser(token);
      } catch {
        localStorage.removeItem("token");
        navigate("/login");
      }
    };

    load();
  }, [fetchHistoryAndUser, navigate]);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;
    fetchCalendar(token, calendarMonth).catch(() => {});
  }, [calendarMonth, fetchCalendar]);

  const handleSubmit = async () => {
    if (!status) {
      setMessage({ text: "Моля, изберете статус.", type: "error" });
      return;
    }
    const finalLocation = location === "Друго" ? customLocation.trim() : location.trim();
    if (status === "unenrolled" && !finalLocation) {
      setMessage({ text: "Моля, въведете локация при отписване.", type: "error" });
      return;
    }

    setSubmitting(true);
    setMessage({ text: "", type: "" });
    const token = localStorage.getItem("token");

    try {
      const body = { status };
      if (status === "unenrolled") {
        body.location = finalLocation;
        if (signature) body.signature = signature;
      }

      const response = await fetch(`${API_BASE}/auth?action=update_status`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });

      const result = await response.json();
      setMessage({ text: result.message, type: response.ok ? "success" : "error" });

      if (response.ok) {
        const newEntry = {
          status,
          location: status === "unenrolled" ? finalLocation : null,
          signature: status === "unenrolled" ? signature || null : null,
          approval_status: status === "unenrolled" ? "pending" : "approved",
          timestamp: new Date().toISOString(),
        };

        setHistory((prev) => [newEntry, ...prev.slice(0, 9)]);
        setLastStatus(status);
        setStatus("");
        setLocation("");
        setCustomLocation("");
        setSignature(null);
        await fetchCalendar(token, calendarMonth);
      }
    } catch {
      setMessage({ text: "Грешка при изпращане.", type: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  const selectedLocation = location === "Друго" ? customLocation.trim() : location.trim();
  const canSubmit = status && status !== lastStatus && !(status === "unenrolled" && !selectedLocation);

  const statusConfig = {
    enrolled: {
      label: "Записан",
      icon: <FaCheckCircle />,
      bg: "bg-green-50",
      border: "border-green-200",
      text: "text-green-700",
      iconBg: "bg-green-100 text-green-500",
    },
    unenrolled: {
      label: "Отписан",
      icon: <FaTimesCircle />,
      bg: "bg-slate-100",
      border: "border-slate-200",
      text: "text-slate-600",
      iconBg: "bg-slate-200 text-slate-400",
    },
    null: {
      label: "Няма данни",
      icon: <FaClock />,
      bg: "bg-white",
      border: "border-slate-200",
      text: "text-slate-400",
      iconBg: "bg-slate-100 text-slate-300",
    },
  };
  const currentConfig = statusConfig[lastStatus] ?? statusConfig.null;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-5xl mx-auto px-4 py-6 sm:py-8 space-y-5">
        <div>
          <h1 className="text-xl font-bold text-gray-900 break-words">Здравей, {fullName || "..."}</h1>
          <p className="text-gray-400 text-sm">Актуализирай своето присъствие и следи календара</p>
        </div>

        <div className="grid gap-5 xl:grid-cols-[1.1fr,0.9fr]">
          <div className="space-y-5">
            <div className={`rounded-2xl border p-4 sm:p-5 shadow-sm flex items-center gap-4 ${currentConfig.bg} ${currentConfig.border}`}>
              <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center text-xl flex-shrink-0 ${currentConfig.iconBg}`}>
                {currentConfig.icon}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-0.5">Текущ статус</p>
                <p className={`text-lg sm:text-xl font-bold ${currentConfig.text}`}>{currentConfig.label}</p>
                {history[0]?.timestamp && (
                  <p className="text-xs text-gray-400 mt-0.5">
                    {new Date(history[0].timestamp).toLocaleString("bg-BG", {
                      day: "numeric",
                      month: "long",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                )}
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-6">
              <h2 className="text-base font-semibold text-gray-900 mb-4">Промяна на статус</h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                {[
                  {
                    value: "enrolled",
                    label: "Запиши се",
                    icon: "✓",
                    activeStyle: "border-green-500 bg-green-50 text-green-700",
                    disabledStyle: "border-slate-100 bg-slate-50 text-slate-300",
                  },
                  {
                    value: "unenrolled",
                    label: "Отпиши се",
                    icon: "✕",
                    activeStyle: "border-red-400 bg-red-50 text-red-700",
                    disabledStyle: "border-slate-100 bg-slate-50 text-slate-300",
                  },
                ].map(({ value, label, icon, activeStyle, disabledStyle }) => {
                  const isCurrent = lastStatus === value;
                  const isSelected = status === value;
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => {
                        if (!isCurrent) {
                          setStatus(value);
                          setMessage({ text: "", type: "" });
                        }
                      }}
                      disabled={isCurrent}
                      className={`py-4 px-3 rounded-xl border-2 font-medium text-sm transition-all ${
                        isCurrent
                          ? `${disabledStyle} cursor-not-allowed`
                          : isSelected
                          ? activeStyle
                          : "border-slate-200 text-gray-600 hover:border-slate-300 hover:bg-slate-50"
                      }`}
                    >
                      <div className="text-2xl mb-1.5">{icon}</div>
                      <div>{label}</div>
                      {isCurrent && <div className="text-xs mt-0.5 opacity-60">Текущ</div>}
                    </button>
                  );
                })}
              </div>

              {status === "unenrolled" && (
                <div className="space-y-3 mb-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-600 mb-1.5 flex items-center gap-1.5">
                      <FaMapMarkerAlt size={11} className="text-slate-400" />
                      Локация <span className="text-red-400">*</span>
                    </label>
                    <select
                      value={location}
                      onChange={(event) => setLocation(event.target.value)}
                      className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#791c1c]/20 focus:border-[#791c1c] transition text-sm"
                    >
                      <option value="">Избери локация</option>
                      {locationOptions.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                    {location === "Друго" && (
                      <input
                        type="text"
                        value={customLocation}
                        onChange={(event) => setCustomLocation(event.target.value)}
                        placeholder="Въведи друга локация"
                        className="mt-3 w-full px-4 py-3 border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#791c1c]/20 focus:border-[#791c1c] transition text-sm"
                      />
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-600 mb-1.5 flex items-center gap-1.5">
                      <FaPenNib size={11} className="text-slate-400" />
                      Подпис <span className="text-slate-400 font-normal text-xs">(по избор)</span>
                    </label>
                    <div className="overflow-hidden rounded-2xl border border-slate-100">
                      <SignaturePad onChange={setSignature} />
                    </div>
                  </div>
                </div>
              )}

              {message.text && (
                <div
                  className={`mb-4 p-3.5 rounded-xl text-sm border flex items-center gap-2 ${
                    message.type === "success"
                      ? "bg-green-50 border-green-100 text-green-700"
                      : "bg-red-50 border-red-100 text-red-600"
                  }`}
                >
                  {message.type === "success" ? "✓" : "⚠"} {message.text}
                </div>
              )}

              <button
                onClick={handleSubmit}
                disabled={!canSubmit || submitting}
                className="w-full py-3.5 bg-[#791c1c] text-white font-semibold rounded-xl hover:bg-[#6b1818] transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
              >
                {submitting ? "Изпращане..." : "Потвърди статус"}
              </button>
            </div>
          </div>

          <CalendarPanel
            title="Моят календар"
            month={calendarMonth}
            onMonthChange={setCalendarMonth}
            attendance={calendarData.attendance}
            events={calendarData.events}
          />
        </div>

        {history.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-6">
            <h2 className="text-base font-semibold text-gray-900 mb-4">Последна активност</h2>
            <div className="space-y-2">
              {history.map((entry, index) => (
                <div
                  key={`${entry.timestamp}-${index}`}
                  className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between py-3 border-b border-slate-50 last:border-0"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5 ${
                        entry.approval_status === "pending"
                          ? "bg-amber-100 text-amber-700"
                          : entry.status === "enrolled"
                          ? "bg-green-100 text-green-600"
                          : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {entry.approval_status === "pending" ? "…" : entry.status === "enrolled" ? "✓" : "✕"}
                    </div>
                    <div className="min-w-0">
                      <p
                        className={`text-sm font-medium ${
                          entry.approval_status === "pending"
                            ? "text-amber-700"
                            : entry.status === "enrolled"
                            ? "text-green-700"
                            : "text-slate-600"
                        }`}
                      >
                        {entry.approval_status === "pending"
                          ? "Отписване в изчакване"
                          : entry.status === "enrolled"
                          ? "Записан"
                          : "Отписан"}
                      </p>
                      {entry.location && (
                        <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5 break-words">
                          <FaMapMarkerAlt size={9} /> {entry.location}
                        </p>
                      )}
                      {entry.signature && (
                        <div className="mt-0.5 flex items-center gap-1">
                          <FaPenNib size={9} className="text-gray-400 flex-shrink-0" />
                          {entry.signature.startsWith("data:") ? (
                            <img src={entry.signature} alt="подпис" className="h-6 max-w-28 object-contain rounded" />
                          ) : (
                            <span className="text-xs text-gray-400 italic break-words">{entry.signature}</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  <span className="text-xs text-gray-400 sm:flex-shrink-0 pl-11 sm:pl-0">
                    {new Date(entry.timestamp).toLocaleString("bg-BG", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Home;
