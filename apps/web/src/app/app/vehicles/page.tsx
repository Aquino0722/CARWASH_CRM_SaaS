"use client";

import { useTenant } from "@/lib/tenant/tenant-context";
import { VehicleList } from "@/features/vehicles/vehicle-list";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";

export default function VehiclesPage() {
  const { tenantId } = useTenant();

  if (!tenantId) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Vehicles</h1>
          <p className="text-sm text-muted-foreground">
            Track vehicle clinical history and inspections
          </p>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-4 py-12">
            <p className="text-sm text-muted-foreground text-center">
              No tenant selected. Configure your tenant ID in Settings to access
              Vehicles.
            </p>
            <Button asChild>
              <Link href="/app/settings">Go to Settings</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Vehicles</h1>
        <p className="text-sm text-muted-foreground">
          Track vehicle clinical history and inspections
        </p>
      </div>
      <VehicleList tenantId={tenantId} />
    </div>
  );
}
