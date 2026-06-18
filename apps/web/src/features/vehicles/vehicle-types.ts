export interface VehicleListItem {
  id: string;
  customerId: string;
  customerName: string;
  plate: string | null;
  make: string;
  model: string;
  year: number | null;
  color: string | null;
  createdAt: string;
}

export interface VehicleDetail {
  id: string;
  customerId: string;
  customerName: string;
  plate: string | null;
  vin: string | null;
  make: string;
  model: string;
  year: number | null;
  color: string | null;
  trim: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface VehicleUpsert {
  customerId: string;
  make: string;
  model: string;
  plate?: string | null;
  vin?: string | null;
  year?: number | null;
  color?: string | null;
  trim?: string | null;
  notes?: string | null;
}

export interface PaginatedResponse<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalCount: number;
}
