export interface WorkItemListItem {
  id: string;
  serviceOrderId: string;
  bayId: string | null;
  title: string;
  status: string;
  position: number;
  assignedTo: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
}

export interface WorkItemDetail {
  id: string;
  serviceOrderId: string;
  bayId: string | null;
  title: string;
  status: string;
  position: number;
  assignedTo: string | null;
  checklist: string | null;
  version: number;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
}

export interface CreateWorkItemRequest {
  serviceOrderId: string;
  title: string;
  bayId?: string | null;
  position?: number | null;
  checklist?: string | null;
}

export interface UpdateWorkItemRequest {
  currentVersion: number;
  title: string;
  checklist?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
}

export interface MoveWorkItemRequest {
  currentVersion: number;
  bayId: string | null;
  position: number;
}

export interface UpdateWorkItemStatusRequest {
  currentVersion: number;
  status: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalCount: number;
}
