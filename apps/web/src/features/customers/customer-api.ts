import { createAuthenticatedClient } from "@/lib/tenant/build-api-client";
import { ApiError } from "@/lib/api-client";
import type {
  CustomerListItem,
  CustomerDetail,
  CustomerUpsert,
  PaginatedResponse,
} from "./customer-types";

export function createCustomerApi(tenantId: string) {
  const client = createAuthenticatedClient(tenantId);

  return {
    search: (params: {
      search?: string;
      page?: number;
      pageSize?: number;
    }) => {
      const qs = new URLSearchParams();
      if (params.search) qs.set("search", params.search);
      qs.set("page", String(params.page ?? 1));
      qs.set("pageSize", String(params.pageSize ?? 20));
      return client.get<PaginatedResponse<CustomerListItem>>(
        `/api/customers?${qs.toString()}`
      );
    },

    getById: (id: string) =>
      client.get<CustomerDetail>(`/api/customers/${id}`),

    create: (data: CustomerUpsert) =>
      client.post<{ id: string }>("/api/customers", data),

    update: (id: string, data: CustomerUpsert) =>
      client.put<void>(`/api/customers/${id}`, data),
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
    return `Error ${err.status}: ${err.statusText}`;
  }
  if (err instanceof Error) return err.message;
  return "An unexpected error occurred.";
}
