"use client";

import { useTenant } from "@/lib/tenant/tenant-context";

export function TopbarTenant() {
  const { tenantId } = useTenant();

  if (!tenantId) {
    return (
      <span className="font-medium text-muted-foreground">
        No tenant selected
      </span>
    );
  }

  const shortId = tenantId.length > 8 ? `${tenantId.slice(0, 8)}…` : tenantId;

  return <span className="font-medium text-foreground">{shortId}</span>;
}
