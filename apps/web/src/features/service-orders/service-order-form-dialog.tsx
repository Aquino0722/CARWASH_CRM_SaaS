"use client";

import { useState, useEffect, useCallback } from "react";
import { createServiceOrderApi, formatApiError } from "./service-order-api";
import { CustomerSelect } from "@/features/vehicles/customer-select";
import { VehicleSelect } from "./vehicle-select";
import { ApiError } from "@/lib/api-client";
import type { ServiceOrderDetail } from "./service-order-types";
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
  orderId: string | null;
  onSuccess: () => void;
}

interface FormState {
  customerId: string | null;
  customerName: string;
  vehicleId: string | null;
  vehicleLabel: string;
  title: string;
  packageName: string;
  estimatedPrice: string;
  finalPrice: string;
  scheduledAt: string;
  dueAt: string;
  internalNotes: string;
  customerNotes: string;
  version: number;
}

function emptyForm(): FormState {
  return {
    customerId: null,
    customerName: "",
    vehicleId: null,
    vehicleLabel: "",
    title: "",
    packageName: "",
    estimatedPrice: "",
    finalPrice: "",
    scheduledAt: "",
    dueAt: "",
    internalNotes: "",
    customerNotes: "",
    version: 0,
  };
}

export function ServiceOrderFormDialog({
  open,
  onOpenChange,
  tenantId,
  orderId,
  onSuccess,
}: Props) {
  const isEdit = orderId !== null;
  const [form, setForm] = useState<FormState>(emptyForm);
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

    if (!orderId) return;

    setLoadingDetail(true);
    setError(null);
    setNotFound(false);

    const api = createServiceOrderApi(tenantId);
    api
      .getById(orderId)
      .then((detail: ServiceOrderDetail) => {
        const vehicleLabel = [detail.plate, detail.vehicleMake, detail.vehicleModel]
          .filter(Boolean)
          .join(" \u2014 ");
        setForm({
          customerId: detail.customerId,
          customerName: detail.customerName,
          vehicleId: detail.vehicleId,
          vehicleLabel,
          title: detail.title,
          packageName: detail.packageName ?? "",
          estimatedPrice: detail.estimatedPrice?.toString() ?? "",
          finalPrice: detail.finalPrice?.toString() ?? "",
          scheduledAt: detail.scheduledAt ?? "",
          dueAt: detail.dueAt ?? "",
          internalNotes: detail.internalNotes ?? "",
          customerNotes: detail.customerNotes ?? "",
          version: detail.version,
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
  }, [open, orderId, tenantId, resetForm]);

  const handleCustomerChange = (customerId: string | null, customerName: string) => {
    setForm((f) => ({
      ...f,
      customerId,
      customerName,
      vehicleId: customerId === f.customerId ? f.vehicleId : null,
      vehicleLabel: customerId === f.customerId ? f.vehicleLabel : "",
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isEdit && !form.customerId) {
      setError("Please select a customer.");
      return;
    }
    if (!isEdit && !form.vehicleId) {
      setError("Please select a vehicle.");
      return;
    }
    if (!form.title.trim()) {
      setError("Title is required.");
      return;
    }

    const estimatedPriceValue = form.estimatedPrice.trim()
      ? parseFloat(form.estimatedPrice)
      : null;
    const finalPriceValue = form.finalPrice.trim()
      ? parseFloat(form.finalPrice)
      : null;

    if (form.estimatedPrice.trim() && (isNaN(estimatedPriceValue!) || estimatedPriceValue! <= 0)) {
      setError("Estimated price must be a positive number.");
      return;
    }
    if (form.finalPrice.trim() && (isNaN(finalPriceValue!) || finalPriceValue! <= 0)) {
      setError("Final price must be a positive number.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const api = createServiceOrderApi(tenantId);

      if (isEdit && orderId) {
        await api.update(orderId, {
          currentVersion: form.version,
          title: form.title.trim(),
          packageName: form.packageName.trim() || null,
          estimatedPrice: estimatedPriceValue,
          finalPrice: finalPriceValue,
          scheduledAt: form.scheduledAt || null,
          dueAt: form.dueAt || null,
          internalNotes: form.internalNotes.trim() || null,
          customerNotes: form.customerNotes.trim() || null,
        });
      } else {
        await api.create({
          customerId: form.customerId!,
          vehicleId: form.vehicleId!,
          title: form.title.trim(),
          packageName: form.packageName.trim() || null,
          estimatedPrice: estimatedPriceValue,
          scheduledAt: form.scheduledAt || null,
          dueAt: form.dueAt || null,
          internalNotes: form.internalNotes.trim() || null,
          customerNotes: form.customerNotes.trim() || null,
        });
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
            <DialogTitle>Service order not found</DialogTitle>
            <DialogDescription>
              This service order may have been deleted. The list will refresh.
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
            {isEdit ? "Edit Service Order" : "New Service Order"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update service order details."
              : "Fill in the details to create a new service order."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {loadingDetail && (
            <p className="text-sm text-muted-foreground">
              Loading service order details...
            </p>
          )}

          {isEdit ? (
            <div className="space-y-1">
              <Label>Customer</Label>
              <div className="rounded-md border px-3 py-2 text-sm">
                {form.customerName}
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <Label>Customer *</Label>
              <CustomerSelect
                tenantId={tenantId}
                customerId={form.customerId}
                customerName={form.customerName}
                onChange={handleCustomerChange}
              />
            </div>
          )}

          {isEdit ? (
            <div className="space-y-1">
              <Label>Vehicle</Label>
              <div className="rounded-md border px-3 py-2 text-sm">
                {form.vehicleLabel}
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <Label>Vehicle *</Label>
              <VehicleSelect
                tenantId={tenantId}
                customerId={form.customerId}
                vehicleId={form.vehicleId}
                vehicleLabel={form.vehicleLabel}
                onChange={(id, label) =>
                  setForm((f) => ({ ...f, vehicleId: id, vehicleLabel: label }))
                }
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              placeholder="Express Wash & Wax"
              value={form.title}
              onChange={(e) =>
                setForm((f) => ({ ...f, title: e.target.value }))
              }
              disabled={loadingDetail || submitting}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="packageName">Package</Label>
              <Input
                id="packageName"
                placeholder="Premium"
                value={form.packageName}
                onChange={(e) =>
                  setForm((f) => ({ ...f, packageName: e.target.value }))
                }
                disabled={loadingDetail || submitting}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="estimatedPrice">Estimated Price</Label>
              <Input
                id="estimatedPrice"
                type="number"
                step="0.01"
                min="0"
                placeholder="299.99"
                value={form.estimatedPrice}
                onChange={(e) =>
                  setForm((f) => ({ ...f, estimatedPrice: e.target.value }))
                }
                disabled={loadingDetail || submitting}
              />
            </div>
          </div>

          {isEdit && (
            <div className="space-y-2">
              <Label htmlFor="finalPrice">Final Price</Label>
              <Input
                id="finalPrice"
                type="number"
                step="0.01"
                min="0"
                placeholder="299.99"
                value={form.finalPrice}
                onChange={(e) =>
                  setForm((f) => ({ ...f, finalPrice: e.target.value }))
                }
                disabled={loadingDetail || submitting}
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="scheduledAt">Scheduled Date</Label>
              <Input
                id="scheduledAt"
                type="datetime-local"
                value={form.scheduledAt ? form.scheduledAt.slice(0, 16) : ""}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    scheduledAt: e.target.value ? e.target.value + ":00" : "",
                  }))
                }
                disabled={loadingDetail || submitting}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dueAt">Due Date</Label>
              <Input
                id="dueAt"
                type="datetime-local"
                value={form.dueAt ? form.dueAt.slice(0, 16) : ""}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    dueAt: e.target.value ? e.target.value + ":00" : "",
                  }))
                }
                disabled={loadingDetail || submitting}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="internalNotes">Internal Notes</Label>
            <Textarea
              id="internalNotes"
              placeholder="Notes for the team"
              value={form.internalNotes}
              onChange={(e) =>
                setForm((f) => ({ ...f, internalNotes: e.target.value }))
              }
              disabled={loadingDetail || submitting}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="customerNotes">Customer Notes</Label>
            <Textarea
              id="customerNotes"
              placeholder="Customer instructions or requests"
              value={form.customerNotes}
              onChange={(e) =>
                setForm((f) => ({ ...f, customerNotes: e.target.value }))
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
                  : "Create order"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
