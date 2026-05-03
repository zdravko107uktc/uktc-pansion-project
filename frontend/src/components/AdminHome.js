import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaCheckCircle,
  FaClock,
  FaEdit,
  FaEnvelope,
  FaMapMarkerAlt,
  FaPenNib,
  FaPlus,
  FaSearch,
  FaSyncAlt,
  FaTimesCircle,
  FaTrashAlt,
  FaUsers,
} from "react-icons/fa";
import {
  approveUnenrollment,
  clearNotifications,
  createCalendarEvent,
  createManagedUser,
  deleteCalendarEvent,
  deleteNotification,
  deleteUser,
  getCalendarData,
  getCurrentUser,
  getPendingRequests,
  getRecentNotifications,
  getUsers,
  getWeekRecords,
  rejectUnenrollment,
  SYSTEM_ADMIN_EMAIL,
  updateCalendarEvent,
  updateUser,
} from "../api/auth";
import CalendarPanel from "./CalendarPanel";
import SignaturePad from "./SignaturePad";
import { formatDateOnlyBg, formatDateTimeBg, formatTimeBg } from "../utils/dateTime";
import { validatePassword } from "../utils/passwordPolicy";

const currentMonthValue = () => {
  const now = new Date();
  return `${now.getFullYear()}-${`${now.getMonth() + 1}`.padStart(2, "0")}`;
};

const emptyManagedUser = {
  name: "",
  email: "",
  password: "",
  role: "student",
  dormitory: "1",
};

const getRoleLabel = (role) => {
  if (role === "admin") return "Администратор";
  if (role === "counselor") return "Възпитател";
  return "Ученик";
};

const getRoleBadgeClass = (role) => {
  if (role === "admin") return "bg-slate-900 text-white";
  if (role === "counselor") return "bg-amber-100 text-amber-800";
  return "bg-blue-100 text-blue-700";
};

const getApprovalBadgeClass = (status, approvalStatus) => {
  if (approvalStatus === "pending") return "bg-amber-100 text-amber-800";
  if (status === "enrolled") return "bg-green-100 text-green-700";
  if (approvalStatus === "rejected") return "bg-red-100 text-red-700";
  return "bg-slate-100 text-slate-600";
};

const getRecordLabel = (status, approvalStatus) => {
  if (approvalStatus === "pending") return "Чака одобрение";
  if (status === "enrolled") return "Записан";
  if (approvalStatus === "rejected") return "Отказано отписване";
  return "Отписан";
};

const normalizeManagedUserPayload = (form) => ({
  name: form.name.trim(),
  email: form.email.trim().toLowerCase(),
  password: form.password,
  role: form.role,
  dormitory: form.role === "admin" || form.email.trim().toLowerCase() === SYSTEM_ADMIN_EMAIL ? null : form.dormitory,
});

const validateManagedUserForm = (form, { requirePassword }) => {
  if (!form.name.trim()) return "Името е задължително.";
  if (form.name.trim().split(/\s+/).filter(Boolean).length < 2) return "Въведете собствено и фамилно име.";
  if (!form.email.trim()) return "Имейлът е задължителен.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(form.email.trim())) return "Невалиден имейл адрес.";
  if (!["student", "counselor", "admin"].includes(form.role)) return "Невалидна роля.";

  const effectiveRole =
    form.email.trim().toLowerCase() === SYSTEM_ADMIN_EMAIL ? "admin" : form.role;
  if (effectiveRole !== "admin" && !["1", "2"].includes(form.dormitory)) {
    return "Изберете общежитие.";
  }

  if (requirePassword) {
    return validatePassword(form.password);
  }

  return "";
};

const StatCard = ({ value, label, tone = "slate" }) => {
  const toneClass =
    tone === "green"
      ? "bg-green-50 border-green-100 text-green-700"
      : tone === "red"
      ? "bg-red-50 border-red-100 text-red-700"
      : tone === "amber"
      ? "bg-amber-50 border-amber-100 text-amber-800"
      : "bg-white border-slate-200 text-slate-700";

  return (
    <div className={`rounded-2xl border p-4 shadow-sm ${toneClass}`}>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-sm opacity-80 mt-1">{label}</div>
    </div>
  );
};

