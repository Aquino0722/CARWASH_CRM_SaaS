"use client";

import { useState, useEffect, useCallback } from "react";
import { createVehicleApi, formatApiError } from "./vehicle-api";
import { VehicleFormDialog } from "./vehicle-form-dialog";
import type { VehicleListItem } from "./vehicle-types";
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

export function VehicleList({ tenantId }: { tenantId: string }) {
  const [vehicles, setVehicles] = useState<VehicleListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const [totalCount, setTotalCount] = useState(0);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const fetchVehicles = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const api = createVehicleApi(tenantId);
      const result = await api.search({
        search: search || undefined,
        page,
        pageSize,
      });
      setVehicles(result.items);
      setTotalCount(result.totalCount);
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setLoading(false);
    }
  }, [tenantId, search, page, pageSize]);

  useEffect(() => {
    fetchVehicles();
  }, [fetchVehicles]);

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

  const totalPages = Math.ceil(totalCount / pageSize) || 1;

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center gap-2">
        <form onSubmit={handleSearch} className="flex gap-2 flex-1">
          <Input
            placeholder="Search by plate, make or model..."
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
          New Vehicle
        </Button>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4">
          <Badge variant="destructive">Error</Badge>
          <p className="text-sm flex-1">{error}</p>
          <Button variant="outline" size="sm" onClick={fetchVehicles}>
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
      {!loading && !error && vehicles.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-center text-sm text-muted-foreground">
          {search ? (
            <>
              <p>No vehicles match your search.</p>
              <Button variant="link" size="sm" onClick={clearSearch}>
                Clear search
              </Button>
            </>
          ) : (
            <>
              <p>No vehicles yet.</p>
              <Button
                variant="link"
                size="sm"
                onClick={() => setDialogOpen(true)}
              >
                Register your first vehicle
              </Button>
            </>
          )}
        </div>
      )}

      {/* Table */}
      {!loading && !error && vehicles.length > 0 && (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Plate</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Make</TableHead>
                <TableHead>Model</TableHead>
                <TableHead>Year</TableHead>
                <TableHead>Color</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="w-[80px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {vehicles.map((v) => (
                <TableRow key={v.id}>
                  <TableCell className="font-medium">
                    {v.plate ?? "\u2014"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {v.customerName}
                  </TableCell>
                  <TableCell>{v.make}</TableCell>
                  <TableCell>{v.model}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {v.year ?? "\u2014"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {v.color ?? "\u2014"}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {new Date(v.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setEditingId(v.id);
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
      <VehicleFormDialog
        open={dialogOpen}
        onOpenChange={(v) => {
          setDialogOpen(v);
          if (!v) setEditingId(null);
        }}
        tenantId={tenantId}
        vehicleId={editingId}
        onSuccess={fetchVehicles}
      />
    </div>
  );
}
