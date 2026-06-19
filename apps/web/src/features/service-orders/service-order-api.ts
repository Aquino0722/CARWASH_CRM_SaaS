import { createAuthenticatedClient } from "@/lib/tenant/build-api-client";
import { ApiError } from "@/lib/api-client";
import type {
  ServiceOrderListItem,
  ServiceOrderDetail,
  CreateServiceOrderRequest,
  UpdateServiceOrderRequest,
  UpdateServiceOrderStatusRequest,
  PaginatedResponse,
} from "./service-order-types";

export function createServiceOrderApi(tenantId: string) {
  const client = createAuthenticatedClient(tenantId);

  return {
    search: (params: {
      search?: string;
      status?: string;
      from?: string;
      to?: string;
      page?: number;
      pageSize?: number;
    }) => {
      const qs = new URLSearchParams();
      if (params.search) qs.set("search", params.search);
      if (params.status) qs.set("status", params.status);
      if (params.from) qs.set("from", params.from);
      if (params.to) qs.set("to", params.to);
      qs.set("page", String(params.page ?? 1));
      qs.set("pageSize", String(params.pageSize ?? 20));
      return client.get<PaginatedResponse<ServiceOrderListItem>>(
        `/api/service-orders?${qs.toString()}`
      );
    },

    getById: (id: string) =>
      client.get<ServiceOrderDetail>(`/api/service-orders/${id}`),

    create: (data: CreateServiceOrderRequest) =>
      client.post<{ id: string }>("/api/service-orders", data),

    update: (id: string, data: UpdateServiceOrderRequest) =>
      client.put<void>(`/api/service-orders/${id}`, data),

    updateStatus: (id: string, data: UpdateServiceOrderStatusRequest) =>
      client.patch<void>(`/api/service-orders/${id}/status`, data),
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
    if (err.status === 409 && body?.code === "VERSION_CONFLICT")
      return "Modified by another user. Refresh and try again.";
    if (err.status === 409 && body?.code === "INVALID_STATE_TRANSITION")
      return "Cannot transition to the requested status from the current state.";
    return `Error ${err.status}: ${err.statusText}`;
  }
  if (err instanceof Error) return err.message;
  return "An unexpected error occurred.";
}
