// API client for the Spring Boot backend (REST, /api/v1).
// In development the SPA is served behind nginx which proxies /api -> backend:8080.
// In production set REACT_APP_API_URL to the backend origin (e.g. https://api.example.com).
const ORIGIN = (process.env.REACT_APP_API_URL || "").replace(/\/+$/, "");
const API_BASE = `${ORIGIN}/api/v1`;

export const SYSTEM_ADMIN_EMAIL = (process.env.REACT_APP_SYSTEM_ADMIN_EMAIL || "zdravko.h.anev@gmail.com")
  .trim()
  .toLowerCase();

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

const jsonBody = (token, method, body) => ({
  method,
  headers: jsonHeaders(token),
  body: JSON.stringify(body),
});

export const login = async (email, password) =>
  requestJson(
    `${API_BASE}/auth/login`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    },
    { throwOnError: false }
  );

export const register = async (name, email, password, dormitory = null) =>
  requestJson(
    `${API_BASE}/auth/register`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password, dormitory }),
    },
    { throwOnError: false }
  );

export const requestPasswordReset = async (email) =>
  requestJson(`${API_BASE}/auth/password-reset/request`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });

export const resetPassword = async (token, password) =>
  requestJson(`${API_BASE}/auth/password-reset/confirm`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, password }),
  });

export const verifyEmail = async (token) =>
  requestJson(`${API_BASE}/auth/verify-email`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token }),
  });

export const getUserInfo = async (token) =>
  requestJson(
    `${API_BASE}/users/me`,
    {
      headers: authHeaders(token),
    },
    { throwOnError: false }
  );

export const getCurrentUser = async (token) => {
  const data = await getUserInfo(token);
  return data?.user || null;
};

export const getMyHistory = async (token) =>
  requestJson(`${API_BASE}/enrollment/history`, {
    headers: authHeaders(token, { Accept: "application/json" }),
  });

export const updateStatus = async (token, payload) =>
  requestJson(`${API_BASE}/enrollment/status`, jsonBody(token, "POST", payload));

export const getPendingRequests = async (token) =>
  requestJson(`${API_BASE}/enrollment/requests/pending`, {
    headers: authHeaders(token, { Accept: "application/json" }),
  });

export const getWeekRecords = async (token) =>
  requestJson(`${API_BASE}/enrollment/records/week`, {
    headers: authHeaders(token, { Accept: "application/json" }),
  });

export const approveUnenrollment = async (token, statusId, reviewSignature) =>
  requestJson(
    `${API_BASE}/enrollment/requests/${statusId}/approve`,
    jsonBody(token, "POST", { reviewSignature })
  );

export const rejectUnenrollment = async (token, statusId, reviewSignature) =>
  requestJson(
    `${API_BASE}/enrollment/requests/${statusId}/reject`,
    jsonBody(token, "POST", { reviewSignature })
  );

export const getCalendarData = async (token, month) =>
  requestJson(`${API_BASE}/calendar?month=${encodeURIComponent(month)}`, {
    headers: authHeaders(token, { Accept: "application/json" }),
  });

export const createCalendarEvent = async (token, payload) =>
  requestJson(`${API_BASE}/calendar/events`, jsonBody(token, "POST", payload));

export const updateCalendarEvent = async (token, payload) => {
  const { eventId, ...body } = payload;
  return requestJson(`${API_BASE}/calendar/events/${eventId}`, jsonBody(token, "PUT", body));
};

export const deleteCalendarEvent = async (token, eventId) =>
  requestJson(`${API_BASE}/calendar/events/${eventId}`, {
    method: "DELETE",
    headers: authHeaders(token),
  });

export const getRecentNotifications = async (token) =>
  requestJson(`${API_BASE}/notifications`, {
    headers: authHeaders(token, { Accept: "application/json" }),
  });

export const getUsers = async (token) =>
  requestJson(`${API_BASE}/users`, {
    headers: authHeaders(token, { Accept: "application/json" }),
  });

export const createManagedUser = async (token, payload) =>
  requestJson(`${API_BASE}/users`, jsonBody(token, "POST", payload));

export const updateUser = async (token, payload) => {
  const { userId, ...body } = payload;
  return requestJson(`${API_BASE}/users/${userId}`, jsonBody(token, "PUT", body));
};

export const deleteUser = async (token, userId) =>
  requestJson(`${API_BASE}/users/${userId}`, {
    method: "DELETE",
    headers: authHeaders(token),
  });

export const deleteNotification = async (token, notificationId) =>
  requestJson(`${API_BASE}/notifications/${notificationId}`, {
    method: "DELETE",
    headers: authHeaders(token),
  });

export const clearNotifications = async (token) =>
  requestJson(`${API_BASE}/notifications`, {
    method: "DELETE",
    headers: authHeaders(token),
  });
