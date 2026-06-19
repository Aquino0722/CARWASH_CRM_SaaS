export interface BayListItem {
  id: string;
  name: string;
  description: string | null;
  status: string;
  sortOrder: number;
  createdAt: string;
}

export type BayDetail = BayListItem;

export interface CreateBayRequest {
  name: string;
  description?: string | null;
  sortOrder?: number | null;
}

export interface UpdateBayRequest {
  name: string;
  description?: string | null;
  sortOrder?: number | null;
}

export interface UpdateBayStatusRequest {
  status: string;
}
