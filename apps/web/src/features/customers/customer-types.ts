export interface CustomerListItem {
  id: string;
  fullName: string;
  phoneE164: string | null;
  email: string | null;
  tags: string[];
  whatsAppConsent: boolean;
  createdAt: string;
}

export interface CustomerDetail {
  id: string;
  fullName: string;
  phoneE164: string | null;
  email: string | null;
  notes: string | null;
  tags: string[];
  whatsAppConsent: boolean;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerUpsert {
  fullName: string;
  phoneE164?: string | null;
  email?: string | null;
  notes?: string | null;
  tags?: string[];
  whatsAppConsent?: boolean;
}

export interface PaginatedResponse<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalCount: number;
}
