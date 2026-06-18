"use client";

import { useState, useEffect, useCallback } from "react";
import { createCustomerApi, formatApiError } from "./customer-api";
import { ApiError } from "@/lib/api-client";
import type { CustomerDetail } from "./customer-types";
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
  customerId: string | null;
  onSuccess: () => void;
}

function emptyForm() {
  return {
    fullName: "",
    phoneE164: "",
    email: "",
    notes: "",
    tagsInput: "",
    whatsAppConsent: false,
  };
}

export function CustomerFormDialog({
  open,
  onOpenChange,
  tenantId,
  customerId,
  onSuccess,
}: Props) {
  const isEdit = customerId !== null;
  const [form, setForm] = useState(emptyForm);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detailNotFound, setDetailNotFound] = useState(false);

  const resetForm = useCallback(() => {
    setForm(emptyForm());
    setError(null);
    setDetailNotFound(false);
  }, []);

  useEffect(() => {
    if (!open) {
      resetForm();
      return;
    }

    if (!customerId) return;

    setLoadingDetail(true);
    setError(null);
    setDetailNotFound(false);

    const api = createCustomerApi(tenantId);
    api
      .getById(customerId)
      .then((detail: CustomerDetail) => {
        setForm({
          fullName: detail.fullName,
          phoneE164: detail.phoneE164 ?? "",
          email: detail.email ?? "",
          notes: detail.notes ?? "",
          tagsInput: detail.tags.join(", "),
          whatsAppConsent: detail.whatsAppConsent,
        });
      })
      .catch((err: unknown) => {
        if (err instanceof ApiError && err.status === 404) {
          setDetailNotFound(true);
        } else {
          setError(formatApiError(err));
        }
      })
      .finally(() => setLoadingDetail(false));
  }, [open, customerId, tenantId, resetForm]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.fullName.trim()) {
      setError("Full name is required.");
      return;
    }

    if (form.phoneE164 && !form.phoneE164.startsWith("+")) {
      setError("Phone must start with + (E.164 format, e.g. +51987654321).");
      return;
    }

    setSubmitting(true);
    setError(null);

    const data = {
      fullName: form.fullName.trim(),
      phoneE164: form.phoneE164 || null,
      email: form.email || null,
      notes: form.notes || null,
      tags: form.tagsInput
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      whatsAppConsent: form.whatsAppConsent || undefined,
    };

    try {
      const api = createCustomerApi(tenantId);
      if (isEdit && customerId) {
        await api.update(customerId, data);
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

  if (detailNotFound) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Customer not found</DialogTitle>
            <DialogDescription>
              This customer may have been deleted. The list will refresh.
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
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Customer" : "New Customer"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update customer details."
              : "Fill in the details to create a new customer."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {loadingDetail && (
            <p className="text-sm text-muted-foreground">Loading customer details...</p>
          )}

          <div className="space-y-2">
            <Label htmlFor="fullName">Full name *</Label>
            <Input
              id="fullName"
              value={form.fullName}
              onChange={(e) =>
                setForm((f) => ({ ...f, fullName: e.target.value }))
              }
              disabled={loadingDetail || submitting}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phoneE164">Phone (E.164)</Label>
            <Input
              id="phoneE164"
              placeholder="+51987654321"
              value={form.phoneE164}
              onChange={(e) =>
                setForm((f) => ({ ...f, phoneE164: e.target.value }))
              }
              disabled={loadingDetail || submitting}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="customer@example.com"
              value={form.email}
              onChange={(e) =>
                setForm((f) => ({ ...f, email: e.target.value }))
              }
              disabled={loadingDetail || submitting}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              placeholder="Optional notes about this customer"
              value={form.notes}
              onChange={(e) =>
                setForm((f) => ({ ...f, notes: e.target.value }))
              }
              disabled={loadingDetail || submitting}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="tags">Tags (comma-separated)</Label>
            <Input
              id="tags"
              placeholder="vip, repeat, fleet"
              value={form.tagsInput}
              onChange={(e) =>
                setForm((f) => ({ ...f, tagsInput: e.target.value }))
              }
              disabled={loadingDetail || submitting}
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              id="whatsAppConsent"
              type="checkbox"
              checked={form.whatsAppConsent}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  whatsAppConsent: e.target.checked,
                }))
              }
              disabled={loadingDetail || submitting}
              className="h-4 w-4 rounded border-input bg-background accent-foreground"
            />
            <Label htmlFor="whatsAppConsent" className="text-sm font-normal">
              WhatsApp consent granted
            </Label>
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

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
                  : "Create customer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
