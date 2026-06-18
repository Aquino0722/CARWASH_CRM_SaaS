"use client";

import { useState } from "react";
import { useTenant } from "@/lib/tenant/tenant-context";
import { createAuthenticatedClient } from "@/lib/tenant/build-api-client";
import { ApiError } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function SettingsPage() {
  const { tenantId, setTenantId, clearTenantId } = useTenant();
  const [inputValue, setInputValue] = useState(tenantId ?? "");
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<unknown>(null);
  const [testError, setTestError] = useState<string | null>(null);

  const handleSave = () => {
    setTenantId(inputValue);
    setTestResult(null);
    setTestError(null);
  };

  const handleClear = () => {
    setInputValue("");
    clearTenantId();
    setTestResult(null);
    setTestError(null);
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    setTestError(null);

    try {
      const client = createAuthenticatedClient(tenantId);
      const data = await client.get<unknown>("/api/me");
      setTestResult(data);
    } catch (err) {
      if (err instanceof ApiError) {
        const body =
          typeof err.body === "object" && err.body !== null
            ? JSON.stringify(err.body, null, 2)
            : String(err.body ?? "No response body");
        setTestError(`HTTP ${err.status} ${err.statusText}\n${body}`);
      } else {
        setTestError(String(err));
      }
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Manage your workspace settings
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Developer Tenant ID</CardTitle>
          <CardDescription>
            Set a tenant UUID to include{" "}
            <code className="text-xs bg-muted px-1 rounded">
              X-Tenant-Id
            </code>{" "}
            in API requests. This is a temporary developer bridge — full
            tenant onboarding is not yet implemented.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="00000000-0000-0000-0000-000000000000"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              className="font-mono text-sm"
            />
            <Button onClick={handleSave} variant="default">
              Save
            </Button>
            <Button onClick={handleClear} variant="outline">
              Clear
            </Button>
          </div>
          {tenantId ? (
            <p className="text-sm text-muted-foreground">
              Active tenant:{" "}
              <span className="font-mono text-foreground">{tenantId}</span>
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              No tenant selected. API calls will not include{" "}
              <code className="text-xs bg-muted px-1 rounded">
                X-Tenant-Id
              </code>
              .
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Backend Connectivity</CardTitle>
          <CardDescription>
            Test the connection to the .NET API. Base URL:{" "}
            <code className="text-xs bg-muted px-1 rounded">
              {process.env.NEXT_PUBLIC_API_BASE_URL ?? "not set"}
            </code>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            onClick={handleTest}
            disabled={testing}
            variant="secondary"
          >
            {testing ? "Testing…" : "Test /api/me"}
          </Button>

          {testResult !== null && (
            <div className="space-y-2">
              <Badge variant="default" className="bg-green-700">
                Success
              </Badge>
              <pre className="text-xs bg-muted p-3 rounded-md overflow-x-auto font-mono">
                {JSON.stringify(testResult, null, 2)}
              </pre>
            </div>
          )}

          {testError && (
            <div className="space-y-2">
              <Badge variant="destructive">Error</Badge>
              <pre className="text-xs bg-muted p-3 rounded-md overflow-x-auto font-mono text-destructive">
                {testError}
              </pre>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
