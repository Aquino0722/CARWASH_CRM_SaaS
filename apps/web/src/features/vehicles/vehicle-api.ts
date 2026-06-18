import { createAuthenticatedClient } from "@/lib/tenant/build-api-client";
import { ApiError } from "@/lib/api-client";
import type {
  VehicleListItem,
  VehicleDetail,
  VehicleUpsert,
  PaginatedResponse,
} from "./vehicle-types";

export function createVehicleApi(tenantId: string) {
  const client = createAuthenticatedClient(tenantId);

  return {
    search: (params: {
      search?: string;
      customerId?: string;
      page?: number;
      pageSize?: number;
    }) => {
      const qs = new URLSearchParams();
      if (params.search) qs.set("search", params.search);
      if (params.customerId) qs.set("customerId", params.customerId);
      qs.set("page", String(params.page ?? 1));
      qs.set("pageSize", String(params.pageSize ?? 20));
      return client.get<PaginatedResponse<VehicleListItem>>(
        `/api/vehicles?${qs.toString()}`
      );
    },

    getById: (id: string) =>
      client.get<VehicleDetail>(`/api/vehicles/${id}`),

    create: (data: VehicleUpsert) =>
      client.post<{ id: string }>("/api/vehicles", data),

    update: (id: string, data: VehicleUpsert) =>
      client.put<void>(`/api/vehicles/${id}`, data),
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
    if (err.status === 409) return "A vehicle with this plate already exists in your tenant.";
    return `Error ${err.status}: ${err.statusText}`;
  }
  if (err instanceof Error) return err.message;
  return "An unexpected error occurred.";
}
