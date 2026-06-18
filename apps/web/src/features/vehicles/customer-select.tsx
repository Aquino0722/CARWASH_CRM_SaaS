"use client";

import { useState } from "react";
import { createCustomerApi } from "@/features/customers/customer-api";
import type { CustomerListItem } from "@/features/customers/customer-types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Props {
  tenantId: string;
  customerId: string | null;
  customerName: string;
  onChange: (customerId: string | null, customerName: string) => void;
}

export function CustomerSelect({
  tenantId,
  customerId,
  customerName,
  onChange,
}: Props) {
  const [searchInput, setSearchInput] = useState("");
  const [results, setResults] = useState<CustomerListItem[]>([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchInput.trim()) return;
    setSearching(true);
    setSearched(true);
    try {
      const api = createCustomerApi(tenantId);
      const result = await api.search({ search: searchInput, pageSize: 10 });
      setResults(result.items);
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
    }
  };

  if (customerId) {
    return (
      <div className="flex items-center gap-2 rounded-md border px-3 py-2">
        <span className="text-sm flex-1">
          Customer: <span className="font-medium">{customerName}</span>
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
          placeholder="Search customers by name, email or phone..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="flex-1"
        />
        <Button type="submit" variant="secondary" size="sm" disabled={searching}>
          {searching ? "Searching..." : "Search"}
        </Button>
      </form>

      {searched && results.length === 0 && !searching && (
        <p className="text-sm text-muted-foreground">No customers found.</p>
      )}

      {results.length > 0 && (
        <div className="rounded-md border max-h-48 overflow-y-auto">
          {results.map((c) => (
            <button
              key={c.id}
              type="button"
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-accent transition-colors"
              onClick={() => onChange(c.id, c.fullName)}
            >
              <span className="font-medium">{c.fullName}</span>
              {c.email && (
                <span className="text-muted-foreground">{c.email}</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
