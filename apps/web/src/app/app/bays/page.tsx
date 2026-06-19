"use client";

import { useTenant } from "@/lib/tenant/tenant-context";
import { BayList } from "@/features/bays/bay-list";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";

export default function BaysPage() {
  const { tenantId } = useTenant();

  if (!tenantId) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Bays</h1>
          <p className="text-sm text-muted-foreground">
            Real-time work bay management
          </p>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-4 py-12">
            <p className="text-sm text-muted-foreground text-center">
              No tenant selected. Configure your tenant ID in Settings to access
              Bays.
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
        <h1 className="text-2xl font-semibold tracking-tight">Bays</h1>
        <p className="text-sm text-muted-foreground">
          Real-time work bay management
        </p>
      </div>
      <BayList tenantId={tenantId} />
    </div>
  );
}
