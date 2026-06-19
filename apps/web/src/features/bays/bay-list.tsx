"use client";

import { useState, useEffect, useCallback } from "react";
import { createBayApi, formatApiError } from "./bay-api";
import { BayFormDialog } from "./bay-form-dialog";
import type { BayListItem } from "./bay-types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const STATUS_LABELS: Record<string, string> = {
  available: "Available",
  occupied: "Occupied",
  blocked: "Blocked",
  maintenance: "Maintenance",
};

const STATUS_COLORS: Record<string, string> = {
  available: "bg-green-700",
  occupied: "bg-amber-600",
  blocked: "bg-red-700",
  maintenance: "bg-gray-600",
};

const ALL_STATUSES = ["available", "occupied", "blocked", "maintenance"];

export function BayList({ tenantId }: { tenantId: string }) {
  const [bays, setBays] = useState<BayListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingBay, setEditingBay] = useState<BayListItem | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);

  const fetchBays = useCallback(async () => {
    setLoading(true);
    setError(null);
    setStatusError(null);
    try {
      const api = createBayApi(tenantId);
      const result = await api.search({
        status: statusFilter || undefined,
      });
      setBays(result.items);
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setLoading(false);
    }
  }, [tenantId, statusFilter]);

  useEffect(() => {
    fetchBays();
  }, [fetchBays]);

  const handleStatusUpdate = async (id: string, newStatus: string) => {
    setStatusError(null);
    try {
      const api = createBayApi(tenantId);
      await api.updateStatus(id, { status: newStatus });
      await fetchBays();
    } catch (err) {
      setStatusError(formatApiError(err));
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="flex gap-2 flex-1 items-center">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground shadow-sm focus:outline-none focus:ring-1 focus:ring-ring max-w-[180px]"
          >
            <option value="">All statuses</option>
            {ALL_STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s] ?? s}
              </option>
            ))}
          </select>
          {statusFilter && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setStatusFilter("")}
            >
              Clear
            </Button>
          )}
        </div>
        <Button size="sm" onClick={() => setDialogOpen(true)}>
          New Bay
        </Button>
      </div>

      {statusError && (
        <div className="flex items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4">
          <Badge variant="destructive">Error</Badge>
          <p className="text-sm flex-1">{statusError}</p>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4">
          <Badge variant="destructive">Error</Badge>
          <p className="text-sm flex-1">{error}</p>
          <Button variant="outline" size="sm" onClick={fetchBays}>
            Retry
          </Button>
        </div>
      )}

      {loading && (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-md" />
          ))}
        </div>
      )}

      {!loading && !error && bays.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-center text-sm text-muted-foreground">
          <p>No bays yet.</p>
          <Button
            variant="link"
            size="sm"
            onClick={() => setDialogOpen(true)}
          >
            Create your first bay
          </Button>
        </div>
      )}

      {!loading && !error && bays.length > 0 && (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Sort Order</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="w-[80px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {bays.map((b) => (
                <TableRow key={b.id}>
                  <TableCell className="font-medium">{b.name}</TableCell>
                  <TableCell className="text-muted-foreground text-xs max-w-[200px] truncate">
                    {b.description ?? "\u2014"}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <Badge
                        className={`${STATUS_COLORS[b.status] ?? "bg-gray-500"} text-white text-xs w-fit`}
                      >
                        {STATUS_LABELS[b.status] ?? b.status}
                      </Badge>
                      <div className="flex flex-wrap gap-1">
                        {ALL_STATUSES.filter((s) => s !== b.status).map(
                          (s) => (
                            <Button
                              key={s}
                              variant="outline"
                              size="sm"
                              className="h-5 text-[10px] px-1.5"
                              onClick={() => handleStatusUpdate(b.id, s)}
                            >
                              {STATUS_LABELS[s] ?? s}
                            </Button>
                          )
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {b.sortOrder}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {new Date(b.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setEditingBay(b);
                        setDialogOpen(true);
                      }}
                    >
                      Edit
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Pagination - not needed, bays are unpaginated */}

      <BayFormDialog
        open={dialogOpen}
        onOpenChange={(v) => {
          setDialogOpen(v);
          if (!v) setEditingBay(null);
        }}
        tenantId={tenantId}
        bay={editingBay}
        onSuccess={fetchBays}
      />
    </div>
  );
}
