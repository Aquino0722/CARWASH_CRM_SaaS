"use client";

import { useState, useEffect, useCallback } from "react";
import { createVehicleApi, formatApiError } from "./vehicle-api";
import { CustomerSelect } from "./customer-select";
import { ApiError } from "@/lib/api-client";
import type { VehicleDetail } from "./vehicle-types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenantId: string;
  vehicleId: string | null;
  onSuccess: () => void;
}

function emptyForm() {
  return {
    customerId: null as string | null,
    customerName: "",
    make: "",
    model: "",
    plate: "",
    vin: "",
    year: "",
    color: "",
    trim: "",
    notes: "",
  };
}

export function VehicleFormDialog({
  open,
  onOpenChange,
  tenantId,
  vehicleId,
  onSuccess,
}: Props) {
  const isEdit = vehicleId !== null;
  const [form, setForm] = useState(emptyForm);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  const resetForm = useCallback(() => {
    setForm(emptyForm());
    setError(null);
    setNotFound(false);
  }, []);

  useEffect(() => {
    if (!open) {
      resetForm();
      return;
    }

    if (!vehicleId) return;

    setLoadingDetail(true);
    setError(null);
    setNotFound(false);

    const api = createVehicleApi(tenantId);
    api
      .getById(vehicleId)
      .then((detail: VehicleDetail) => {
        setForm({
          customerId: detail.customerId,
          customerName: detail.customerName,
          make: detail.make,
          model: detail.model,
          plate: detail.plate ?? "",
          vin: detail.vin ?? "",
          year: detail.year?.toString() ?? "",
          color: detail.color ?? "",
          trim: detail.trim ?? "",
          notes: detail.notes ?? "",
        });
      })
      .catch((err: unknown) => {
        if (err instanceof ApiError && err.status === 404) {
          setNotFound(true);
        } else {
          setError(formatApiError(err));
        }
      })
      .finally(() => setLoadingDetail(false));
  }, [open, vehicleId, tenantId, resetForm]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.customerId) {
      setError("Please select a customer.");
      return;
    }
    if (!form.make.trim()) {
      setError("Make is required.");
      return;
    }
    if (!form.model.trim()) {
      setError("Model is required.");
      return;
    }

    const yearValue = form.year.trim() ? parseInt(form.year, 10) : null;

    if (form.year.trim() && (isNaN(yearValue!) || yearValue! < 1900 || yearValue! > 2100)) {
      setError("Year must be a valid number between 1900 and 2100.");
      return;
    }

    setSubmitting(true);
    setError(null);

    const data = {
      customerId: form.customerId,
      make: form.make.trim(),
      model: form.model.trim(),
      plate: form.plate.trim() || null,
      vin: form.vin.trim() || null,
      year: yearValue,
      color: form.color.trim() || null,
      trim: form.trim.trim() || null,
      notes: form.notes.trim() || null,
    };

    try {
      const api = createVehicleApi(tenantId);
      if (isEdit && vehicleId) {
        await api.update(vehicleId, data);
      } else {
        await api.create(data);
      }
      onSuccess();
      onOpenChange(false);
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setSubmitting(false);
    }
  };

  if (notFound) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Vehicle not found</DialogTitle>
            <DialogDescription>
              This vehicle may have been deleted. The list will refresh.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              onClick={() => {
                onOpenChange(false);
                onSuccess();
              }}
            >
              OK
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[540px]">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Edit Vehicle" : "New Vehicle"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update vehicle details."
              : "Fill in the details to register a new vehicle."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {loadingDetail && (
            <p className="text-sm text-muted-foreground">
              Loading vehicle details...
            </p>
          )}

          <div className="space-y-2">
            <Label>Customer *</Label>
            <CustomerSelect
              tenantId={tenantId}
              customerId={form.customerId}
              customerName={form.customerName}
              onChange={(id, name) =>
                setForm((f) => ({ ...f, customerId: id, customerName: name }))
              }
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="make">Make *</Label>
              <Input
                id="make"
                placeholder="Toyota"
                value={form.make}
                onChange={(e) =>
                  setForm((f) => ({ ...f, make: e.target.value }))
                }
                disabled={loadingDetail || submitting}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="model">Model *</Label>
              <Input
                id="model"
                placeholder="Camry"
                value={form.model}
                onChange={(e) =>
                  setForm((f) => ({ ...f, model: e.target.value }))
                }
                disabled={loadingDetail || submitting}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="plate">Plate</Label>
              <Input
                id="plate"
                placeholder="ABC-123"
                value={form.plate}
                onChange={(e) =>
                  setForm((f) => ({ ...f, plate: e.target.value }))
                }
                disabled={loadingDetail || submitting}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="vin">VIN</Label>
              <Input
                id="vin"
                placeholder="1HGCM82633A004352"
                value={form.vin}
                onChange={(e) =>
                  setForm((f) => ({ ...f, vin: e.target.value }))
                }
                disabled={loadingDetail || submitting}
                maxLength={17}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="year">Year</Label>
              <Input
                id="year"
                type="number"
                placeholder="2020"
                value={form.year}
                onChange={(e) =>
                  setForm((f) => ({ ...f, year: e.target.value }))
                }
                disabled={loadingDetail || submitting}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="color">Color</Label>
              <Input
                id="color"
                placeholder="Black"
                value={form.color}
                onChange={(e) =>
                  setForm((f) => ({ ...f, color: e.target.value }))
                }
                disabled={loadingDetail || submitting}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="trim">Trim</Label>
              <Input
                id="trim"
                placeholder="XLE"
                value={form.trim}
                onChange={(e) =>
                  setForm((f) => ({ ...f, trim: e.target.value }))
                }
                disabled={loadingDetail || submitting}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              placeholder="Optional notes about this vehicle"
              value={form.notes}
              onChange={(e) =>
                setForm((f) => ({ ...f, notes: e.target.value }))
              }
              disabled={loadingDetail || submitting}
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loadingDetail || submitting}>
              {submitting
                ? "Saving..."
                : isEdit
                  ? "Save changes"
                  : "Create vehicle"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
