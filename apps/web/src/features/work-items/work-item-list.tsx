"use client";

import { useState, useEffect, useCallback } from "react";
import { createWorkItemApi, formatApiError } from "./work-item-api";
import { createBayApi } from "@/features/bays/bay-api";
import { WorkItemFormDialog } from "./work-item-form-dialog";
import { WorkItemMoveDialog } from "./work-item-move-dialog";
import { ServiceOrderSelect } from "./service-order-select";
import { getStatusLabel, getStatusColor, ALL_STATUSES } from "./work-item-status";
import type { WorkItemListItem } from "./work-item-types";
import type { BayListItem } from "@/features/bays/bay-types";
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

export function WorkItemList({ tenantId }: { tenantId: string }) {
  const [items, setItems] = useState<WorkItemListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bays, setBays] = useState<BayListItem[]>([]);

  // Filters
  const [filterServiceOrderId, setFilterServiceOrderId] = useState<string | null>(null);
  const [filterServiceOrderLabel, setFilterServiceOrderLabel] = useState("");
  const [filterBayId, setFilterBayId] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  // Pagination
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const [totalCount, setTotalCount] = useState(0);

  // Dialogs
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [moveDialogOpen, setMoveDialogOpen] = useState(false);
  const [movingItem, setMovingItem] = useState<WorkItemListItem | null>(null);
  const [transitioningId, setTransitioningId] = useState<string | null>(null);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const api = createWorkItemApi(tenantId);
      const result = await api.search({
        serviceOrderId: filterServiceOrderId ?? undefined,
        bayId: filterBayId || undefined,
        status: filterStatus || undefined,
        page,
        pageSize,
      });
      setItems(result.items);
      setTotalCount(result.totalCount);
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setLoading(false);
    }
  }, [tenantId, filterServiceOrderId, filterBayId, filterStatus, page, pageSize]);

  const fetchBays = useCallback(async () => {
    try {
      const api = createBayApi(tenantId);
      const result = await api.search();
      setBays(result.items);
    } catch {
      // Bays fetch is secondary, ignore errors
    }
  }, [tenantId]);

  useEffect(() => {
    fetchItems();
    fetchBays();
  }, [fetchItems, fetchBays]);

  const handleStatusUpdate = async (itemId: string, newStatus: string) => {
    setTransitioningId(itemId);
    setError(null);

    try {
      const api = createWorkItemApi(tenantId);
      const detail = await api.getById(itemId);
      await api.updateStatus(itemId, {
        currentVersion: detail.version,
        status: newStatus,
      });
      await fetchItems();
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setTransitioningId(null);
    }
  };

  const clearFilters = () => {
    setFilterServiceOrderId(null);
    setFilterServiceOrderLabel("");
    setFilterBayId("");
    setFilterStatus("");
    setPage(1);
  };

  const totalPages = Math.ceil(totalCount / pageSize) || 1;

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex-1 min-w-[200px]">
          <label className="block text-xs text-muted-foreground mb-1">
            Service Order
          </label>
          <ServiceOrderSelect
            tenantId={tenantId}
            serviceOrderId={filterServiceOrderId}
            serviceOrderLabel={filterServiceOrderLabel}
            onChange={(id, label) => {
              setFilterServiceOrderId(id);
              setFilterServiceOrderLabel(label);
              setPage(1);
            }}
          />
        </div>

        <div>
          <label className="block text-xs text-muted-foreground mb-1">
            Bay
          </label>
          <select
            value={filterBayId}
            onChange={(e) => {
              setFilterBayId(e.target.value);
              setPage(1);
            }}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground shadow-sm focus:outline-none focus:ring-1 focus:ring-ring min-w-[140px]"
          >
            <option value="">All bays</option>
            {bays.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs text-muted-foreground mb-1">
            Status
          </label>
          <select
            value={filterStatus}
            onChange={(e) => {
              setFilterStatus(e.target.value);
              setPage(1);
            }}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground shadow-sm focus:outline-none focus:ring-1 focus:ring-ring min-w-[130px]"
          >
            <option value="">All statuses</option>
            {ALL_STATUSES.map((s) => (
              <option key={s} value={s}>
                {getStatusLabel(s)}
              </option>
            ))}
          </select>
        </div>

        {(filterServiceOrderId || filterBayId || filterStatus) && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            Clear filters
          </Button>
        )}

        <Button size="sm" onClick={() => setFormDialogOpen(true)}>
          New Work Item
        </Button>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4">
          <Badge variant="destructive">Error</Badge>
          <p className="text-sm flex-1">{error}</p>
          <Button variant="outline" size="sm" onClick={fetchItems}>
            Retry
          </Button>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-md" />
          ))}
        </div>
      )}

      {/* Empty */}
      {!loading && !error && items.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-center text-sm text-muted-foreground">
          {filterServiceOrderId || filterBayId || filterStatus ? (
            <>
              <p>No work items match your filters.</p>
              <Button variant="link" size="sm" onClick={clearFilters}>
                Clear filters
              </Button>
            </>
          ) : (
            <>
              <p>No work items yet.</p>
              <Button
                variant="link"
                size="sm"
                onClick={() => setFormDialogOpen(true)}
              >
                Create your first work item
              </Button>
            </>
          )}
        </div>
      )}

      {/* Table */}
      {!loading && !error && items.length > 0 && (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Status</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Bay</TableHead>
                <TableHead>Position</TableHead>
                <TableHead>Started At</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="w-[130px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((wi) => {
                const isTransitioning = transitioningId === wi.id;
                const bayName =
                  bays.find((b) => b.id === wi.bayId)?.name ?? wi.bayId ?? "\u2014";

                return (
                  <TableRow key={wi.id}>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <Badge
                          className={`${getStatusColor(wi.status)} text-white text-xs w-fit`}
                        >
                          {getStatusLabel(wi.status)}
                        </Badge>
                        <div className="flex flex-wrap gap-1">
                          {ALL_STATUSES.filter((s) => s !== wi.status).map(
                            (s) => (
                              <Button
                                key={s}
                                variant="outline"
                                size="sm"
                                className="h-5 text-[10px] px-1.5"
                                disabled={isTransitioning}
                                onClick={() =>
                                  handleStatusUpdate(wi.id, s)
                                }
                              >
                                {isTransitioning
                                  ? "..."
                                  : getStatusLabel(s)}
                              </Button>
                            )
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">
                      {wi.title}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs">
                      {bayName}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs">
                      {wi.position}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {wi.startedAt
                        ? new Date(wi.startedAt).toLocaleDateString()
                        : "\u2014"}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(wi.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditingId(wi.id);
                            setFormDialogOpen(true);
                          }}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setMovingItem(wi);
                            setMoveDialogOpen(true);
                          }}
                        >
                          Move
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Pagination */}
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

      {/* Form dialog */}
      <WorkItemFormDialog
        open={formDialogOpen}
        onOpenChange={(v) => {
          setFormDialogOpen(v);
          if (!v) setEditingId(null);
        }}
        tenantId={tenantId}
        workItemId={editingId}
        onSuccess={fetchItems}
      />

      {/* Move dialog */}
      <WorkItemMoveDialog
        open={moveDialogOpen}
        onOpenChange={(v) => {
          setMoveDialogOpen(v);
          if (!v) setMovingItem(null);
        }}
        tenantId={tenantId}
        workItem={movingItem}
        onSuccess={fetchItems}
      />
    </div>
  );
}
