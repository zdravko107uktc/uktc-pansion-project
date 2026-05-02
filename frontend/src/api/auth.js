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

export const register = async (name, email, password, role, dormitory = null) => {
    const response = await fetch(`${API_BASE}/auth?action=register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, role, dormitory }),
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
