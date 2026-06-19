export const STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  quoted: "Quoted",
  scheduled: "Scheduled",
  checked_in: "Checked In",
  in_progress: "In Progress",
  quality_check: "Quality Check",
  ready_for_delivery: "Ready for Delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

export const STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-600",
  quoted: "bg-blue-600",
  scheduled: "bg-indigo-600",
  checked_in: "bg-cyan-600",
  in_progress: "bg-amber-600",
  quality_check: "bg-purple-600",
  ready_for_delivery: "bg-emerald-600",
  delivered: "bg-green-700",
  cancelled: "bg-red-700",
};

const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  draft: ["quoted", "cancelled"],
  quoted: ["scheduled", "draft", "cancelled"],
  scheduled: ["checked_in", "draft", "cancelled"],
  checked_in: ["in_progress", "draft", "cancelled"],
  in_progress: ["quality_check", "checked_in", "cancelled"],
  quality_check: ["ready_for_delivery", "in_progress", "cancelled"],
  ready_for_delivery: ["delivered", "in_progress", "cancelled"],
  delivered: [],
  cancelled: [],
};

export function getAllowedNextStatuses(status: string): string[] {
  return ALLOWED_TRANSITIONS[status] ?? [];
}

export function getStatusLabel(status: string): string {
  return STATUS_LABELS[status] ?? status;
}

export function getStatusColor(status: string): string {
  return STATUS_COLORS[status] ?? "bg-gray-500";
}
