/**
 * Centralized API client — matches full-stack-ai-agent-template pattern.
 * Uses fetch with automatic token refresh on 401.
 */

const API_BASE =
  typeof window !== "undefined"
    ? (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000") + "/api/v1"
    : (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000") + "/api/v1";

// ── Token storage ─────────────────────────────────────────────────────────────

export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("access_token");
}

export function setTokens(accessToken: string, refreshToken: string): void {
  localStorage.setItem("access_token", accessToken);
  localStorage.setItem("refresh_token", refreshToken);
}

export function clearTokens(): void {
  localStorage.removeItem("access_token");
  localStorage.removeItem("refresh_token");
}

export function getRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("refresh_token");
}

// ── HTTP client ───────────────────────────────────────────────────────────────

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return null;
  try {
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
    if (!res.ok) {
      clearTokens();
      return null;
    }
    const data = await res.json();
    setTokens(data.access_token, data.refresh_token);
    return data.access_token;
  } catch {
    clearTokens();
    return null;
  }
}

interface RequestOptions extends RequestInit {
  skipAuth?: boolean;
}

export async function apiRequest<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const { skipAuth, ...fetchOptions } = options;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(fetchOptions.headers as Record<string, string>),
  };

  if (!skipAuth) {
    const token = getAccessToken();
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
  }

  let res = await fetch(`${API_BASE}${endpoint}`, { ...fetchOptions, headers });

  // Auto-refresh on 401
  if (res.status === 401 && !skipAuth) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      headers["Authorization"] = `Bearer ${newToken}`;
      res = await fetch(`${API_BASE}${endpoint}`, { ...fetchOptions, headers });
    }
  }

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || `HTTP ${res.status}`);
  }

  // Handle 204 No Content
  if (res.status === 204) return {} as T;

  return res.json();
}

// ── Auth API ──────────────────────────────────────────────────────────────────

export const authApi = {
  register: (data: { username: string; email: string; password: string; phone?: string }) =>
    apiRequest("/auth/register", {
      method: "POST",
      body: JSON.stringify(data),
      skipAuth: true,
    }),

  login: (email: string, password: string) =>
    apiRequest("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
      skipAuth: true,
    }),

  logout: (refreshToken: string) =>
    apiRequest("/auth/logout", {
      method: "POST",
      body: JSON.stringify({ refresh_token: refreshToken }),
    }),

  me: () => apiRequest("/auth/me"),

  changePassword: (data: {
    old_password: string;
    new_password: string;
    confirm_password: string;
  }) =>
    apiRequest("/auth/change-password", { method: "POST", body: JSON.stringify(data) }),
};

// ── Chat sessions API ─────────────────────────────────────────────────────────

export const chatApi = {
  listSessions: () => apiRequest("/chat/sessions"),

  getSession: (id: string) => apiRequest(`/chat/sessions/${id}`),

  upsertSession: (
    id: string,
    data: { title?: string; messages: Array<{ role: string; content: string }> }
  ) =>
    apiRequest(`/chat/sessions/${id}`, { method: "PATCH", body: JSON.stringify(data) }),

  deleteSession: (id: string) =>
    apiRequest(`/chat/sessions/${id}`, { method: "DELETE" }),
};

// ── Cases API ─────────────────────────────────────────────────────────────────

export const casesApi = {
  list: (category?: string) =>
    apiRequest(`/cases${category ? `?category=${category}` : ""}`),

  get: (id: string) => apiRequest(`/cases/${id}`),

  search: (q: string, category?: string) =>
    apiRequest(`/search?q=${encodeURIComponent(q)}${category ? `&category=${category}` : ""}`),
};

// ── Tools API ─────────────────────────────────────────────────────────────────

export const toolsApi = {
  calculateDeposit: (data: object) =>
    apiRequest("/deposit-calc/calculate", { method: "POST", body: JSON.stringify(data) }),

  generateDocument: (data: { doc_type: string; form_data: object }) =>
    apiRequest("/documents/generate", { method: "POST", body: JSON.stringify(data) }),

  myDocuments: () => apiRequest("/documents/my"),

  listCities: () => apiRequest("/cities"),

  getCity: (id: string) => apiRequest(`/cities/${id}`),

  listBlacklist: (params?: { q?: string; city?: string }) => {
    const qs = new URLSearchParams(params as Record<string, string>).toString();
    return apiRequest(`/blacklist${qs ? `?${qs}` : ""}`);
  },

  listNews: () => apiRequest("/news"),
};
