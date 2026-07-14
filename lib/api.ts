import Cookies from "js-cookie";

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
  let token = typeof window !== "undefined" ? Cookies.get("token") : undefined;
  if (!token && typeof window !== "undefined") {
    token = localStorage.getItem("token") || undefined;
  }
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
    department?: string;
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
