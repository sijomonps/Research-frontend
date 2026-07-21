export type ApiListResponse<T> = {
  items: T[];
};

export type ApiItemResponse<T> = {
  item: T;
};

export type ApiMessageResponse = {
  message: string;
};

const getAuthHeaders = (): Record<string, string> => {
  if (typeof window === "undefined") return {};
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const rawBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
const fallbackBaseUrl = "/api";
const resolvedBaseUrl = (rawBaseUrl || fallbackBaseUrl).replace(/\/$/, "");

export const API_BASE_URL = resolvedBaseUrl;

const makeRequest = async <T>(
  method: string,
  path: string,
  body?: any,
  isForm = false
): Promise<T> => {
  let cleanPath = path;
  if (cleanPath.startsWith(API_BASE_URL)) {
    cleanPath = cleanPath.substring(API_BASE_URL.length);
  }
  cleanPath = cleanPath.replace(/^\/api\//, "/");
  if (!cleanPath.startsWith("/")) {
    cleanPath = "/" + cleanPath;
  }
  
  const url = `${API_BASE_URL}${cleanPath}`;

  const headers: Record<string, string> = {
    ...getAuthHeaders(),
  };

  const options: RequestInit = {
    method,
    headers,
    credentials: "include",
  };

  if (body) {
    if (isForm) {
      options.body = body;
    } else {
      headers["Content-Type"] = "application/json";
      options.body = JSON.stringify(body);
    }
  }

  const response = await fetch(url, options);

  if (!response.ok) {
    let errorMessage = `HTTP error! status: ${response.status}`;
    try {
      const data = await response.json();
      errorMessage = data.message || errorMessage;
    } catch (e) {
      // Ignore parse error, fallback to default
    }
    if (response.status === 401 || response.status === 404) {
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("auth-error", { detail: { message: errorMessage } }));
      }
    }

    throw new Error(errorMessage);
  }

  return response.json() as Promise<T>;
};

export const apiGet = async <T>(path: string, _init?: RequestInit): Promise<T> => {
  return makeRequest<T>("GET", path);
};

export const apiPostJson = async <
  TResponse,
  TBody extends Record<string, unknown> = Record<string, unknown>
>(
  path: string,
  body: TBody
): Promise<TResponse> => {
  return makeRequest<TResponse>("POST", path, body, false);
};

export const apiPatchJson = async <
  TResponse,
  TBody extends Record<string, unknown> = Record<string, unknown>
>(
  path: string,
  body: TBody,
  _init?: RequestInit
): Promise<TResponse> => {
  return makeRequest<TResponse>("PATCH", path, body, false);
};

export const apiPostForm = async <T>(path: string, body: FormData): Promise<T> => {
  return makeRequest<T>("POST", path, body, true);
};

export const apiPatchForm = async <T>(path: string, body: FormData): Promise<T> => {
  return makeRequest<T>("PATCH", path, body, true);
};

export const saveUserPreference = async (
  userId: string | undefined,
  currentPrefs: any,
  key: string,
  value: any
): Promise<any> => {
  localStorage.setItem(key, typeof value === "string" ? value : JSON.stringify(value));
  if (!userId) return null;
  try {
    const updatedPrefs = { ...(currentPrefs || {}), [key]: value };
    return await apiPatchJson(`/users/${userId}`, { preferences: updatedPrefs });
  } catch (err) {
    console.error("Failed to save preference to backend:", err);
    return null;
  }
};

export const saveUserProfileData = async (
  userId: string | undefined,
  data: {
    name?: string;
    email?: string;
    designation?: string;
    uniqueId?: string;
    avatar?: string;
    academicYear?: string;
    [key: string]: any;
  }
): Promise<any> => {
  if (!userId) return null;
  return apiPatchJson(`/users/${userId}`, data);
};

export const apiDelete = async <T>(path: string, _init?: RequestInit): Promise<T> => {
  return makeRequest<T>("DELETE", path);
};

export function transformGoogleDriveLink(url: string): string {
  if (!url) return url;
  const trimmed = url.trim();
  const matchD = trimmed.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (matchD && matchD[1]) {
    return `https://lh3.googleusercontent.com/d/${matchD[1]}`;
  }
  const matchId = trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (matchId && matchId[1]) {
    return `https://lh3.googleusercontent.com/d/${matchId[1]}`;
  }
  return trimmed;
}

export function getUserAvatarUrl(u: any): string {
  if (!u) return "";
  const raw = u.avatar || u.preferences?.scholar_avatar || u.preferences?.faculty_avatar || u.preferences?.research_guide_avatar || u.preferences?.coordinator_avatar || "";
  return transformGoogleDriveLink(raw);
}
