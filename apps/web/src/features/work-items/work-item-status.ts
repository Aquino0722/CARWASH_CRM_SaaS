export const STATUS_LABELS: Record<string, string> = {
  waiting: "Waiting",
  in_progress: "In Progress",
  completed: "Completed",
  blocked: "Blocked",
  cancelled: "Cancelled",
};

export const STATUS_COLORS: Record<string, string> = {
  waiting: "bg-gray-600",
  in_progress: "bg-amber-600",
  completed: "bg-green-700",
  blocked: "bg-red-700",
  cancelled: "bg-gray-500",
};

export const ALL_STATUSES = ["waiting", "in_progress", "completed", "blocked", "cancelled"];

export function getStatusLabel(status: string): string {
  return STATUS_LABELS[status] ?? status;
}

export function getStatusColor(status: string): string {
  return STATUS_COLORS[status] ?? "bg-gray-500";
}
