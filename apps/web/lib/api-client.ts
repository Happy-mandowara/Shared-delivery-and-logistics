/**
 * Frontend API client for NationX Shared Delivery (/api/v1)
 */

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

class ApiClient {
  private token: string | null = null;

  constructor() {
    if (typeof window !== "undefined") {
      this.token = localStorage.getItem("nationx_token");
    }
  }

  setToken(token: string | null) {
    this.token = token;
    if (typeof window !== "undefined") {
      if (token) {
        localStorage.setItem("nationx_token", token);
        document.cookie = `session=${token}; path=/; max-age=604800; SameSite=Lax`;
      } else {
        localStorage.removeItem("nationx_token");
        document.cookie = "session=; path=/; max-age=0";
      }
    }
  }

  getToken(): string | null {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("nationx_token");
      if (stored) return stored;
    }
    return this.token;
  }

  async request<T = any>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
    const headers = new Headers(options.headers || {});
    if (!headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }

    const currentToken = this.getToken();
    if (currentToken && !headers.has("Authorization")) {
      headers.set("Authorization", `Bearer ${currentToken}`);
    }

    const url = endpoint.startsWith("/api") ? endpoint : `/api/v1${endpoint.startsWith("/") ? "" : "/"}${endpoint}`;

    try {
      const res = await fetch(url, {
        ...options,
        headers,
      });

      const json = await res.json().catch(() => ({
        success: false,
        error: { code: "INVALID_RESPONSE", message: `HTTP status ${res.status}` },
      }));

      return json;
    } catch (err: any) {
      return {
        success: false,
        error: {
          code: "NETWORK_ERROR",
          message: err.message || "Failed to communicate with API server",
        },
      };
    }
  }

  async get<T = any>(endpoint: string, options?: RequestInit): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: "GET", ...options });
  }

  async post<T = any>(endpoint: string, body?: any, options?: RequestInit): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
      ...options,
    });
  }

  async patch<T = any>(endpoint: string, body?: any, options?: RequestInit): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: "PATCH",
      body: body ? JSON.stringify(body) : undefined,
      ...options,
    });
  }

  async put<T = any>(endpoint: string, body?: any, options?: RequestInit): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: "PUT",
      body: body ? JSON.stringify(body) : undefined,
      ...options,
    });
  }

  async delete<T = any>(endpoint: string, options?: RequestInit): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: "DELETE", ...options });
  }

  async login(email: string, password: string) {
    const res = await this.post<{ token: string; user: any }>("/auth/login", { email, password });
    if (res.success && res.data?.token) {
      this.setToken(res.data.token);
    }
    return res;
  }

  async getMe() {
    return this.get<{ user: any }>("/auth/me");
  }

  async logout() {
    try {
      await this.post("/auth/logout");
    } catch {
      // Ignore network errors on logout
    } finally {
      this.setToken(null);
    }
  }
}

export const api = new ApiClient();
export const apiClient = api;
