import { createAuthenticatedClient } from "@/lib/tenant/build-api-client";
import { ApiError } from "@/lib/api-client";
import type {
  WorkItemListItem,
  WorkItemDetail,
  CreateWorkItemRequest,
  UpdateWorkItemRequest,
  MoveWorkItemRequest,
  UpdateWorkItemStatusRequest,
  PaginatedResponse,
} from "./work-item-types";

export function createWorkItemApi(tenantId: string) {
  const client = createAuthenticatedClient(tenantId);

  return {
    search: (params: {
      serviceOrderId?: string;
      bayId?: string;
      status?: string;
      page?: number;
      pageSize?: number;
    }) => {
      const qs = new URLSearchParams();
      if (params.serviceOrderId) qs.set("serviceOrderId", params.serviceOrderId);
      if (params.bayId) qs.set("bayId", params.bayId);
      if (params.status) qs.set("status", params.status);
      qs.set("page", String(params.page ?? 1));
      qs.set("pageSize", String(params.pageSize ?? 20));
      return client.get<PaginatedResponse<WorkItemListItem>>(
        `/api/work-items?${qs.toString()}`
      );
    },

    getById: (id: string) =>
      client.get<WorkItemDetail>(`/api/work-items/${id}`),

    create: (data: CreateWorkItemRequest) =>
      client.post<{ id: string }>("/api/work-items", data),

    update: (id: string, data: UpdateWorkItemRequest) =>
      client.put<void>(`/api/work-items/${id}`, data),

    move: (id: string, data: MoveWorkItemRequest) =>
      client.patch<void>(`/api/work-items/${id}/move`, data),

    updateStatus: (id: string, data: UpdateWorkItemStatusRequest) =>
      client.patch<void>(`/api/work-items/${id}/status`, data),
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
    if (err.status === 409 && body?.error === "VERSION_CONFLICT")
      return "Modified by another user. Refresh and try again.";
    if (err.status === 400 && body?.error === "VALIDATION_ERROR")
      return body.message as string ?? "Invalid value.";
    return `Error ${err.status}: ${err.statusText}`;
  }
  if (err instanceof Error) return err.message;
  return "An unexpected error occurred.";
}