const AdminHome = () => {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [allRecords, setAllRecords] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [managedUsers, setManagedUsers] = useState([]);
  const [calendarMonth, setCalendarMonth] = useState(currentMonthValue());
  const [calendarData, setCalendarData] = useState({ dailySummary: [], events: [] });
  const [search, setSearch] = useState("");
  const [userSearch, setUserSearch] = useState("");
  const [lastUpdated, setLastUpdated] = useState(null);
  const [approvalState, setApprovalState] = useState({ text: "", type: "" });
  const [eventState, setEventState] = useState({ loading: false, message: "", type: "" });
  const [userState, setUserState] = useState({ loading: false, message: "", type: "" });
  const [logState, setLogState] = useState({ loading: false, message: "", type: "" });
  const [reviewSignatures, setReviewSignatures] = useState({});
  const [reviewingId, setReviewingId] = useState(null);
  const [newUserForm, setNewUserForm] = useState(emptyManagedUser);
  const [editingUserId, setEditingUserId] = useState(null);
  const [editingUserForm, setEditingUserForm] = useState(emptyManagedUser);

  const isAdmin = currentUser?.role === "admin";

  const fetchCalendar = useCallback(
    async (month) => {
      const data = await getCalendarData(token, month);
      setCalendarData({
        dailySummary: Array.isArray(data.dailySummary) ? data.dailySummary : [],
        events: Array.isArray(data.events) ? data.events : [],
      });
    },
    [token]
  );

  const refreshEverything = useCallback(async () => {
    const nextUser = await getCurrentUser(token);
    if (!nextUser || !["admin", "counselor"].includes(nextUser.role)) {
      localStorage.removeItem("token");
      navigate("/login");
      return;
    }

    setCurrentUser(nextUser);

    const tasks = [
      getWeekRecords(token).then((data) => setAllRecords(Array.isArray(data) ? data : [])),
      getPendingRequests(token).then((data) => setPendingRequests(Array.isArray(data) ? data : [])),
      fetchCalendar(calendarMonth),
    ];

    if (nextUser.role === "admin") {
      tasks.push(
        getRecentNotifications(token).then((data) => setNotifications(Array.isArray(data) ? data : [])),
        getUsers(token).then((data) => setManagedUsers(Array.isArray(data) ? data : []))
      );
    } else {
      setNotifications([]);
      setManagedUsers([]);
    }

    await Promise.all(tasks);
    setLastUpdated(new Date());
  }, [calendarMonth, fetchCalendar, navigate, token]);

  useEffect(() => {
    if (!token) {
      navigate("/login");
      return;
    }

    refreshEverything()
      .catch(() => {
        localStorage.removeItem("token");
        navigate("/login");
      })
      .finally(() => setLoading(false));
  }, [navigate, refreshEverything, token]);

  useEffect(() => {
    if (!token || loading) return;
    fetchCalendar(calendarMonth).catch(() => {});
  }, [calendarMonth, fetchCalendar, loading, token]);

  const handleRefresh = async () => {
    setRefreshing(true);
    setApprovalState({ text: "", type: "" });
    await refreshEverything().finally(() => setRefreshing(false));
  };

  const handleReview = async (statusId, decision) => {
    const reviewSignature = reviewSignatures[statusId];
    if (!reviewSignature) {
      setApprovalState({ text: "Подписът на възпитателя или администратора е задължителен.", type: "error" });
      return;
    }

    setReviewingId(statusId);
    setApprovalState({ text: "", type: "" });

    try {
      const response =
        decision === "approve"
          ? await approveUnenrollment(token, statusId, reviewSignature)
          : await rejectUnenrollment(token, statusId, reviewSignature);

      setApprovalState({ text: response.message || "Заявката е обработена.", type: "success" });
      setReviewSignatures((prev) => {
        const next = { ...prev };
        delete next[statusId];
        return next;
      });
      await refreshEverything();
    } catch (error) {
      setApprovalState({
        text: error?.data?.message || "Грешка при обработка на заявката.",
        type: "error",
      });
    } finally {
      setReviewingId(null);
    }
  };

  const handleCreateEvent = async (payload) => {
    setEventState({ loading: true, message: "", type: "" });
    try {
      const result = await createCalendarEvent(token, payload);
      setEventState({ loading: false, message: result.message || "Събитието е създадено.", type: "success" });
      await Promise.all([fetchCalendar(calendarMonth), isAdmin ? getRecentNotifications(token).then(setNotifications) : Promise.resolve()]);
    } catch (error) {
      setEventState({
        loading: false,
        message: error?.data?.message || "Грешка при създаване на събитието.",
        type: "error",
      });
    }
  };

  const handleUpdateEvent = async (payload) => {
    setEventState({ loading: true, message: "", type: "" });
    try {
      const result = await updateCalendarEvent(token, payload);
      setEventState({ loading: false, message: result.message || "Събитието е редактирано.", type: "success" });
      await Promise.all([fetchCalendar(calendarMonth), isAdmin ? getRecentNotifications(token).then(setNotifications) : Promise.resolve()]);
    } catch (error) {
      setEventState({
        loading: false,
        message: error?.data?.message || "Грешка при редакция на събитието.",
        type: "error",
      });
    }
  };

  const handleDeleteEvent = async (eventId) => {
    setEventState({ loading: true, message: "", type: "" });
    try {
      const result = await deleteCalendarEvent(token, eventId);
      setEventState({ loading: false, message: result.message || "Събитието е изтрито.", type: "success" });
      await Promise.all([fetchCalendar(calendarMonth), isAdmin ? getRecentNotifications(token).then(setNotifications) : Promise.resolve()]);
    } catch (error) {
      setEventState({
        loading: false,
        message: error?.data?.message || "Грешка при изтриване на събитието.",
        type: "error",
      });
    }
  };

  const handleCreateUser = async (event) => {
    event.preventDefault();
    const validationError = validateManagedUserForm(newUserForm, { requirePassword: true });
    if (validationError) {
      setUserState({ loading: false, message: validationError, type: "error" });
      return;
    }

    setUserState({ loading: true, message: "", type: "" });
    try {
      const result = await createManagedUser(token, normalizeManagedUserPayload(newUserForm));
      setUserState({ loading: false, message: result.message || "Потребителят е създаден.", type: "success" });
      setNewUserForm(emptyManagedUser);
      await Promise.all([getUsers(token).then(setManagedUsers), getRecentNotifications(token).then(setNotifications)]);
    } catch (error) {
      setUserState({
        loading: false,
        message: error?.data?.message || "Грешка при създаване на потребителя.",
        type: "error",
      });
    }
  };

  const startEditUser = (user) => {
    setEditingUserId(user.id);
    setEditingUserForm({
      name: user.full_name || "",
      email: user.email || "",
      password: "",
      role: user.role || "student",
      dormitory: user.dormitory || "1",
    });
  };

  const handleUpdateUser = async (event) => {
    event.preventDefault();
    if (!editingUserId) return;

    const validationError = validateManagedUserForm(editingUserForm, { requirePassword: false });
    if (validationError) {
      setUserState({ loading: false, message: validationError, type: "error" });
      return;
    }

    setUserState({ loading: true, message: "", type: "" });
    try {
      const payload = normalizeManagedUserPayload(editingUserForm);
      const result = await updateUser(token, {
        userId: editingUserId,
        name: payload.name,
        email: payload.email,
        role: payload.role,
        dormitory: payload.dormitory,
      });
      setUserState({ loading: false, message: result.message || "Промените са запазени.", type: "success" });
      setEditingUserId(null);
      await Promise.all([getUsers(token).then(setManagedUsers), getRecentNotifications(token).then(setNotifications)]);
    } catch (error) {
      setUserState({
        loading: false,
        message: error?.data?.message || "Грешка при редакция на потребителя.",
        type: "error",
      });
    }
  };

  const handleDeleteUser = async (userId) => {
    setUserState({ loading: true, message: "", type: "" });
    try {
      const result = await deleteUser(token, userId);
      setUserState({ loading: false, message: result.message || "Потребителят е изтрит.", type: "success" });
      await Promise.all([getUsers(token).then(setManagedUsers), getRecentNotifications(token).then(setNotifications)]);
    } catch (error) {
      setUserState({
        loading: false,
        message: error?.data?.message || "Грешка при изтриване на потребителя.",
        type: "error",
      });
    }
  };

  const handleDeleteNotification = async (notificationId) => {
    setLogState({ loading: true, message: "", type: "" });
    try {
      const result = await deleteNotification(token, notificationId);
      setLogState({ loading: false, message: result.message || "Известието е изтрито.", type: "success" });
      const data = await getRecentNotifications(token);
      setNotifications(Array.isArray(data) ? data : []);
    } catch (error) {
      setLogState({
        loading: false,
        message: error?.data?.message || "Грешка при изтриване на известието.",
        type: "error",
      });
    }
  };

  const handleClearNotifications = async () => {
    setLogState({ loading: true, message: "", type: "" });
    try {
      const result = await clearNotifications(token);
      setLogState({ loading: false, message: result.message || "Логовете са изчистени.", type: "success" });
      setNotifications([]);
    } catch (error) {
      setLogState({
        loading: false,
        message: error?.data?.message || "Грешка при изчистване на логовете.",
        type: "error",
      });
    }
  };

  const filteredRecords = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return allRecords;

    return allRecords.filter(
      (record) =>
        record.full_name?.toLowerCase().includes(needle) ||
        record.email?.toLowerCase().includes(needle) ||
        String(record.student_dormitory || "").toLowerCase().includes(needle)
    );
  }, [allRecords, search]);

  const filteredUsers = useMemo(() => {
    const needle = userSearch.trim().toLowerCase();
    if (!needle) return managedUsers;

    return managedUsers.filter(
      (user) =>
        user.full_name?.toLowerCase().includes(needle) ||
        user.email?.toLowerCase().includes(needle) ||
        user.role?.toLowerCase().includes(needle)
    );
  }, [managedUsers, userSearch]);

  const totalEnrolled = allRecords.filter((record) => record.status === "enrolled").length;
  const totalUnenrolled = allRecords.filter((record) => record.status === "unenrolled").length;

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-sm text-slate-400">Зареждане...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              {isAdmin ? "Административен панел" : "Панел на възпитателя"}
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Влезли сте като <span className="font-semibold">{currentUser?.full_name}</span> ({getRoleLabel(currentUser?.role)}).
            </p>
          </div>

          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshing}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 shadow-sm hover:bg-slate-50 disabled:opacity-60"
          >
            <FaSyncAlt size={12} className={refreshing ? "animate-spin" : ""} />
            {lastUpdated ? `Обновено в ${formatTimeBg(lastUpdated)}` : "Обнови"}
          </button>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard value={totalEnrolled} label="Записани тази седмица" tone="green" />
          <StatCard value={totalUnenrolled} label="Отписани тази седмица" tone="red" />
          <StatCard value={pendingRequests.length} label="Чакащи заявки" tone="amber" />
          <StatCard value={isAdmin ? managedUsers.length : filteredRecords.length} label={isAdmin ? "Потребители" : "Видими записи"} />
        </div>

        <CalendarPanel
          title={isAdmin ? "Календар и дневна справка" : "Календар"}
          month={calendarMonth}
          onMonthChange={setCalendarMonth}
          dailySummary={calendarData.dailySummary}
          events={calendarData.events}
          canManageEvents={isAdmin}
          onCreateEvent={handleCreateEvent}
          onUpdateEvent={handleUpdateEvent}
          onDeleteEvent={handleDeleteEvent}
          createState={eventState}
        />

        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
          <div className="flex items-center gap-2 mb-4">
            <FaClock className="text-amber-600" />
            <h2 className="text-lg font-semibold text-slate-900">Заявки за отписване</h2>
          </div>

          {approvalState.text && (
            <div
              className={`mb-4 rounded-xl border px-4 py-3 text-sm ${
                approvalState.type === "success"
                  ? "border-green-100 bg-green-50 text-green-700"
                  : "border-red-100 bg-red-50 text-red-700"
              }`}
            >
              {approvalState.text}
            </div>
          )}

          {pendingRequests.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-400">
              Няма чакащи заявки за отписване.
            </div>
          ) : (
            <div className="space-y-4">
              {pendingRequests.map((request) => (
                <div key={request.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-base font-semibold text-slate-900">{request.full_name}</span>
                        <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-slate-600">
                          Общежитие {request.student_dormitory || "-"}
                        </span>
                      </div>
                      <div className="text-sm text-slate-600">{request.email}</div>
                      <div className="flex items-start gap-2 text-sm text-slate-600">
                        <FaMapMarkerAlt className="mt-0.5 text-slate-400" size={12} />
                        <span>{request.location}</span>
                      </div>
                      <div className="text-xs text-slate-400">Подадена на {formatDateTimeBg(request.timestamp, { month: "long" })}</div>
                    </div>

                    {request.signature && (
                      <div className="rounded-xl border border-white bg-white px-3 py-2">
                        <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-slate-500">
                          <FaPenNib size={11} />
                          Подпис на ученика
                        </div>
                        <img src={request.signature} alt="подпис на ученика" className="h-14 max-w-44 object-contain rounded" />
                      </div>
                    )}
                  </div>

                  <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
                      <FaPenNib size={12} className="text-slate-500" />
                      Подпис на {isAdmin ? "администратора" : "възпитателя"}
                    </div>
                    <SignaturePad onChange={(signature) => setReviewSignatures((prev) => ({ ...prev, [request.id]: signature }))} />
                  </div>

                  <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                    <button
                      type="button"
                      onClick={() => handleReview(request.id, "approve")}
                      disabled={!reviewSignatures[request.id] || reviewingId === request.id}
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-green-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50"
                    >
                      <FaCheckCircle size={12} />
                      Одобри
                    </button>
                    <button
                      type="button"
                      onClick={() => handleReview(request.id, "reject")}
                      disabled={!reviewSignatures[request.id] || reviewingId === request.id}
                      className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-700 hover:bg-red-100 disabled:opacity-50"
                    >
                      <FaTimesCircle size={12} />
                      Откажи
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
            <div className="flex items-center gap-2">
              <FaUsers className="text-slate-600" />
              <h2 className="text-lg font-semibold text-slate-900">Последни статуси за седмицата</h2>
            </div>
            <div className="relative w-full sm:w-72">
              <FaSearch size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Търси по име или имейл"
                className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm focus:border-[#791c1c] focus:outline-none focus:ring-2 focus:ring-[#791c1c]/20"
              />
            </div>
          </div>

          <div className="space-y-3">
            {filteredRecords.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-400">
                Няма намерени записи.
              </div>
            ) : (
              filteredRecords.map((record) => (
                <div key={record.status_id || `${record.id}-${record.timestamp}`} className="rounded-xl border border-slate-200 p-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="font-semibold text-slate-900">{record.full_name}</div>
                      <div className="text-sm text-slate-500">{record.email}</div>
                      <div className="text-xs text-slate-400 mt-1">
                        Общежитие {record.student_dormitory || "-"} • {formatDateTimeBg(record.timestamp)}
                      </div>
                      {record.location && (
                        <div className="mt-2 flex items-start gap-2 text-sm text-slate-600">
                          <FaMapMarkerAlt size={12} className="mt-0.5 text-slate-400" />
                          <span>{record.location}</span>
                        </div>
                      )}
                    </div>

                    <span className={`self-start rounded-full px-3 py-1 text-xs font-semibold ${getApprovalBadgeClass(record.status, record.approval_status)}`}>
                      {getRecordLabel(record.status, record.approval_status)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        {isAdmin && (
          <section className="grid gap-6 xl:grid-cols-[1.05fr,0.95fr]">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
                <h2 className="text-lg font-semibold text-slate-900">Управление на потребители</h2>
                <div className="relative w-full sm:w-72">
                  <FaSearch size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    value={userSearch}
                    onChange={(event) => setUserSearch(event.target.value)}
                    placeholder="Търси потребител"
                    className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm focus:border-[#791c1c] focus:outline-none focus:ring-2 focus:ring-[#791c1c]/20"
                  />
                </div>
              </div>

              {userState.message && (
                <div
                  className={`mb-4 rounded-xl border px-4 py-3 text-sm ${
                    userState.type === "success"
                      ? "border-green-100 bg-green-50 text-green-700"
                      : "border-red-100 bg-red-50 text-red-700"
                  }`}
                >
                  {userState.message}
                </div>
              )}

              <form onSubmit={handleCreateUser} className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-2">
                <input
                  value={newUserForm.name}
                  onChange={(event) => setNewUserForm((prev) => ({ ...prev, name: event.target.value }))}
                  placeholder="Име и фамилия"
                  className="rounded-xl border border-slate-200 px-4 py-3 text-sm focus:border-[#791c1c] focus:outline-none focus:ring-2 focus:ring-[#791c1c]/20"
                />
                <input
                  type="email"
                  value={newUserForm.email}
                  onChange={(event) => setNewUserForm((prev) => ({ ...prev, email: event.target.value }))}
                  placeholder="email@example.com"
                  className="rounded-xl border border-slate-200 px-4 py-3 text-sm focus:border-[#791c1c] focus:outline-none focus:ring-2 focus:ring-[#791c1c]/20"
                />
                <input
                  type="password"
                  value={newUserForm.password}
                  onChange={(event) => setNewUserForm((prev) => ({ ...prev, password: event.target.value }))}
                  placeholder="Временна парола"
                  className="rounded-xl border border-slate-200 px-4 py-3 text-sm focus:border-[#791c1c] focus:outline-none focus:ring-2 focus:ring-[#791c1c]/20"
                />
                <select
                  value={newUserForm.role}
                  onChange={(event) => setNewUserForm((prev) => ({ ...prev, role: event.target.value }))}
                  className="rounded-xl border border-slate-200 px-4 py-3 text-sm focus:border-[#791c1c] focus:outline-none focus:ring-2 focus:ring-[#791c1c]/20"
                >
                  <option value="student">Ученик</option>
                  <option value="counselor">Възпитател</option>
                  <option value="admin">Администратор</option>
                </select>
                <select
                  value={newUserForm.dormitory}
                  onChange={(event) => setNewUserForm((prev) => ({ ...prev, dormitory: event.target.value }))}
                  className="rounded-xl border border-slate-200 px-4 py-3 text-sm focus:border-[#791c1c] focus:outline-none focus:ring-2 focus:ring-[#791c1c]/20"
                >
                  <option value="1">Общежитие 1</option>
                  <option value="2">Общежитие 2</option>
                </select>
                <button
                  type="submit"
                  disabled={userState.loading}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#791c1c] px-4 py-3 text-sm font-semibold text-white hover:bg-[#641717] disabled:opacity-60 md:col-span-2"
                >
                  <FaPlus size={11} />
                  Добави потребител
                </button>
              </form>

              <div className="mt-4 space-y-3">
                {filteredUsers.map((managedUser) => {
                  const isEditing = editingUserId === managedUser.id;

                  return (
                    <div key={managedUser.id} className="rounded-2xl border border-slate-200 p-4">
                      {isEditing ? (
                        <form onSubmit={handleUpdateUser} className="grid gap-3 md:grid-cols-2">
                          <input
                            value={editingUserForm.name}
                            onChange={(event) => setEditingUserForm((prev) => ({ ...prev, name: event.target.value }))}
                            className="rounded-xl border border-slate-200 px-4 py-3 text-sm focus:border-[#791c1c] focus:outline-none focus:ring-2 focus:ring-[#791c1c]/20"
                          />
                          <input
                            type="email"
                            value={editingUserForm.email}
                            onChange={(event) => setEditingUserForm((prev) => ({ ...prev, email: event.target.value }))}
                            className="rounded-xl border border-slate-200 px-4 py-3 text-sm focus:border-[#791c1c] focus:outline-none focus:ring-2 focus:ring-[#791c1c]/20"
                          />
                          <select
                            value={editingUserForm.role}
                            onChange={(event) => setEditingUserForm((prev) => ({ ...prev, role: event.target.value }))}
                            className="rounded-xl border border-slate-200 px-4 py-3 text-sm focus:border-[#791c1c] focus:outline-none focus:ring-2 focus:ring-[#791c1c]/20"
                          >
                            <option value="student">Ученик</option>
                            <option value="counselor">Възпитател</option>
                            <option value="admin">Администратор</option>
                          </select>
                          <select
                            value={editingUserForm.dormitory}
                            onChange={(event) => setEditingUserForm((prev) => ({ ...prev, dormitory: event.target.value }))}
                            className="rounded-xl border border-slate-200 px-4 py-3 text-sm focus:border-[#791c1c] focus:outline-none focus:ring-2 focus:ring-[#791c1c]/20"
                          >
                            <option value="1">Общежитие 1</option>
                            <option value="2">Общежитие 2</option>
                          </select>
                          <div className="md:col-span-2 flex flex-col gap-2 sm:flex-row">
                            <button type="submit" className="rounded-xl bg-[#791c1c] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#641717]">
                              Запази
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingUserId(null)}
                              className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                            >
                              Отказ
                            </button>
                          </div>
                        </form>
                      ) : (
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-semibold text-slate-900">{managedUser.full_name}</span>
                              <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${getRoleBadgeClass(managedUser.role)}`}>
                                {getRoleLabel(managedUser.role)}
                              </span>
                            </div>
                            <div className="text-sm text-slate-500">{managedUser.email}</div>
                            <div className="text-xs text-slate-400 mt-1">
                              Общежитие {managedUser.dormitory || "-"} • {formatDateOnlyBg(managedUser.created_at)}
                            </div>
                          </div>

                          <div className="flex flex-col gap-2 sm:flex-row">
                            <button
                              type="button"
                              onClick={() => startEditUser(managedUser)}
                              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                            >
                              <FaEdit size={11} />
                              Редакция
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteUser(managedUser.id)}
                              className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-100"
                            >
                              <FaTrashAlt size={11} />
                              Изтрий
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
              <div className="flex items-center justify-between gap-3 mb-4">
                <div className="flex items-center gap-2">
                  <FaEnvelope className="text-slate-600" />
                  <h2 className="text-lg font-semibold text-slate-900">Имейл лог</h2>
                </div>
                <button
                  type="button"
                  onClick={handleClearNotifications}
                  disabled={logState.loading}
                  className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-60"
                >
                  Изчисти всички
                </button>
              </div>

              <div className="mb-3 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                За реални имейли в Railway задайте `MAIL_FROM`, `MAIL_SMTP_HOST`, `MAIL_SMTP_PORT`, `MAIL_SMTP_ENCRYPTION`, `MAIL_SMTP_USERNAME`, `MAIL_SMTP_PASSWORD` и `MAIL_EHLO_DOMAIN`.
              </div>

              {logState.message && (
                <div
                  className={`mb-4 rounded-xl border px-4 py-3 text-sm ${
                    logState.type === "success"
                      ? "border-green-100 bg-green-50 text-green-700"
                      : "border-red-100 bg-red-50 text-red-700"
                  }`}
                >
                  {logState.message}
                </div>
              )}

              <div className="space-y-3">
                {notifications.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-400">
                    Няма изпратени или логнати имейли.
                  </div>
                ) : (
                  notifications.map((notification) => (
                    <div key={notification.id} className="rounded-xl border border-slate-200 p-4">
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                        <div>
                          <div className="font-semibold text-slate-900 break-words">{notification.subject}</div>
                          <div className="text-sm text-slate-500 break-words">{notification.recipient_email}</div>
                          <div className="text-xs text-slate-400 mt-1">
                            {notification.event_type} • {formatDateTimeBg(notification.created_at)}
                          </div>
                          {notification.error_message && (
                            <div className="mt-2 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-xs text-red-700">
                              {notification.error_message}
                            </div>
                          )}
                        </div>

                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                          <span
                            className={`self-start rounded-full px-2.5 py-1 text-xs font-semibold ${
                              notification.status === "sent"
                                ? "bg-green-100 text-green-700"
                                : notification.status === "failed"
                                ? "bg-red-100 text-red-700"
                                : "bg-slate-100 text-slate-600"
                            }`}
                          >
                            {notification.status}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleDeleteNotification(notification.id)}
                            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                          >
                            <FaTrashAlt size={11} />
                            Изтрий
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
};

export default AdminHome;
