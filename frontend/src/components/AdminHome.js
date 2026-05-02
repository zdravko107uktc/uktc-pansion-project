import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaUserGraduate, FaUserSlash, FaSearch, FaSyncAlt, FaMapMarkerAlt, FaPenNib,
  FaBed, FaClock, FaCheckCircle,
} from "react-icons/fa";
import {
  API_BASE, startShift, endShift, getPendingRequests,
  approveUnenrollment, rejectUnenrollment,
} from "../api/auth";

const AdminHome = () => {
  const [allRecords, setAllRecords] = useState([]);
  const [userRole, setUserRole] = useState("");
  const [userDormitory, setUserDormitory] = useState(null);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [lastUpdated, setLastUpdated] = useState(null);
  const [shiftDorm, setShiftDorm] = useState("1");
  const [shiftLoading, setShiftLoading] = useState(false);
  const [shiftMsg, setShiftMsg] = useState({ text: "", type: "" });
  const [approvalMsg, setApprovalMsg] = useState({ text: "", type: "" });
  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  const fetchPending = useCallback(async () => {
    if (!token) return;
    try {
      const data = await getPendingRequests(token);
      setPendingRequests(Array.isArray(data) ? data : []);
    } catch {}
  }, [token]);

  const fetchRecords = useCallback(async (isRefresh = false) => {
    if (!token) return;
    if (isRefresh) setRefreshing(true);
    try {
      const res = await fetch(`${API_BASE}/auth?action=get_week_records`, {
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      });
      const data = await res.json();
      setAllRecords(Array.isArray(data) ? data : []);
      setLastUpdated(new Date());
    } catch {}
    finally {
      if (isRefresh) setRefreshing(false);
    }
  }, [token]);

  useEffect(() => {
    if (!token) return navigate("/login");
    const init = async () => {
      try {
        const userRes = await fetch(`${API_BASE}/user`, {
          headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
        });
        const userData = await userRes.json();
        const role = userData?.user?.role;
        if (!role || !["admin", "counselor"].includes(role)) return navigate("/");
        setUserRole(role);
        setUserDormitory(userData.user.dormitory || null);
        await fetchRecords();
        if (role === "counselor" && userData.user.dormitory) {
          await fetchPending();
        }
      } catch {
        navigate("/login");
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [navigate, token, fetchRecords, fetchPending]);

  const handleStartShift = async () => {
    setShiftLoading(true);
    setShiftMsg({ text: "", type: "" });
    try {
      const data = await startShift(token, shiftDorm);
      if (data.dormitory) {
        setUserDormitory(data.dormitory);
        setShiftMsg({ text: `Смяната в Общежитие ${data.dormitory} е започната.`, type: "success" });
        await fetchPending();
      } else {
        setShiftMsg({ text: data.message || "Грешка.", type: "error" });
      }
    } catch {
      setShiftMsg({ text: "Грешка при свързване.", type: "error" });
    } finally {
      setShiftLoading(false);
    }
  };

  const handleEndShift = async () => {
    setShiftLoading(true);
    setShiftMsg({ text: "", type: "" });
    try {
      const data = await endShift(token);
      setUserDormitory(null);
      setPendingRequests([]);
      setShiftMsg({ text: data.message || "Смяната е приключена.", type: "success" });
    } catch {
      setShiftMsg({ text: "Грешка при свързване.", type: "error" });
    } finally {
      setShiftLoading(false);
    }
  };

  const handleApprove = async (statusId) => {
    setApprovalMsg({ text: "", type: "" });
    try {
      const data = await approveUnenrollment(token, statusId);
      setApprovalMsg({ text: data.message || "Одобрено.", type: "success" });
      setPendingRequests((prev) => prev.filter((r) => r.id !== statusId));
      await fetchRecords();
    } catch {
      setApprovalMsg({ text: "Грешка при одобрение.", type: "error" });
    }
  };

  const handleReject = async (statusId) => {
    setApprovalMsg({ text: "", type: "" });
    try {
      const data = await rejectUnenrollment(token, statusId);
      setApprovalMsg({ text: data.message || "Отказано.", type: "success" });
      setPendingRequests((prev) => prev.filter((r) => r.id !== statusId));
    } catch {
      setApprovalMsg({ text: "Грешка при отказване.", type: "error" });
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchRecords(false), fetchPending()]);
    setLastUpdated(new Date());
    setRefreshing(false);
  };

  const filtered = allRecords.filter(
    (r) =>
      r.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      r.email?.toLowerCase().includes(search.toLowerCase())
  );

  const enrolled = filtered.filter((r) => r.status === "enrolled");
  const unenrolled = filtered.filter((r) => r.status === "unenrolled");
  const totalEnrolled = allRecords.filter((r) => r.status === "enrolled").length;
  const totalUnenrolled = allRecords.filter((r) => r.status === "unenrolled").length;

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-slate-400 text-sm">Зареждане...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {userRole === "counselor" ? "Панел на възпитателя" : "Административен панел"}
            </h1>
            <p className="text-gray-400 text-sm mt-0.5">Присъствие за текущата седмица</p>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="self-start sm:self-auto flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-slate-50 transition-colors shadow-sm disabled:opacity-60"
          >
            <FaSyncAlt size={12} className={refreshing ? "animate-spin" : ""} />
            {lastUpdated
              ? `Актуализирано в ${lastUpdated.toLocaleTimeString("bg-BG", { hour: "2-digit", minute: "2-digit" })}`
              : "Опресни"}
          </button>
        </div>

        {/* Shift management — counselors only */}
        {userRole === "counselor" && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-8">
            <h2 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <FaBed className="text-[#791c1c]" size={16} />
              Управление на смяна
            </h2>

            {userDormitory ? (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                    <FaCheckCircle className="text-green-500" size={18} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-800">
                      На смяна — Общежитие {userDormitory}
                    </p>
                    <p className="text-xs text-gray-400">
                      Виждате заявките за отписване от вашето общежитие
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleEndShift}
                  disabled={shiftLoading}
                  className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-sm transition disabled:opacity-50 shrink-0"
                >
                  {shiftLoading ? "..." : "Приключи смяна"}
                </button>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row sm:items-end gap-4">
                <div>
                  <p className="text-sm text-gray-500 mb-3">
                    Изберете общежитие, в което сте на смяна:
                  </p>
                  <div className="flex gap-3">
                    {["1", "2"].map((d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => setShiftDorm(d)}
                        className={`px-8 py-3 rounded-xl border-2 font-semibold text-sm transition-all ${
                          shiftDorm === d
                            ? "border-[#791c1c] bg-red-50 text-[#791c1c]"
                            : "border-slate-200 text-gray-600 hover:border-slate-300"
                        }`}
                      >
                        Общежитие {d}
                      </button>
                    ))}
                  </div>
                </div>
                <button
                  onClick={handleStartShift}
                  disabled={shiftLoading}
                  className="px-6 py-3 bg-[#791c1c] text-white font-semibold rounded-xl text-sm hover:bg-[#6b1818] transition disabled:opacity-50 shadow-sm shrink-0"
                >
                  {shiftLoading ? "..." : "Започни смяна"}
                </button>
              </div>
            )}

            {shiftMsg.text && (
              <div className={`mt-4 p-3 rounded-xl text-sm border ${
                shiftMsg.type === "success"
                  ? "bg-green-50 border-green-100 text-green-700"
                  : "bg-red-50 border-red-100 text-red-600"
              }`}>
                {shiftMsg.text}
              </div>
            )}
          </div>
        )}

        {/* Pending requests — counselors on shift */}
        {userRole === "counselor" && userDormitory && (
          <div className="mb-8">
            <div className="flex items-center gap-2.5 mb-4">
              <FaClock className="text-amber-500" size={16} />
              <h2 className="text-base font-semibold text-gray-800">
                Чакащи заявки за отписване
              </h2>
              {pendingRequests.length > 0 && (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">
                  {pendingRequests.length}
                </span>
              )}
            </div>

            {approvalMsg.text && (
              <div className={`mb-4 p-3 rounded-xl text-sm border ${
                approvalMsg.type === "success"
                  ? "bg-green-50 border-green-100 text-green-700"
                  : "bg-red-50 border-red-100 text-red-600"
              }`}>
                {approvalMsg.text}
              </div>
            )}

            {pendingRequests.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center shadow-sm">
                <div className="text-3xl mb-2">✓</div>
                <p className="text-slate-400 text-sm">Няма чакащи заявки</p>
              </div>
            ) : (
              <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-amber-50/60">
                      <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">Ученик</th>
                      <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-400 uppercase tracking-wider hidden sm:table-cell">Имейл</th>
                      <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">Локация</th>
                      <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-400 uppercase tracking-wider hidden lg:table-cell">Подпис</th>
                      <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-400 uppercase tracking-wider hidden md:table-cell">Час</th>
                      <th className="text-right px-5 py-3.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">Действие</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {pendingRequests.map((req) => (
                      <tr key={req.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 font-semibold text-sm flex-shrink-0">
                              {req.full_name?.charAt(0)?.toUpperCase()}
                            </div>
                            <span className="font-medium text-gray-900">{req.full_name}</span>
                          </div>
                        </td>
                        <td className="px-5 py-4 text-slate-500 hidden sm:table-cell">{req.email}</td>
                        <td className="px-5 py-4">
                          {req.location ? (
                            <span className="flex items-center gap-1.5 text-slate-600 text-sm">
                              <FaMapMarkerAlt size={11} className="text-slate-400" />
                              {req.location}
                            </span>
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>
                        <td className="px-5 py-4 hidden lg:table-cell">
                          <SignatureCell value={req.signature} />
                        </td>
                        <td className="px-5 py-4 text-slate-500 text-xs hidden md:table-cell">
                          {req.timestamp
                            ? new Date(req.timestamp).toLocaleString("bg-BG", {
                                day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
                              })
                            : "—"}
                        </td>
                        <td className="px-5 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleApprove(req.id)}
                              className="px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white text-xs font-semibold rounded-lg transition"
                            >
                              Одобри
                            </button>
                            <button
                              onClick={() => handleReject(req.id)}
                              className="px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-600 text-xs font-semibold rounded-lg transition"
                            >
                              Откажи
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <StatCard value={totalEnrolled} label="Записани" color="green" />
          <StatCard value={totalUnenrolled} label="Отписани" color="red" />
          <StatCard value={allRecords.length} label="Общо тази седмица" color="brand" />
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={13} />
          <input
            type="text"
            placeholder="Търси по име или имейл..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#791c1c]/20 focus:border-[#791c1c] shadow-sm transition text-sm"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-lg leading-none"
            >
              ×
            </button>
          )}
        </div>

        {/* Enrolled */}
        <section className="mb-8">
          <div className="flex items-center gap-2.5 mb-4">
            <FaUserGraduate className="text-green-500" size={16} />
            <h2 className="text-base font-semibold text-gray-800">Записани ученици</h2>
            <Badge count={enrolled.length} color="green" />
          </div>
          <StudentTable data={enrolled} showLocation={false} emptyText="Няма записани ученици тази седмица" />
        </section>

        {/* Unenrolled */}
        <section>
          <div className="flex items-center gap-2.5 mb-4">
            <FaUserSlash className="text-red-500" size={16} />
            <h2 className="text-base font-semibold text-gray-800">Отписани ученици</h2>
            <Badge count={unenrolled.length} color="red" />
          </div>
          <StudentTable data={unenrolled} showLocation={true} showSignature={true} emptyText="Няма отписани ученици тази седмица" />
        </section>
      </div>
    </div>
  );
};

const SignatureCell = ({ value }) => {
  if (!value) return <span className="text-slate-300">—</span>;
  if (value.startsWith("data:")) {
    return (
      <img
        src={value}
        alt="подпис"
        className="h-8 max-w-xs object-contain rounded border border-slate-100"
      />
    );
  }
  return (
    <span className="flex items-center gap-1.5 text-slate-500 text-sm italic">
      <FaPenNib size={10} className="text-slate-400 flex-shrink-0" />
      {value}
    </span>
  );
};

const StatCard = ({ value, label, color }) => {
  const colors = {
    green: "text-green-600 bg-green-50 border-green-100",
    red: "text-red-600 bg-red-50 border-red-100",
    brand: "text-[#791c1c] bg-red-50 border-red-100",
  };
  return (
    <div className={`rounded-2xl border p-5 shadow-sm ${colors[color]}`}>
      <div className="text-3xl font-black">{value}</div>
      <div className="text-sm font-medium mt-1 opacity-70">{label}</div>
    </div>
  );
};

const Badge = ({ count, color }) => {
  const colors = {
    green: "bg-green-100 text-green-700",
    red: "bg-red-100 text-red-700",
  };
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${colors[color]}`}>
      {count}
    </span>
  );
};

const StudentTable = ({ data, showLocation, showSignature, emptyText }) => {
  if (!data.length) {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center shadow-sm">
        <div className="text-3xl mb-2">📋</div>
        <p className="text-slate-400 text-sm">{emptyText}</p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="border-b border-slate-100 bg-slate-50/80">
            <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">#</th>
            <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">Ученик</th>
            <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-400 uppercase tracking-wider hidden sm:table-cell">Имейл</th>
            <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">Дата и час</th>
            {showLocation && (
              <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-400 uppercase tracking-wider hidden md:table-cell">Локация</th>
            )}
            {showSignature && (
              <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-400 uppercase tracking-wider hidden lg:table-cell">Подпис</th>
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {data.map((entry, idx) => (
            <tr key={`${entry.id}_${idx}`} className="hover:bg-slate-50/50 transition-colors">
              <td className="px-5 py-4 text-slate-300 text-xs font-medium">{idx + 1}</td>
              <td className="px-5 py-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-semibold text-sm flex-shrink-0">
                    {entry.full_name?.charAt(0)?.toUpperCase()}
                  </div>
                  <span className="font-medium text-gray-900">{entry.full_name}</span>
                </div>
              </td>
              <td className="px-5 py-4 text-slate-500 hidden sm:table-cell">{entry.email}</td>
              <td className="px-5 py-4 text-slate-500 text-xs">
                {entry.timestamp
                  ? new Date(entry.timestamp).toLocaleString("bg-BG", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "—"}
              </td>
              {showLocation && (
                <td className="px-5 py-4 hidden md:table-cell">
                  {entry.location ? (
                    <span className="flex items-center gap-1.5 text-slate-500 text-sm">
                      <FaMapMarkerAlt size={11} className="text-slate-400" />
                      {entry.location}
                    </span>
                  ) : (
                    <span className="text-slate-300">—</span>
                  )}
                </td>
              )}
              {showSignature && (
                <td className="px-5 py-4 hidden lg:table-cell">
                  <SignatureCell value={entry.signature} />
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default AdminHome;
