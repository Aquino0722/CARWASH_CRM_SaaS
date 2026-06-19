"use client";

import { useState } from "react";
import { createVehicleApi } from "@/features/vehicles/vehicle-api";
import type { VehicleListItem } from "@/features/vehicles/vehicle-types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Props {
  tenantId: string;
  customerId: string | null;
  vehicleId: string | null;
  vehicleLabel: string;
  onChange: (vehicleId: string | null, vehicleLabel: string) => void;
}

export function VehicleSelect({
  tenantId,
  customerId,
  vehicleId,
  vehicleLabel,
  onChange,
}: Props) {
  const [searchInput, setSearchInput] = useState("");
  const [results, setResults] = useState<VehicleListItem[]>([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchInput.trim()) return;
    setSearching(true);
    setSearched(true);
    try {
      const api = createVehicleApi(tenantId);
      const result = await api.search({
        search: searchInput,
        customerId: customerId ?? undefined,
        pageSize: 10,
      });
      setResults(result.items);
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
    }
  };

  if (!customerId) {
    return (
      <div className="rounded-md border border-dashed px-3 py-2 text-sm text-muted-foreground">
        Select a customer first to choose a vehicle.
      </div>
    );
  }

  if (vehicleId) {
    return (
      <div className="flex items-center gap-2 rounded-md border px-3 py-2">
        <span className="text-sm flex-1">
          Vehicle: <span className="font-medium">{vehicleLabel}</span>
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
          placeholder="Search by plate, make or model..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="flex-1"
        />
        <Button type="submit" variant="secondary" size="sm" disabled={searching}>
          {searching ? "Searching..." : "Search"}
        </Button>
      </form>

      {searched && results.length === 0 && !searching && (
        <p className="text-sm text-muted-foreground">No vehicles found for this customer.</p>
      )}

      {results.length > 0 && (
        <div className="rounded-md border max-h-48 overflow-y-auto">
          {results.map((v) => (
            <button
              key={v.id}
              type="button"
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-accent transition-colors"
              onClick={() => {
                const label = v.plate
                  ? `${v.plate} \u2014 ${v.make} ${v.model}`
                  : `${v.make} ${v.model}`;
                onChange(v.id, label);
              }}
            >
              <span className="font-medium">
                {v.plate ?? `${v.make} ${v.model}`}
              </span>
              <span className="text-muted-foreground">{v.customerName}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
