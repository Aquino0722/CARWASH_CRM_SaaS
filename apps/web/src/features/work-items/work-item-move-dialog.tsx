"use client";

import { useState, useEffect, useCallback } from "react";
import { createWorkItemApi, formatApiError } from "./work-item-api";
import { createBayApi } from "@/features/bays/bay-api";
import { ApiError } from "@/lib/api-client";
import type { WorkItemDetail, WorkItemListItem } from "./work-item-types";
import type { BayListItem } from "@/features/bays/bay-types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  workItem: WorkItemListItem | null;
  onSuccess: () => void;
}

export function WorkItemMoveDialog({
  open,
  onOpenChange,
  tenantId,
  workItem,
  onSuccess,
}: Props) {
  const [bays, setBays] = useState<BayListItem[]>([]);
  const [loadingBays, setLoadingBays] = useState(false);
  const [currentVersion, setCurrentVersion] = useState(0);
  const [bayId, setBayId] = useState<string | null>(null);
  const [position, setPosition] = useState("1000");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  const resetForm = useCallback(() => {
    setCurrentVersion(0);
    setBayId(null);
    setPosition("1000");
    setError(null);
    setNotFound(false);
  }, []);

  useEffect(() => {
    if (!open || !workItem) {
      resetForm();
      return;
    }

    setLoadingBays(true);
    setError(null);
    setNotFound(false);

    const workApi = createWorkItemApi(tenantId);
    const bayApi = createBayApi(tenantId);

    Promise.all([
      workApi.getById(workItem.id),
      bayApi.search(),
    ])
      .then(([detail, bayResult]) => {
        setCurrentVersion(detail.version);
        setBayId(detail.bayId);
        setPosition(detail.position.toString());
        setBays(bayResult.items);
      })
      .catch((err: unknown) => {
        if (err instanceof ApiError && err.status === 404) {
          setNotFound(true);
        } else {
          setError(formatApiError(err));
        }
      })
      .finally(() => setLoadingBays(false));
  }, [open, workItem, tenantId, resetForm]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const positionValue = parseFloat(position);
    if (isNaN(positionValue)) {
      setError("Position must be a valid number.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const api = createWorkItemApi(tenantId);
      await api.move(workItem!.id, {
        currentVersion,
        bayId,
        position: positionValue,
      });
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
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Move Work Item</DialogTitle>
          <DialogDescription>
            Assign to a different bay or change position.
            {workItem && (
              <span className="block mt-1 text-muted-foreground">
                Current:{" "}
                <span className="font-medium">{workItem.title}</span>
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {loadingBays && (
            <p className="text-sm text-muted-foreground">
              Loading bays and version information...
            </p>
          )}

          <div className="space-y-2">
            <Label htmlFor="bay">Bay</Label>
            <select
              id="bay"
              value={bayId ?? ""}
              onChange={(e) => setBayId(e.target.value || null)}
              disabled={loadingBays || submitting}
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="">No bay (unassign)</option>
              {bays.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="position">Position *</Label>
            <Input
              id="position"
              type="number"
              step="0.0001"
              placeholder="1000"
              value={position}
              onChange={(e) => setPosition(e.target.value)}
              disabled={loadingBays || submitting}
              required
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
            <Button type="submit" disabled={loadingBays || submitting}>
              {submitting ? "Moving..." : "Move"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
