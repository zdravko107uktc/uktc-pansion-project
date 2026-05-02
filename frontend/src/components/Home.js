import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FaMapMarkerAlt, FaCheckCircle, FaTimesCircle, FaClock, FaPenNib } from "react-icons/fa";
import { API_BASE } from "../api/auth";
import SignaturePad from "./SignaturePad";

const Home = () => {
  const [userId, setUserId] = useState("");
  const [fullName, setFullName] = useState("");
  const [status, setStatus] = useState("");
  const [location, setLocation] = useState("");
  const [signature, setSignature] = useState(null);
  const [lastStatus, setLastStatus] = useState(null);
  const [history, setHistory] = useState([]);
  const [message, setMessage] = useState({ text: "", type: "" });
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return navigate("/login");

    const fetchData = async () => {
      try {
        const [userRes, histRes] = await Promise.all([
          fetch(`${API_BASE}/user`, {
            headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
          }),
          fetch(`${API_BASE}/auth?action=get_my_history`, {
            headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
          }),
        ]);

        const userData = await userRes.json();
        if (userData.user) {
          setUserId(userData.user.id);
          setFullName(userData.user.full_name);
        }

        const histData = await histRes.json();
        if (Array.isArray(histData)) {
          setHistory(histData);
          if (histData[0]) setLastStatus(histData[0].status);
        }
      } catch (err) {
        console.error("Грешка при зареждане:", err);
      }
    };

    fetchData();
  }, [navigate]);

  const handleSubmit = async () => {
    if (!status) return setMessage({ text: "Моля, изберете статус.", type: "error" });
    if (status === "unenrolled" && !location.trim())
      return setMessage({ text: "Моля, въведете локация при отписване.", type: "error" });

    setSubmitting(true);
    setMessage({ text: "", type: "" });
    const token = localStorage.getItem("token");
    try {
      const body = { userId, status };
      if (status === "unenrolled") {
        body.location = location;
        if (signature) body.signature = signature;
      }

      const res = await fetch(`${API_BASE}/auth?action=update_status`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      const result = await res.json();
      setMessage({ text: result.message, type: res.ok ? "success" : "error" });
      if (res.ok) {
        const newEntry = {
          status,
          location: status === "unenrolled" ? location : null,
          signature: status === "unenrolled" ? (signature || null) : null,
          timestamp: new Date().toISOString(),
        };
        setHistory((prev) => [newEntry, ...prev.slice(0, 9)]);
        setLastStatus(status);
        setStatus("");
        setLocation("");
        setSignature(null);
      }
    } catch {
      setMessage({ text: "Грешка при изпращане.", type: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  const canSubmit =
    status &&
    status !== lastStatus &&
    !(status === "unenrolled" && !location.trim());

  const statusConfig = {
    enrolled:   { label: "Записан",    icon: <FaCheckCircle />, bg: "bg-green-50",  border: "border-green-200",  text: "text-green-700",  iconBg: "bg-green-100 text-green-500" },
    unenrolled: { label: "Отписан",    icon: <FaTimesCircle />, bg: "bg-slate-100", border: "border-slate-200",  text: "text-slate-600",  iconBg: "bg-slate-200 text-slate-400" },
    null:       { label: "Няма данни", icon: <FaClock />,       bg: "bg-white",     border: "border-slate-200",  text: "text-slate-400",  iconBg: "bg-slate-100 text-slate-300" },
  };
  const currentConfig = statusConfig[lastStatus] ?? statusConfig[null];

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-xl mx-auto px-4 py-8 space-y-5">

        <div>
          <h1 className="text-xl font-bold text-gray-900">Здравей, {fullName || "..."}</h1>
          <p className="text-gray-400 text-sm">Актуализирай своето присъствие</p>
        </div>

        {/* Current status card */}
        <div className={`rounded-2xl border p-5 shadow-sm flex items-center gap-4 ${currentConfig.bg} ${currentConfig.border}`}>
          <div className={`w-14 h-14 rounded-full flex items-center justify-center text-xl flex-shrink-0 ${currentConfig.iconBg}`}>
            {currentConfig.icon}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-0.5">Текущ статус</p>
            <p className={`text-xl font-bold ${currentConfig.text}`}>{currentConfig.label}</p>
            {history[0]?.timestamp && (
              <p className="text-xs text-gray-400 mt-0.5">
                {new Date(history[0].timestamp).toLocaleString("bg-BG", {
                  day: "numeric", month: "long", hour: "2-digit", minute: "2-digit",
                })}
              </p>
            )}
          </div>
        </div>

        {/* Action card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Промяна на статус</h2>

          <div className="grid grid-cols-2 gap-3 mb-4">
            {[
              { value: "enrolled",   label: "Запиши се",  icon: "✓", activeStyle: "border-green-500 bg-green-50 text-green-700", disabledStyle: "border-slate-100 bg-slate-50 text-slate-300" },
              { value: "unenrolled", label: "Отпиши се",  icon: "✗", activeStyle: "border-red-400 bg-red-50 text-red-700",       disabledStyle: "border-slate-100 bg-slate-50 text-slate-300" },
            ].map(({ value, label, icon, activeStyle, disabledStyle }) => {
              const isCurrent = lastStatus === value;
              const isSelected = status === value;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => { if (!isCurrent) { setStatus(value); setMessage({ text: "", type: "" }); } }}
                  disabled={isCurrent}
                  className={`py-4 px-3 rounded-xl border-2 font-medium text-sm transition-all ${
                    isCurrent   ? disabledStyle + " cursor-not-allowed" :
                    isSelected  ? activeStyle :
                    "border-slate-200 text-gray-600 hover:border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  <div className="text-2xl mb-1.5">{icon}</div>
                  <div>{label}</div>
                  {isCurrent && <div className="text-xs mt-0.5 opacity-60">Текущ</div>}
                </button>
              );
            })}
          </div>

          {/* Unenroll fields */}
          {status === "unenrolled" && (
            <div className="space-y-3 mb-4">
              <div>
                <label className="block text-sm font-semibold text-gray-600 mb-1.5 flex items-center gap-1.5">
                  <FaMapMarkerAlt size={11} className="text-slate-400" />
                  Локация <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Пример: София, Варна, Пловдив..."
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#791c1c]/20 focus:border-[#791c1c] transition text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-600 mb-1.5 flex items-center gap-1.5">
                  <FaPenNib size={11} className="text-slate-400" />
                  Подпис <span className="text-slate-400 font-normal text-xs">(по избор)</span>
                </label>
                <SignaturePad onChange={setSignature} />
              </div>
            </div>
          )}

          {message.text && (
            <div className={`mb-4 p-3.5 rounded-xl text-sm border flex items-center gap-2 ${
              message.type === "success"
                ? "bg-green-50 border-green-100 text-green-700"
                : "bg-red-50 border-red-100 text-red-600"
            }`}>
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

        {/* History */}
        {history.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <h2 className="text-base font-semibold text-gray-900 mb-4">Последна активност</h2>
            <div className="space-y-1">
              {history.map((entry, idx) => (
                <div key={idx} className="flex items-start justify-between py-3 border-b border-slate-50 last:border-0 gap-3">
                  <div className="flex items-start gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5 ${
                      entry.status === "enrolled"
                        ? "bg-green-100 text-green-600"
                        : "bg-slate-100 text-slate-500"
                    }`}>
                      {entry.status === "enrolled" ? "✓" : "✗"}
                    </div>
                    <div>
                      <p className={`text-sm font-medium ${
                        entry.status === "enrolled" ? "text-green-700" : "text-slate-600"
                      }`}>
                        {entry.status === "enrolled" ? "Записан" : "Отписан"}
                      </p>
                      {entry.location && (
                        <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                          <FaMapMarkerAlt size={9} /> {entry.location}
                        </p>
                      )}
                      {entry.signature && (
                        <div className="mt-0.5 flex items-center gap-1">
                          <FaPenNib size={9} className="text-gray-400 flex-shrink-0" />
                          {entry.signature.startsWith("data:") ? (
                            <img
                              src={entry.signature}
                              alt="подпис"
                              className="h-6 max-w-28 object-contain rounded"
                            />
                          ) : (
                            <span className="text-xs text-gray-400 italic">{entry.signature}</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  <span className="text-xs text-gray-400 flex-shrink-0">
                    {new Date(entry.timestamp).toLocaleString("bg-BG", {
                      day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
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
