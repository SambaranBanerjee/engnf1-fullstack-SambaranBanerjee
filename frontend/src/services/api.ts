import { ApiClientError, type ApiErrorBody } from "../types/api";

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || "http://localhost:4000"
).replace(/\/+$/, "");

let getTokenFn: () => string | null = () => null;
let onUnauthorizedFn: () => void = () => {};

export function configureApiClient(handlers: {
  getToken: () => string | null;
  onUnauthorized: () => void;
}): void {
  getTokenFn = handlers.getToken;
  onUnauthorizedFn = handlers.onUnauthorized;
}

export interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  body?: unknown;
  headers?: Record<string, string>;
  query?: Record<string, string | number | boolean | undefined | null>;
}

function buildUrl(
  path: string,
  query?: Record<string, string | number | boolean | undefined | null>,
): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const url = new URL(`${API_BASE_URL}${normalizedPath}`);

  if (query) {
    for (const [key, val] of Object.entries(query)) {
      if (val !== undefined && val !== null && String(val).trim() !== "") {
        url.searchParams.set(key, String(val));
      }
    }
  }
  return url.toString();
}

export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const { method = "GET", body, headers = {}, query } = options;
  const token = getTokenFn();

  const finalHeaders: Record<string, string> = {
    Accept: "application/json",
    ...headers,
  };

  if (body !== undefined) {
    finalHeaders["Content-Type"] = "application/json";
  }

  if (token) {
    finalHeaders.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(buildUrl(path, query), {
    method,
    headers: finalHeaders,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    let errorCode = "REQUEST_FAILED";
    let errorMessage = `Request failed with status ${response.status}`;

    try {
      const parsed = (await response.json()) as Partial<ApiErrorBody>;
      if (parsed.error?.code) errorCode = parsed.error.code;
      if (parsed.error?.message) errorMessage = parsed.error.message;
    } catch {
      // Ignore non-JSON error body
    }

    if (response.status === 401) {
      onUnauthorizedFn();
    }

    throw new ApiClientError(response.status, errorCode, errorMessage);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}