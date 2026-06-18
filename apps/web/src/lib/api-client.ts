export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public statusText: string,
    public body: unknown
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export interface ApiClientConfig {
  baseUrl: string;
  getAccessToken: () => Promise<string | null>;
  getTenantId: () => string | null;
}

export function createApiClient(config: ApiClientConfig) {
  const { baseUrl, getAccessToken, getTenantId } = config;

  async function request<T>(
    method: string,
    path: string,
    body?: unknown
  ): Promise<T> {
    const token = await getAccessToken();
    const tenantId = getTenantId();

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    if (tenantId) {
      headers["X-Tenant-Id"] = tenantId;
    }

    const response = await fetch(`${baseUrl}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      let errorBody: unknown;
      try {
        errorBody = await response.json();
      } catch {
        errorBody = await response.text().catch(() => null);
      }
      throw new ApiError(
        `API ${method} ${path} failed with ${response.status}`,
        response.status,
        response.statusText,
        errorBody
      );
    }

    if (response.status === 204) {
      return undefined as T;
    }

    return response.json() as Promise<T>;
  }

  return {
    get: <T>(path: string) => request<T>("GET", path),
    post: <T>(path: string, body?: unknown) => request<T>("POST", path, body),
    put: <T>(path: string, body?: unknown) => request<T>("PUT", path, body),
    patch: <T>(path: string, body?: unknown) =>
      request<T>("PATCH", path, body),
  };
}
