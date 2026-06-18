import { createClient } from "@/lib/supabase/client";
import { createApiClient } from "@/lib/api-client";

export function createAuthenticatedClient(tenantId?: string | null) {
  const supabase = createClient();

  return createApiClient({
    baseUrl:
      process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000",
    getAccessToken: async () => {
      const { data } = await supabase.auth.getSession();
      return data.session?.access_token ?? null;
    },
    getTenantId: () => tenantId ?? null,
  });
}
