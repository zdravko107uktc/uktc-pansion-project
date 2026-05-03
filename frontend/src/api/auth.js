const API_BASE = (process.env.REACT_APP_API_URL || "/api").replace(/\/+$/, "");

export { API_BASE };

const parseJson = async (response) => {
  try {
    return await response.json();
  } catch {
    return {};
  }
};

const requestJson = async (url, options = {}, { throwOnError = true } = {}) => {
  const response = await fetch(url, options);
  const data = await parseJson(response);

  if (!response.ok && throwOnError) {
    const error = new Error(data?.message || "Request failed");
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
};

const authHeaders = (token, extra = {}) => ({
  ...extra,
  Authorization: `Bearer ${token}`,
});

const jsonHeaders = (token) => authHeaders(token, { "Content-Type": "application/json" });

export const login = async (email, password) =>
  requestJson(
    `${API_BASE}/auth?action=login`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    },
    { throwOnError: false }
  );

export const register = async (name, email, password, dormitory = null) =>
  requestJson(
    `${API_BASE}/auth?action=register`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password, dormitory }),
    },
    { throwOnError: false }
  );

export const requestPasswordReset = async (email) =>
  requestJson(
    `${API_BASE}/auth?action=request_password_reset`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    }
  );

export const resetPassword = async (token, password) =>
  requestJson(
    `${API_BASE}/auth?action=reset_password`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password }),
    }
  );

export const getUserInfo = async (token) =>
  requestJson(
    `${API_BASE}/user`,
    {
      headers: authHeaders(token),
    },
    { throwOnError: false }
  );

export const getPendingRequests = async (token) =>
  requestJson(`${API_BASE}/auth?action=get_pending_requests`, {
    headers: authHeaders(token, { Accept: "application/json" }),
  });

export const approveUnenrollment = async (token, statusId) =>
  requestJson(`${API_BASE}/auth?action=approve_unenrollment`, {
    method: "POST",
    headers: jsonHeaders(token),
    body: JSON.stringify({ statusId }),
  });

export const rejectUnenrollment = async (token, statusId) =>
  requestJson(`${API_BASE}/auth?action=reject_unenrollment`, {
    method: "POST",
    headers: jsonHeaders(token),
    body: JSON.stringify({ statusId }),
  });

export const getCalendarData = async (token, month) =>
  requestJson(`${API_BASE}/auth?action=get_calendar_data&month=${encodeURIComponent(month)}`, {
    headers: authHeaders(token, { Accept: "application/json" }),
  });

export const createCalendarEvent = async (token, payload) =>
  requestJson(`${API_BASE}/auth?action=create_calendar_event`, {
    method: "POST",
    headers: jsonHeaders(token),
    body: JSON.stringify(payload),
  });

export const getRecentNotifications = async (token) =>
  requestJson(`${API_BASE}/auth?action=get_recent_notifications`, {
    headers: authHeaders(token, { Accept: "application/json" }),
  });

export const updateCalendarEvent = async (token, payload) =>
  requestJson(`${API_BASE}/auth?action=update_calendar_event`, {
    method: "POST",
    headers: jsonHeaders(token),
    body: JSON.stringify(payload),
  });

export const deleteCalendarEvent = async (token, eventId) =>
  requestJson(`${API_BASE}/auth?action=delete_calendar_event`, {
    method: "POST",
    headers: jsonHeaders(token),
    body: JSON.stringify({ eventId }),
  });

export const getUsers = async (token) =>
  requestJson(`${API_BASE}/auth?action=get_users`, {
    headers: authHeaders(token, { Accept: "application/json" }),
  });

export const createManagedUser = async (token, payload) =>
  requestJson(`${API_BASE}/auth?action=create_managed_user`, {
    method: "POST",
    headers: jsonHeaders(token),
    body: JSON.stringify(payload),
  });

export const updateUser = async (token, payload) =>
  requestJson(`${API_BASE}/auth?action=update_user`, {
    method: "POST",
    headers: jsonHeaders(token),
    body: JSON.stringify(payload),
  });

export const deleteUser = async (token, userId) =>
  requestJson(`${API_BASE}/auth?action=delete_user`, {
    method: "POST",
    headers: jsonHeaders(token),
    body: JSON.stringify({ userId }),
  });

export const deleteNotification = async (token, notificationId) =>
  requestJson(`${API_BASE}/auth?action=delete_notification`, {
    method: "POST",
    headers: jsonHeaders(token),
    body: JSON.stringify({ notificationId }),
  });

export const clearNotifications = async (token) =>
  requestJson(`${API_BASE}/auth?action=clear_notifications`, {
    method: "POST",
    headers: jsonHeaders(token),
    body: JSON.stringify({}),
  });
