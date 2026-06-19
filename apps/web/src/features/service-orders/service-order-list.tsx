"use client";

import { useState, useEffect, useCallback } from "react";
import { createServiceOrderApi, formatApiError } from "./service-order-api";
import { ServiceOrderFormDialog } from "./service-order-form-dialog";
import {
  getStatusLabel,
  getStatusColor,
  getAllowedNextStatuses,
} from "./service-order-status";
import type { ServiceOrderListItem } from "./service-order-types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

export function ServiceOrderList({ tenantId }: { tenantId: string }) {
  const [orders, setOrders] = useState<ServiceOrderListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const [totalCount, setTotalCount] = useState(0);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [transitioningId, setTransitioningId] = useState<string | null>(null);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const api = createServiceOrderApi(tenantId);
      const result = await api.search({
        search: search || undefined,
        page,
        pageSize,
      });
      setOrders(result.items);
      setTotalCount(result.totalCount);
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setLoading(false);
    }
  }, [tenantId, search, page, pageSize]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  };

  const clearSearch = () => {
    setSearchInput("");
    setSearch("");
    setPage(1);
  };

  const handleStatusUpdate = async (orderId: string, newStatus: string) => {
    setTransitioningId(orderId);
    setError(null);

    try {
      const api = createServiceOrderApi(tenantId);
      const detail = await api.getById(orderId);
      await api.updateStatus(orderId, {
        currentVersion: detail.version,
        status: newStatus,
      });
      await fetchOrders();
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setTransitioningId(null);
    }
  };

  const totalPages = Math.ceil(totalCount / pageSize) || 1;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <form onSubmit={handleSearch} className="flex gap-2 flex-1">
          <Input
            placeholder="Search by title, customer or plate..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="max-w-xs"
          />
          <Button type="submit" variant="secondary" size="sm">
            Search
          </Button>
          {search && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={clearSearch}
            >
              Clear
            </Button>
          )}
        </form>
        <Button size="sm" onClick={() => setDialogOpen(true)}>
          New Service Order
        </Button>
      </div>

      {error && (
        <div className="flex items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4">
          <Badge variant="destructive">Error</Badge>
          <p className="text-sm flex-1">{error}</p>
          <Button variant="outline" size="sm" onClick={fetchOrders}>
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

      {!loading && !error && orders.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-center text-sm text-muted-foreground">
          {search ? (
            <>
              <p>No service orders match your search.</p>
              <Button variant="link" size="sm" onClick={clearSearch}>
                Clear search
              </Button>
            </>
          ) : (
            <>
              <p>No service orders yet.</p>
              <Button
                variant="link"
                size="sm"
                onClick={() => setDialogOpen(true)}
              >
                Create your first service order
              </Button>
            </>
          )}
        </div>
      )}

      {!loading && !error && orders.length > 0 && (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Status</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Vehicle</TableHead>
                <TableHead>Est. Price</TableHead>
                <TableHead>Scheduled</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="w-[80px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((o) => {
                const nextStatuses = getAllowedNextStatuses(o.status);
                const vehicleDisplay = [o.plate, o.vehicleMake, o.vehicleModel]
                  .filter(Boolean)
                  .join(" ");
                const isTransitioning = transitioningId === o.id;

                return (
                  <TableRow key={o.id}>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <Badge
                          className={`${getStatusColor(o.status)} text-white text-xs w-fit`}
                        >
                          {getStatusLabel(o.status)}
                        </Badge>
                        {nextStatuses.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {nextStatuses.map((next) => (
                              <Button
                                key={next}
                                variant="outline"
                                size="sm"
                                className="h-5 text-[10px] px-1.5"
                                disabled={isTransitioning}
                                onClick={() =>
                                  handleStatusUpdate(o.id, next)
                                }
                              >
                                {isTransitioning
                                  ? "..."
                                  : getStatusLabel(next)}
                              </Button>
                            ))}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">{o.title}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {o.customerName}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs">
                      {vehicleDisplay || "\u2014"}
                    </TableCell>
                    <TableCell>
                      {o.estimatedPrice != null
                        ? `$${o.estimatedPrice.toFixed(2)}`
                        : "\u2014"}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {o.scheduledAt
                        ? new Date(o.scheduledAt).toLocaleDateString()
                        : "\u2014"}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(o.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditingId(o.id);
                          setDialogOpen(true);
                        }}
                      >
                        Edit
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {!loading && !error && totalCount > 0 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <p>
            Page {page} of {totalPages} ({totalCount} total)
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      <ServiceOrderFormDialog
        open={dialogOpen}
        onOpenChange={(v) => {
          setDialogOpen(v);
          if (!v) setEditingId(null);
        }}
        tenantId={tenantId}
        orderId={editingId}
        onSuccess={fetchOrders}
      />
    </div>
  );
}
