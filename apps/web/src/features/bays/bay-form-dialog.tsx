"use client";

import { useState, useCallback } from "react";
import { createBayApi, formatApiError } from "./bay-api";
import type { BayListItem } from "./bay-types";
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
  bay: BayListItem | null;
  onSuccess: () => void;
}

function emptyForm() {
  return {
    name: "",
    description: "",
    sortOrder: "",
  };
}

export function BayFormDialog({
  open,
  onOpenChange,
  tenantId,
  bay,
  onSuccess,
}: Props) {
  const isEdit = bay !== null;
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetForm = useCallback(() => {
    if (bay) {
      setForm({
        name: bay.name,
        description: bay.description ?? "",
        sortOrder: bay.sortOrder.toString(),
      });
    } else {
      setForm(emptyForm());
    }
    setError(null);
  }, [bay]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.name.trim()) {
      setError("Name is required.");
      return;
    }

    const sortOrderValue = form.sortOrder.trim()
      ? parseInt(form.sortOrder, 10)
      : null;

    if (form.sortOrder.trim() && (isNaN(sortOrderValue!) || sortOrderValue! < 0)) {
      setError("Sort order must be a non-negative number.");
      return;
    }

    setSubmitting(true);
    setError(null);

    const data = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      sortOrder: sortOrderValue,
    };

    try {
      const api = createBayApi(tenantId);
      if (isEdit && bay) {
        await api.update(bay.id, data);
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

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) resetForm();
        onOpenChange(v);
      }}
    >
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Bay" : "New Bay"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update bay details."
              : "Fill in the details to create a new work bay."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              placeholder="Bay 1"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              disabled={submitting}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Interior detailing bay with LED lighting"
              value={form.description}
              onChange={(e) =>
                setForm((f) => ({ ...f, description: e.target.value }))
              }
              disabled={submitting}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="sortOrder">Sort Order</Label>
            <Input
              id="sortOrder"
              type="number"
              min="0"
              placeholder="0"
              value={form.sortOrder}
              onChange={(e) =>
                setForm((f) => ({ ...f, sortOrder: e.target.value }))
              }
              disabled={submitting}
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
            <Button type="submit" disabled={submitting}>
              {submitting
                ? "Saving..."
                : isEdit
                  ? "Save changes"
                  : "Create bay"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
