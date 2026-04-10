const rawApiUrl = import.meta.env.VITE_API_URL;

if (!rawApiUrl) {
  console.error("VITE_API_URL no esta configurada.");
}

export const API_URL = (rawApiUrl || "").replace(/\/$/, "");

export class ApiError extends Error {
  constructor(message, status, payload) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.payload = payload;
  }
}

export async function apiRequest(path, options = {}) {
  const { token, headers, ...requestOptions } = options;
  const url = `${API_URL}${path}`;

  console.info("[api]", requestOptions.method || "GET", url);

  const response = await fetch(url, {
    ...requestOptions,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
  });

  const contentType = response.headers.get("content-type") || "";
  const payload = contentType.includes("application/json")
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    const detail = typeof payload === "object" ? payload.detail : payload;
    console.error("[api:error]", response.status, detail);
    throw new ApiError(detail || "Error de servidor", response.status, payload);
  }

  console.info("[api:ok]", response.status, path);
  return payload;
}
