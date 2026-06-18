"use client";

import { useState, useEffect, useCallback } from "react";
import { createCustomerApi, formatApiError } from "./customer-api";
import { CustomerFormDialog } from "./customer-form-dialog";
import type { CustomerListItem } from "./customer-types";
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

export function CustomerList({ tenantId }: { tenantId: string }) {
  const [customers, setCustomers] = useState<CustomerListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const [totalCount, setTotalCount] = useState(0);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const api = createCustomerApi(tenantId);
      const result = await api.search({
        search: search || undefined,
        page,
        pageSize,
      });
      setCustomers(result.items);
      setTotalCount(result.totalCount);
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setLoading(false);
    }
  }, [tenantId, search, page, pageSize]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

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
            placeholder="Search customers..."
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
          New Customer
        </Button>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4">
          <Badge variant="destructive">Error</Badge>
          <p className="text-sm flex-1">{error}</p>
          <Button variant="outline" size="sm" onClick={fetchCustomers}>
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
      {!loading && !error && customers.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-center text-sm text-muted-foreground">
          {search ? (
            <>
              <p>No customers match your search.</p>
              <Button variant="link" size="sm" onClick={clearSearch}>
                Clear search
              </Button>
            </>
          ) : (
            <>
              <p>No customers yet.</p>
              <Button
                variant="link"
                size="sm"
                onClick={() => setDialogOpen(true)}
              >
                Create your first customer
              </Button>
            </>
          )}
        </div>
      )}

      {/* Table */}
      {!loading && !error && customers.length > 0 && (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Tags</TableHead>
                <TableHead>WhatsApp</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="w-[80px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {customers.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.fullName}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {c.phoneE164 ?? "\u2014"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {c.email ?? "\u2014"}
                  </TableCell>
                  <TableCell>
                    {c.tags.length > 0 ? (
                      <span className="block max-w-[120px] truncate text-xs text-muted-foreground">
                        {c.tags.slice(0, 2).join(", ")}
                        {c.tags.length > 2 ? ` +${c.tags.length - 2}` : ""}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        \u2014
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    {c.whatsAppConsent ? (
                      <Badge
                        variant="default"
                        className="bg-green-700 text-xs"
                      >
                        Yes
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="text-xs">
                        No
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {new Date(c.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setEditingId(c.id);
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
      <CustomerFormDialog
        open={dialogOpen}
        onOpenChange={(v) => {
          setDialogOpen(v);
          if (!v) setEditingId(null);
        }}
        tenantId={tenantId}
        customerId={editingId}
        onSuccess={fetchCustomers}
      />
    </div>
  );
}
