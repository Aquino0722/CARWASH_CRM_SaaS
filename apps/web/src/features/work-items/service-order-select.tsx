"use client";

import { useState } from "react";
import { createServiceOrderApi } from "@/features/service-orders/service-order-api";
import type { ServiceOrderListItem } from "@/features/service-orders/service-order-types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Props {
  tenantId: string;
  serviceOrderId: string | null;
  serviceOrderLabel: string;
  onChange: (serviceOrderId: string | null, serviceOrderLabel: string) => void;
}

export function ServiceOrderSelect({
  tenantId,
  serviceOrderId,
  serviceOrderLabel,
  onChange,
}: Props) {
  const [searchInput, setSearchInput] = useState("");
  const [results, setResults] = useState<ServiceOrderListItem[]>([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchInput.trim()) return;
    setSearching(true);
    setSearched(true);
    try {
      const api = createServiceOrderApi(tenantId);
      const result = await api.search({ search: searchInput, pageSize: 10 });
      setResults(result.items);
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
    }
  };

  if (serviceOrderId) {
    return (
      <div className="flex items-center gap-2 rounded-md border px-3 py-2">
        <span className="text-sm flex-1">
          Service order:{" "}
          <span className="font-medium">{serviceOrderLabel}</span>
        </span>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => onChange(null, "")}
        >
          Change
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <form onSubmit={handleSearch} className="flex gap-2">
        <Input
          placeholder="Search by title, customer or plate..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="flex-1"
        />
        <Button
          type="submit"
          variant="secondary"
          size="sm"
          disabled={searching}
        >
          {searching ? "Searching..." : "Search"}
        </Button>
      </form>

      {searched && results.length === 0 && !searching && (
        <p className="text-sm text-muted-foreground">
          No service orders found.
        </p>
      )}

      {results.length > 0 && (
        <div className="rounded-md border max-h-48 overflow-y-auto">
          {results.map((o) => {
            const label = [o.title, o.customerName, o.plate]
              .filter(Boolean)
              .join(" \u2014 ");
            return (
              <button
                key={o.id}
                type="button"
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-accent transition-colors"
                onClick={() => onChange(o.id, label)}
              >
                <span className="font-medium">{o.title}</span>
                <span className="text-muted-foreground truncate">
                  {o.customerName}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
