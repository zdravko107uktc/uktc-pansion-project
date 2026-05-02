import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaUserGraduate,
  FaUserSlash,
  FaSearch,
  FaSyncAlt,
  FaMapMarkerAlt,
  FaPenNib,
  FaClock,
  FaEnvelope,
  FaUsers,
  FaTrashAlt,
  FaEdit,
  FaPlus,
} from "react-icons/fa";
import {
  API_BASE,
  approveUnenrollment,
  rejectUnenrollment,
  getCalendarData,
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
  getRecentNotifications,
  getUsers,
  createManagedUser,
  updateUser,
  deleteUser,
  deleteNotification,
  clearNotifications,
} from "../api/auth";
import CalendarPanel from "./CalendarPanel";

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

const ADMIN_EMAIL = "zdravko.h.anev@gmail.com";

const getRoleLabel = (role) => {
  if (role === "admin") return "Администратор";
  if (role === "counselor") return "Възпитател";
  return "Студент";
};

const AdminHome = () => {
  const [allRecords, setAllRecords] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [managedUsers, setManagedUsers] = useState([]);
  const [userName, setUserName] = useState("");
  const [userRole, setUserRole] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [userSearch, setUserSearch] = useState("");
  const [lastUpdated, setLastUpdated] = useState(null);
  const [approvalMessage, setApprovalMessage] = useState({ text: "", type: "" });
  const [calendarMonth, setCalendarMonth] = useState(currentMonthValue());
  const [calendarData, setCalendarData] = useState({ dailySummary: [], events: [] });
  const [eventState, setEventState] = useState({ loading: false, message: "", type: "" });
  const [userState, setUserState] = useState({ loading: false, message: "", type: "" });
  const [logState, setLogState] = useState({ loading: false, message: "", type: "" });
  const [newUserForm, setNewUserForm] = useState(emptyManagedUser);
  const [editingUserId, setEditingUserId] = useState(null);
  const [editingUserForm, setEditingUserForm] = useState(emptyManagedUser);
  const navigate = useNavigate();
  const token = localStorage.getItem("token");
  const isAdmin = userRole === "admin";

  const fetchRecords = useCallback(async () => {
    const response = await fetch(`${API_BASE}/auth?action=get_week_records`, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    });
    const data = await response.json();
    setAllRecords(Array.isArray(data) ? data : []);
  }, [token]);

  const fetchPending = useCallback(async () => {
    const response = await fetch(`${API_BASE}/auth?action=get_pending_requests`, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    });
    const data = await response.json();
    setPendingRequests(Array.isArray(data) ? data : []);
  }, [token]);

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

  const fetchNotificationLog = useCallback(async () => {
    const data = await getRecentNotifications(token);
    setNotifications(Array.isArray(data) ? data : []);
  }, [token]);

  const fetchUsersList = useCallback(async () => {
    const data = await getUsers(token);
    setManagedUsers(Array.isArray(data) ? data : []);
  }, [token]);

  const refreshEverything = useCallback(async () => {
    const tasks = [fetchRecords(), fetchPending(), fetchCalendar(calendarMonth)];
    if (isAdmin) {
      tasks.push(fetchNotificationLog(), fetchUsersList());
    }
    await Promise.all(tasks);
    setLastUpdated(new Date());
  }, [calendarMonth, fetchCalendar, fetchNotificationLog, fetchPending, fetchRecords, fetchUsersList, isAdmin]);

  const bootstrap = useCallback(async () => {
    const userResponse = await fetch(`${API_BASE}/user`, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    });
    const userData = await userResponse.json();

    if (!userResponse.ok || !["admin", "counselor"].includes(userData?.user?.role)) {
      navigate("/");
      return;
    }

    setUserName(userData.user.full_name || "");
    setUserRole(userData.user.role || "");

    const tasks = [fetchRecords(), fetchPending(), fetchCalendar(calendarMonth)];
    if (userData.user.role === "admin") {
      tasks.push(fetchNotificationLog(), fetchUsersList());
    }

    await Promise.all(tasks);
    setLastUpdated(new Date());
  }, [calendarMonth, fetchCalendar, fetchNotificationLog, fetchPending, fetchRecords, fetchUsersList, navigate, token]);

  useEffect(() => {
    if (!token) {
      navigate("/login");
      return;
    }

    bootstrap()
      .catch(() => {
        localStorage.removeItem("token");
        navigate("/login");
      })
      .finally(() => setLoading(false));
  }, [bootstrap, navigate, token]);

  useEffect(() => {
    if (!token) return;
    fetchCalendar(calendarMonth).catch(() => {});
  }, [calendarMonth, fetchCalendar, token]);

  const handleApprove = async (statusId) => {
    setApprovalMessage({ text: "", type: "" });
    try {
      const data = await approveUnenrollment(token, statusId);
      setApprovalMessage({ text: data.message || "Заявката е одобрена.", type: "success" });
      await refreshEverything();
    } catch {
      setApprovalMessage({ text: "Грешка при одобрение.", type: "error" });
    }
  };

  const handleReject = async (statusId) => {
    setApprovalMessage({ text: "", type: "" });
    try {
      const data = await rejectUnenrollment(token, statusId);
      setApprovalMessage({ text: data.message || "Заявката е отказана.", type: "success" });
      await refreshEverything();
    } catch {
      setApprovalMessage({ text: "Грешка при отказване.", type: "error" });
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshEverything();
    setRefreshing(false);
  };

  const handleCreateEvent = async (payload) => {
    setEventState({ loading: true, message: "", type: "" });
    try {
      const data = await createCalendarEvent(token, payload);
      setEventState({
        loading: false,
        message: data.message || "Събитието е създадено.",
        type: data.event ? "success" : "error",
      });
      if (isAdmin) {
        await Promise.all([fetchCalendar(calendarMonth), fetchNotificationLog()]);
      } else {
        await fetchCalendar(calendarMonth);
      }
    } catch {
      setEventState({ loading: false, message: "Грешка при създаване на събитие.", type: "error" });
    }
  };

  const handleUpdateEvent = async (payload) => {
    setEventState({ loading: true, message: "", type: "" });
    try {
      const data = await updateCalendarEvent(token, payload);
      setEventState({
        loading: false,
        message: data.message || "Събитието е редактирано.",
        type: data.event ? "success" : "error",
      });
      if (isAdmin) {
        await Promise.all([fetchCalendar(calendarMonth), fetchNotificationLog()]);
      } else {
        await fetchCalendar(calendarMonth);
      }
    } catch {
      setEventState({ loading: false, message: "Грешка при редакция на събитие.", type: "error" });
    }
  };

  const handleDeleteEvent = async (eventId) => {
    setEventState({ loading: true, message: "", type: "" });
    try {
      const data = await deleteCalendarEvent(token, eventId);
      setEventState({ loading: false, message: data.message || "Събитието е изтрито.", type: "success" });
      if (isAdmin) {
        await Promise.all([fetchCalendar(calendarMonth), fetchNotificationLog()]);
      } else {
        await fetchCalendar(calendarMonth);
      }
    } catch {
      setEventState({ loading: false, message: "Грешка при изтриване на събитие.", type: "error" });
    }
  };

  const handleCreateUser = async (event) => {
    event.preventDefault();
    setUserState({ loading: true, message: "", type: "" });
    try {
      const payload = {
        ...newUserForm,
        dormitory: newUserForm.dormitory,
      };
      const data = await createManagedUser(token, payload);
      setUserState({
        loading: false,
        message: data.message || "Потребителят е създаден.",
        type: data.user ? "success" : "error",
      });
      if (!data.user) {
        return;
      }
      setNewUserForm(emptyManagedUser);
      await Promise.all([fetchUsersList(), fetchNotificationLog()]);
    } catch {
      setUserState({ loading: false, message: "Грешка при създаване на потребител.", type: "error" });
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

    setUserState({ loading: true, message: "", type: "" });
    try {
      const data = await updateUser(token, {
        userId: editingUserId,
        name: editingUserForm.name,
        email: editingUserForm.email,
        role: editingUserForm.role,
        dormitory: editingUserForm.email === ADMIN_EMAIL ? null : editingUserForm.dormitory,
      });
      setUserState({
        loading: false,
        message: data.message || "Потребителят е обновен.",
        type: data.user ? "success" : "error",
      });
      if (!data.user) {
        return;
      }
      setEditingUserId(null);
      await Promise.all([fetchUsersList(), fetchNotificationLog()]);
    } catch {
      setUserState({ loading: false, message: "Грешка при обновяване на потребителя.", type: "error" });
    }
  };

  const handleDeleteUser = async (userId) => {
    setUserState({ loading: true, message: "", type: "" });
    try {
      const data = await deleteUser(token, userId);
      setUserState({ loading: false, message: data.message || "Потребителят е изтрит.", type: "success" });
      await Promise.all([fetchUsersList(), fetchNotificationLog()]);
    } catch {
      setUserState({ loading: false, message: "Грешка при изтриване на потребителя.", type: "error" });
    }
  };

  const handleDeleteNotification = async (notificationId) => {
    setLogState({ loading: true, message: "", type: "" });
    try {
      const data = await deleteNotification(token, notificationId);
      setLogState({ loading: false, message: data.message || "Известието е изтрито.", type: "success" });
      await fetchNotificationLog();
    } catch {
      setLogState({ loading: false, message: "Грешка при изтриване на известие.", type: "error" });
    }
  };

  const handleClearNotifications = async () => {
    setLogState({ loading: true, message: "", type: "" });
    try {
      const data = await clearNotifications(token);
      setLogState({ loading: false, message: data.message || "Логовете са изчистени.", type: "success" });
      await fetchNotificationLog();
    } catch {
      setLogState({ loading: false, message: "Грешка при изчистване на логовете.", type: "error" });
    }
  };

  const filteredRecords = useMemo(
    () =>
      allRecords.filter(
        (record) =>
          record.full_name?.toLowerCase().includes(search.toLowerCase()) ||
          record.email?.toLowerCase().includes(search.toLowerCase())
      ),
    [allRecords, search]
  );

  const filteredUsers = useMemo(
    () =>
      managedUsers.filter(
        (user) =>
          user.full_name?.toLowerCase().includes(userSearch.toLowerCase()) ||
          user.email?.toLowerCase().includes(userSearch.toLowerCase())
      ),
    [managedUsers, userSearch]
  );

  const enrolled = filteredRecords.filter((record) => record.status === "enrolled");
  const unenrolled = filteredRecords.filter((record) => record.status === "unenrolled");
  const totalEnrolled = allRecords.filter((record) => record.status === "enrolled").length;
  const totalUnenrolled = allRecords.filter((record) => record.status === "unenrolled").length;

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-slate-400 text-sm">Зареждане...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6 sm:space-y-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
              {isAdmin ? "Административен панел" : "Панел на възпитател"}
            </h1>
            <p className="text-gray-400 text-sm mt-0.5">
              {isAdmin
                ? `Само ${userName || "администраторът"} управлява одобренията, потребителите, известията и календара.`
                : `Възпитателят ${userName || ""} вижда заявките и присъствията само за своето общежитие.`}
            </p>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-slate-50 transition-colors shadow-sm disabled:opacity-60"
          >
            <FaSyncAlt size={12} className={refreshing ? "animate-spin" : ""} />
            {lastUpdated
              ? `Актуализирано в ${lastUpdated.toLocaleTimeString("bg-BG", { hour: "2-digit", minute: "2-digit" })}`
              : "Опресни"}
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          <StatCard value={totalEnrolled} label="Записани" color="green" />
          <StatCard value={totalUnenrolled} label="Отписани" color="red" />
          <StatCard value={pendingRequests.length} label="Чакащи заявки" color="brand" />
          <StatCard value={isAdmin ? managedUsers.length : filteredRecords.length} label={isAdmin ? "Потребители" : "Ученици"} color="blue" />
        </div>

        <CalendarPanel
          title={isAdmin ? "Административен календар" : "Календар на общежитието"}
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

        {isAdmin && (
          <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-6 space-y-5">
            <div className="flex items-center gap-2.5">
              <FaUsers className="text-[#791c1c]" size={16} />
              <h2 className="text-base font-semibold text-gray-800">Управление на потребители</h2>
            </div>

            <form onSubmit={handleCreateUser} className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
              <input
                type="text"
                placeholder="Пълно име"
                value={newUserForm.name}
                onChange={(e) => setNewUserForm((prev) => ({ ...prev, name: e.target.value }))}
                className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#791c1c]/20"
                required
              />
              <input
                type="email"
                placeholder="Имейл"
                value={newUserForm.email}
                onChange={(e) => setNewUserForm((prev) => ({ ...prev, email: e.target.value }))}
                className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#791c1c]/20"
                required
              />
              <input
                type="password"
                placeholder="Временна парола"
                value={newUserForm.password}
                onChange={(e) => setNewUserForm((prev) => ({ ...prev, password: e.target.value }))}
                className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#791c1c]/20"
                required
              />
              <select
                value={newUserForm.role}
                onChange={(e) => setNewUserForm((prev) => ({ ...prev, role: e.target.value }))}
                className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#791c1c]/20"
              >
                <option value="student">Студент</option>
                <option value="counselor">Възпитател</option>
              </select>
              <select
                value={newUserForm.dormitory}
                onChange={(e) => setNewUserForm((prev) => ({ ...prev, dormitory: e.target.value }))}
                className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#791c1c]/20"
              >
                <option value="1">Общежитие 1</option>
                <option value="2">Общежитие 2</option>
              </select>
              <button
                type="submit"
                disabled={userState.loading}
                className="w-full px-5 py-3 bg-[#791c1c] text-white rounded-xl font-semibold text-sm hover:bg-[#6b1818] transition flex items-center justify-center gap-2 disabled:opacity-60"
              >
                <FaPlus size={12} />
                Създай
              </button>
            </form>

            {userState.message && <StatusMessage type={userState.type}>{userState.message}</StatusMessage>}

            <div className="relative">
              <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={13} />
              <input
                type="text"
                placeholder="Търси потребители по име или имейл..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#791c1c]/20 text-sm"
              />
            </div>

            <div className="space-y-3">
              {filteredUsers.map((managedUser) => {
                const isEditing = editingUserId === managedUser.id;
                const isAdminUser = managedUser.email === ADMIN_EMAIL;
                const formValues = isEditing
                  ? editingUserForm
                  : {
                      name: managedUser.full_name,
                      email: managedUser.email,
                      role: managedUser.role || "student",
                      dormitory: managedUser.dormitory || "1",
                    };

                return (
                  <div key={managedUser.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    {isEditing ? (
                      <form onSubmit={handleUpdateUser} className="grid gap-3 md:grid-cols-2 xl:grid-cols-[1fr_1fr_12rem_12rem_auto]">
                        <input
                          type="text"
                          value={formValues.name}
                          onChange={(e) => setEditingUserForm((prev) => ({ ...prev, name: e.target.value }))}
                          className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm"
                          required
                        />
                        <input
                          type="email"
                          value={formValues.email}
                          onChange={(e) => setEditingUserForm((prev) => ({ ...prev, email: e.target.value }))}
                          className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm"
                          required
                          disabled={isAdminUser}
                        />
                        {!isAdminUser && (
                          <>
                            <select
                              value={formValues.role}
                              onChange={(e) => setEditingUserForm((prev) => ({ ...prev, role: e.target.value }))}
                              className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm"
                            >
                              <option value="student">Студент</option>
                              <option value="counselor">Възпитател</option>
                            </select>
                            <select
                              value={formValues.dormitory}
                              onChange={(e) => setEditingUserForm((prev) => ({ ...prev, dormitory: e.target.value }))}
                              className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm"
                            >
                              <option value="1">Общежитие 1</option>
                              <option value="2">Общежитие 2</option>
                            </select>
                          </>
                        )}
                        <div className="flex flex-col sm:flex-row gap-2">
                          <button type="submit" className="px-4 py-3 bg-[#791c1c] text-white rounded-xl text-sm font-semibold">
                            Запази
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingUserId(null)}
                            className="px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-600"
                          >
                            Отказ
                          </button>
                        </div>
                      </form>
                    ) : (
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                        <div className="min-w-0">
                          <div className="font-semibold text-gray-800 break-words">{managedUser.full_name}</div>
                          <div className="text-sm text-slate-500 break-all">{managedUser.email}</div>
                          <div className="text-xs text-slate-400 mt-1">
                            {managedUser.role === "admin"
                              ? "Администратор"
                              : `${getRoleLabel(managedUser.role)} • Общежитие ${managedUser.dormitory || "-"}`}
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2 w-full sm:w-auto sm:flex sm:items-center">
                          <button
                            type="button"
                            onClick={() => startEditUser(managedUser)}
                            className="px-3 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-white text-xs font-semibold flex items-center justify-center gap-2"
                          >
                            <FaEdit size={11} />
                            Редакция
                          </button>
                          {!isAdminUser && (
                            <button
                              type="button"
                              onClick={() => handleDeleteUser(managedUser.id)}
                              className="px-3 py-2 rounded-lg border border-red-100 bg-red-50 text-red-600 hover:bg-red-100 text-xs font-semibold flex items-center justify-center gap-2"
                            >
                              <FaTrashAlt size={11} />
                              Изтрий
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        <div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center mb-4">
            <div className="flex items-center gap-2.5">
              <FaClock className="text-amber-500" size={16} />
              <h2 className="text-base font-semibold text-gray-800">Чакащи заявки за отписване</h2>
            </div>
            {pendingRequests.length > 0 && (
              <span className="self-start sm:self-auto px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">
                {pendingRequests.length}
              </span>
            )}
          </div>

          {approvalMessage.text && <StatusMessage type={approvalMessage.type}>{approvalMessage.text}</StatusMessage>}

          {pendingRequests.length === 0 ? (
            <EmptyCard text="Няма чакащи заявки" />
          ) : (
            <ResponsiveTable>
              <table className="min-w-[44rem] w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-amber-50/60">
                    <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">Студент</th>
                    <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">Имейл</th>
                    <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">Локация</th>
                    <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">Подпис</th>
                    <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">Час</th>
                    <th className="text-right px-5 py-3.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">Действие</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {pendingRequests.map((request) => (
                    <tr key={request.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 font-semibold text-sm flex-shrink-0">
                            {request.full_name?.charAt(0)?.toUpperCase()}
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">{request.full_name}</div>
                            <div className="text-xs text-slate-400">Общежитие {request.student_dormitory || "-"}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-slate-500">{request.email}</td>
                      <td className="px-5 py-4">
                        {request.location ? (
                          <span className="flex items-center gap-1.5 text-slate-600 text-sm">
                            <FaMapMarkerAlt size={11} className="text-slate-400" />
                            {request.location}
                          </span>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <SignatureCell value={request.signature} />
                      </td>
                      <td className="px-5 py-4 text-slate-500 text-xs">
                        {request.timestamp
                          ? new Date(request.timestamp).toLocaleString("bg-BG", {
                              day: "numeric",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "—"}
                      </td>
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleApprove(request.id)}
                            className="px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white text-xs font-semibold rounded-lg transition"
                          >
                            Одобри
                          </button>
                          <button
                            onClick={() => handleReject(request.id)}
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
            </ResponsiveTable>
          )}
        </div>

        {isAdmin && (
          <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <FaEnvelope className="text-[#791c1c]" size={16} />
                <h2 className="text-base font-semibold text-gray-800">Email логове</h2>
              </div>
              <button
                type="button"
                onClick={handleClearNotifications}
                className="w-full sm:w-auto px-4 py-2 rounded-xl border border-red-100 bg-red-50 text-red-600 text-sm font-semibold hover:bg-red-100"
              >
                Изчисти всички
              </button>
            </div>
            <p className="text-xs text-slate-400 mb-4">
              Ако статусът е <span className="font-semibold">failed</span>, в червено ще видиш причината. Ако е <span className="font-semibold">logged</span>, известието е записано само в базата.
            </p>
            {logState.message && <StatusMessage type={logState.type}>{logState.message}</StatusMessage>}
            {notifications.length === 0 ? (
              <p className="text-sm text-slate-400">Все още няма записани известия.</p>
            ) : (
              <div className="space-y-3">
                {notifications.map((notification) => (
                  <div key={notification.id} className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <div className="font-medium text-gray-800 break-words">{notification.subject}</div>
                        <div className="text-sm text-slate-500 mt-1 break-all">{notification.recipient_email}</div>
                        <div className="text-xs text-slate-400 mt-1">
                          {notification.event_type} • {new Date(notification.created_at).toLocaleString("bg-BG")}
                        </div>
                        {notification.error_message && <div className="text-xs text-red-500 mt-2 break-words">{notification.error_message}</div>}
                      </div>
                      <div className="grid grid-cols-2 gap-2 w-full sm:w-auto sm:flex sm:items-center">
                        <span
                          className={`text-xs font-semibold px-2 py-2 sm:py-1 rounded-full text-center ${
                            notification.status === "sent"
                              ? "bg-green-100 text-green-700"
                              : notification.status === "logged"
                              ? "bg-amber-100 text-amber-700"
                              : "bg-red-100 text-red-600"
                          }`}
                        >
                          {notification.status}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleDeleteNotification(notification.id)}
                          className="px-3 py-2 rounded-lg border border-red-100 bg-red-50 text-red-600 hover:bg-red-100 text-xs font-semibold flex items-center justify-center gap-2"
                        >
                          <FaTrashAlt size={11} />
                          Изтрий
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        <div className="relative">
          <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={13} />
          <input
            type="text"
            placeholder="Търси присъствия по име или имейл..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#791c1c]/20 focus:border-[#791c1c] shadow-sm transition text-sm"
          />
        </div>

        <section className="space-y-4">
          <div className="flex items-center gap-2.5">
            <FaUserGraduate className="text-green-500" size={16} />
            <h2 className="text-base font-semibold text-gray-800">Записани ученици</h2>
            <Badge count={enrolled.length} color="green" />
          </div>
          <StudentTable data={enrolled} showLocation={false} emptyText="Няма записани ученици тази седмица" />
        </section>

        <section className="space-y-4">
          <div className="flex items-center gap-2.5">
            <FaUserSlash className="text-red-500" size={16} />
            <h2 className="text-base font-semibold text-gray-800">Отписани ученици</h2>
            <Badge count={unenrolled.length} color="red" />
          </div>
          <StudentTable data={unenrolled} showLocation showSignature emptyText="Няма отписани ученици тази седмица" />
        </section>
      </div>
    </div>
  );
};

const StatusMessage = ({ type, children }) => (
  <div
    className={`rounded-xl border px-4 py-3 text-sm ${
      type === "success" ? "bg-green-50 border-green-100 text-green-700" : "bg-red-50 border-red-100 text-red-600"
    }`}
  >
    {children}
  </div>
);

const EmptyCard = ({ text }) => (
  <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center shadow-sm">
    <div className="text-3xl mb-2">✓</div>
    <p className="text-slate-400 text-sm">{text}</p>
  </div>
);

const ResponsiveTable = ({ children }) => (
  <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
    <div className="rounded-2xl border border-slate-200 overflow-hidden shadow-sm">{children}</div>
  </div>
);

const SignatureCell = ({ value }) => {
  if (!value) return <span className="text-slate-300">—</span>;
  if (value.startsWith("data:")) {
    return <img src={value} alt="подпис" className="h-8 max-w-[8rem] object-contain rounded border border-slate-100" />;
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
    blue: "text-sky-700 bg-sky-50 border-sky-100",
  };
  return (
    <div className={`rounded-2xl border p-4 sm:p-5 shadow-sm ${colors[color]}`}>
      <div className="text-2xl sm:text-3xl font-black">{value}</div>
      <div className="text-xs sm:text-sm font-medium mt-1 opacity-70">{label}</div>
    </div>
  );
};

const Badge = ({ count, color }) => {
  const colors = {
    green: "bg-green-100 text-green-700",
    red: "bg-red-100 text-red-700",
  };
  return <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${colors[color]}`}>{count}</span>;
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
    <ResponsiveTable>
      <table className="min-w-[40rem] w-full text-sm">
        <thead>
          <tr className="border-b border-slate-100 bg-slate-50/80">
            <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">#</th>
            <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">Ученик</th>
            <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">Имейл</th>
            <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">Дата и час</th>
            {showLocation && (
              <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">Локация</th>
            )}
            {showSignature && (
              <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">Подпис</th>
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {data.map((entry, index) => (
            <tr key={`${entry.id}_${index}`} className="hover:bg-slate-50/50 transition-colors">
              <td className="px-5 py-4 text-slate-300 text-xs font-medium">{index + 1}</td>
              <td className="px-5 py-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-semibold text-sm flex-shrink-0">
                    {entry.full_name?.charAt(0)?.toUpperCase()}
                  </div>
                  <span className="font-medium text-gray-900">{entry.full_name}</span>
                </div>
              </td>
              <td className="px-5 py-4 text-slate-500">{entry.email}</td>
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
                <td className="px-5 py-4">
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
                <td className="px-5 py-4">
                  <SignatureCell value={entry.signature} />
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </ResponsiveTable>
  );
};

export default AdminHome;
