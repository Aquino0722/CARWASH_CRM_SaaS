"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react";

interface TenantContextType {
  tenantId: string | null;
  setTenantId: (id: string) => void;
  clearTenantId: () => void;
}

const TenantContext = createContext<TenantContextType>({
  tenantId: null,
  setTenantId: () => {},
  clearTenantId: () => {},
});

const STORAGE_KEY = "carwash-tenant-id";

export function TenantProvider({ children }: { children: ReactNode }) {
  const [tenantId, setTenantIdState] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      setTenantIdState(stored);
    }
  }, []);

  const setTenantId = (id: string) => {
    const trimmed = id.trim();
    if (trimmed.length === 0) {
      clearTenantId();
      return;
    }
    localStorage.setItem(STORAGE_KEY, trimmed);
    setTenantIdState(trimmed);
  };

  const clearTenantId = () => {
    localStorage.removeItem(STORAGE_KEY);
    setTenantIdState(null);
  };

  return (
    <TenantContext.Provider value={{ tenantId, setTenantId, clearTenantId }}>
      {children}
    </TenantContext.Provider>
  );
}

export function useTenant() {
  return useContext(TenantContext);
}
