"use client";

import { useState, useEffect, useCallback } from "react";
import { createWorkItemApi, formatApiError } from "./work-item-api";
import { ServiceOrderSelect } from "./service-order-select";
import { ApiError } from "@/lib/api-client";
import type { WorkItemDetail } from "./work-item-types";
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
  workItemId: string | null;
  onSuccess: () => void;
}

interface FormState {
  serviceOrderId: string | null;
  serviceOrderLabel: string;
  title: string;
  checklist: string;
  position: string;
  startedAt: string;
  completedAt: string;
  version: number;
}

function emptyForm(): FormState {
  return {
    serviceOrderId: null,
    serviceOrderLabel: "",
    title: "",
    checklist: "",
    position: "",
    startedAt: "",
    completedAt: "",
    version: 0,
  };
}

export function WorkItemFormDialog({
  open,
  onOpenChange,
  tenantId,
  workItemId,
  onSuccess,
}: Props) {
  const isEdit = workItemId !== null;
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

    if (!workItemId) return;

    setLoadingDetail(true);
    setError(null);
    setNotFound(false);

    const api = createWorkItemApi(tenantId);
    api
      .getById(workItemId)
      .then((detail: WorkItemDetail) => {
        setForm({
          serviceOrderId: detail.serviceOrderId,
          serviceOrderLabel: detail.title,
          title: detail.title,
          checklist: detail.checklist ?? "",
          position: detail.position.toString(),
          startedAt: detail.startedAt ?? "",
          completedAt: detail.completedAt ?? "",
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
  }, [open, workItemId, tenantId, resetForm]);

  const validateChecklist = (value: string): string | null => {
    if (!value.trim()) return null;
    try {
      JSON.parse(value);
      return null;
    } catch {
      return "Checklist must be valid JSON (e.g. [{\"text\":\"Check paint\",\"completed\":false}]).";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isEdit && !form.serviceOrderId) {
      setError("Please select a service order.");
      return;
    }
    if (!form.title.trim()) {
      setError("Title is required.");
      return;
    }

    const checklistError = validateChecklist(form.checklist);
    if (checklistError) {
      setError(checklistError);
      return;
    }

    const positionValue = form.position.trim()
      ? parseFloat(form.position)
      : null;

    if (form.position.trim() && isNaN(positionValue!)) {
      setError("Position must be a valid number.");
      return;
    }

    setSubmitting(true);
    setError(null);

    const sanitizedChecklist = form.checklist.trim() || null;

    try {
      const api = createWorkItemApi(tenantId);

      if (isEdit && workItemId) {
        await api.update(workItemId, {
          currentVersion: form.version,
          title: form.title.trim(),
          checklist: sanitizedChecklist,
          startedAt: form.startedAt || null,
          completedAt: form.completedAt || null,
        });
      } else {
        await api.create({
          serviceOrderId: form.serviceOrderId!,
          title: form.title.trim(),
          position: positionValue,
          checklist: sanitizedChecklist,
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
            <DialogTitle>Work item not found</DialogTitle>
            <DialogDescription>
              This work item may have been deleted. The list will refresh.
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
            {isEdit ? "Edit Work Item" : "New Work Item"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update work item details."
              : "Create a new work item and optionally assign it to a bay."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {loadingDetail && (
            <p className="text-sm text-muted-foreground">
              Loading work item details...
            </p>
          )}

          {isEdit ? (
            <div className="space-y-1">
              <Label>Service Order</Label>
              <div className="rounded-md border px-3 py-2 text-sm">
                {form.serviceOrderLabel}
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <Label>Service Order *</Label>
              <ServiceOrderSelect
                tenantId={tenantId}
                serviceOrderId={form.serviceOrderId}
                serviceOrderLabel={form.serviceOrderLabel}
                onChange={(id, label) =>
                  setForm((f) => ({
                    ...f,
                    serviceOrderId: id,
                    serviceOrderLabel: label,
                  }))
                }
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              placeholder="Paint correction - hood"
              value={form.title}
              onChange={(e) =>
                setForm((f) => ({ ...f, title: e.target.value }))
              }
              disabled={loadingDetail || submitting}
              required
            />
          </div>

          {!isEdit && (
            <div className="space-y-2">
              <Label htmlFor="position">Position</Label>
              <Input
                id="position"
                type="number"
                step="0.0001"
                placeholder="1000"
                value={form.position}
                onChange={(e) =>
                  setForm((f) => ({ ...f, position: e.target.value }))
                }
                disabled={submitting}
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="checklist">Checklist (JSON)</Label>
            <Textarea
              id="checklist"
              placeholder='[{"text":"Check paint thickness","completed":false}]'
              value={form.checklist}
              onChange={(e) =>
                setForm((f) => ({ ...f, checklist: e.target.value }))
              }
              disabled={loadingDetail || submitting}
              className="font-mono text-xs"
            />
          </div>

          {isEdit && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startedAt">Started At</Label>
                <Input
                  id="startedAt"
                  type="datetime-local"
                  value={
                    form.startedAt ? form.startedAt.slice(0, 16) : ""
                  }
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      startedAt: e.target.value
                        ? e.target.value + ":00"
                        : "",
                    }))
                  }
                  disabled={loadingDetail || submitting}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="completedAt">Completed At</Label>
                <Input
                  id="completedAt"
                  type="datetime-local"
                  value={
                    form.completedAt ? form.completedAt.slice(0, 16) : ""
                  }
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      completedAt: e.target.value
                        ? e.target.value + ":00"
                        : "",
                    }))
                  }
                  disabled={loadingDetail || submitting}
                />
              </div>
            </div>
          )}

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
                  : "Create work item"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
