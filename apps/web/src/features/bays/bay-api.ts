import { createAuthenticatedClient } from "@/lib/tenant/build-api-client";
import { ApiError } from "@/lib/api-client";
import type {
  BayListItem,
  BayDetail,
  CreateBayRequest,
  UpdateBayRequest,
  UpdateBayStatusRequest,
} from "./bay-types";

export function createBayApi(tenantId: string) {
  const client = createAuthenticatedClient(tenantId);

  return {
    search: (params?: { status?: string }) => {
      const qs = new URLSearchParams();
      if (params?.status) qs.set("status", params.status);
      const query = qs.toString();
      return client.get<{ items: BayListItem[] }>(
        `/api/bays${query ? "?" + query : ""}`
      );
    },

    getById: (id: string) => client.get<BayDetail>(`/api/bays/${id}`),

    create: (data: CreateBayRequest) =>
      client.post<{ id: string }>("/api/bays", data),

    update: (id: string, data: UpdateBayRequest) =>
      client.put<void>(`/api/bays/${id}`, data),

    updateStatus: (id: string, data: UpdateBayStatusRequest) =>
      client.patch<void>(`/api/bays/${id}/status`, data),
  };
}

export function formatApiError(err: unknown): string {
  if (err instanceof ApiError) {
    const body = err.body as Record<string, unknown> | null;
    if (typeof body?.message === "string") return body.message;
    if (typeof body?.title === "string") return body.title;
    if (err.status === 428)
      return "Tenant access is required. Go to Settings to configure your tenant ID.";
    if (err.status === 401) return "Authentication expired. Please log in again.";
    if (err.status === 403) return "You do not have access to this tenant.";
    if (err.status === 409 && body?.error === "DUPLICATE_BAY_NAME")
      return "A bay with this name already exists in your tenant.";
    return `Error ${err.status}: ${err.statusText}`;
  }
  if (err instanceof Error) return err.message;
  return "An unexpected error occurred.";
}
