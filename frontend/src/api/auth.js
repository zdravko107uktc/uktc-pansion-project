const API_BASE = process.env.REACT_APP_API_URL || "/api";

export { API_BASE };

export const login = async (email, password) => {
    const response = await fetch(`${API_BASE}/auth?action=login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
    });
    return response.json();
};

export const register = async (name, email, password, dormitory = null) => {
    const response = await fetch(`${API_BASE}/auth?action=register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, dormitory }),
    });
    return response.json();
};

export const getUserInfo = async (token) => {
    const response = await fetch(`${API_BASE}/user`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    return response.json();
};

export const startShift = async (token, dormitory) => {
    const response = await fetch(`${API_BASE}/auth?action=start_shift`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ dormitory }),
    });
    return response.json();
};

export const endShift = async (token) => {
    const response = await fetch(`${API_BASE}/auth?action=end_shift`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({}),
    });
    return response.json();
};

export const getPendingRequests = async (token) => {
    const response = await fetch(`${API_BASE}/auth?action=get_pending_requests`, {
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    });
    return response.json();
};

export const approveUnenrollment = async (token, statusId) => {
    const response = await fetch(`${API_BASE}/auth?action=approve_unenrollment`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ statusId }),
    });
    return response.json();
};

export const rejectUnenrollment = async (token, statusId) => {
    const response = await fetch(`${API_BASE}/auth?action=reject_unenrollment`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ statusId }),
    });
    return response.json();
};

export const getCalendarData = async (token, month) => {
    const response = await fetch(`${API_BASE}/auth?action=get_calendar_data&month=${encodeURIComponent(month)}`, {
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    });
    return response.json();
};

export const createCalendarEvent = async (token, payload) => {
    const response = await fetch(`${API_BASE}/auth?action=create_calendar_event`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
    });
    return response.json();
};

export const getRecentNotifications = async (token) => {
    const response = await fetch(`${API_BASE}/auth?action=get_recent_notifications`, {
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    });
    return response.json();
};

export const updateCalendarEvent = async (token, payload) => {
    const response = await fetch(`${API_BASE}/auth?action=update_calendar_event`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
    });
    return response.json();
};

export const deleteCalendarEvent = async (token, eventId) => {
    const response = await fetch(`${API_BASE}/auth?action=delete_calendar_event`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ eventId }),
    });
    return response.json();
};

export const getUsers = async (token) => {
    const response = await fetch(`${API_BASE}/auth?action=get_users`, {
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    });
    return response.json();
};

export const createManagedUser = async (token, payload) => {
    const response = await fetch(`${API_BASE}/auth?action=create_managed_user`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
    });
    return response.json();
};

export const updateUser = async (token, payload) => {
    const response = await fetch(`${API_BASE}/auth?action=update_user`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
    });
    return response.json();
};

export const deleteUser = async (token, userId) => {
    const response = await fetch(`${API_BASE}/auth?action=delete_user`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ userId }),
    });
    return response.json();
};

export const deleteNotification = async (token, notificationId) => {
    const response = await fetch(`${API_BASE}/auth?action=delete_notification`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ notificationId }),
    });
    return response.json();
};

export const clearNotifications = async (token) => {
    const response = await fetch(`${API_BASE}/auth?action=clear_notifications`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({}),
    });
    return response.json();
};
