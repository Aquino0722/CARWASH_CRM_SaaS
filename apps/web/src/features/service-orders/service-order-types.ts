export interface ServiceOrderListItem {
  id: string;
  customerId: string;
  customerName: string;
  vehicleId: string;
  plate: string | null;
  vehicleMake: string | null;
  vehicleModel: string | null;
  status: string;
  title: string;
  packageName: string | null;
  estimatedPrice: number | null;
  scheduledAt: string | null;
  createdAt: string;
}

export interface ServiceOrderDetail {
  id: string;
  customerId: string;
  customerName: string;
  vehicleId: string;
  plate: string | null;
  vehicleMake: string | null;
  vehicleModel: string | null;
  status: string;
  title: string;
  packageName: string | null;
  estimatedPrice: number | null;
  finalPrice: number | null;
  checkInAt: string | null;
  scheduledAt: string | null;
  dueAt: string | null;
  deliveredAt: string | null;
  internalNotes: string | null;
  customerNotes: string | null;
  version: number;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateServiceOrderRequest {
  customerId: string;
  vehicleId: string;
  title: string;
  packageName?: string | null;
  estimatedPrice?: number | null;
  scheduledAt?: string | null;
  dueAt?: string | null;
  internalNotes?: string | null;
  customerNotes?: string | null;
}

export interface UpdateServiceOrderRequest {
  currentVersion: number;
  title: string;
  packageName?: string | null;
  estimatedPrice?: number | null;
  finalPrice?: number | null;
  scheduledAt?: string | null;
  dueAt?: string | null;
  internalNotes?: string | null;
  customerNotes?: string | null;
}

export interface UpdateServiceOrderStatusRequest {
  currentVersion: number;
  status: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalCount: number;
}
