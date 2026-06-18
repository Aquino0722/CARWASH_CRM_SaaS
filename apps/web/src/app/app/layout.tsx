"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { TenantProvider } from "@/lib/tenant/tenant-context";
import { TopbarTenant } from "@/components/topbar-tenant";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  LayoutDashboard,
  Users,
  Car,
  ClipboardList,
  Warehouse,
  Wrench,
  Settings,
  Menu,
  LogOut,
} from "lucide-react";

const navItems = [
  { href: "/app", label: "Dashboard", icon: LayoutDashboard },
  { href: "/app/customers", label: "Customers", icon: Users },
  { href: "/app/vehicles", label: "Vehicles", icon: Car },
  { href: "/app/service-orders", label: "Service Orders", icon: ClipboardList },
  { href: "/app/bays", label: "Bays", icon: Warehouse },
  { href: "/app/work-items", label: "Work Items", icon: Wrench },
  { href: "/app/settings", label: "Settings", icon: Settings },
];

function NavList({ onNavClick }: { onNavClick?: () => void }) {
  const pathname = usePathname();
  return (
    <nav className="flex-1 space-y-1 p-4">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavClick}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              isActive
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            )}
          >
            <Icon className="h-4 w-4" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.replace("/login");
      } else {
        setLoading(false);
      }
    });
  }, [router]);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/login");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <TenantProvider>
    <Sheet>
      <div className="flex h-screen overflow-hidden">
        {/* Desktop sidebar */}
        <aside className="hidden md:flex w-64 flex-col border-r bg-card shrink-0">
          <div className="flex h-14 items-center border-b px-6 font-semibold tracking-tight">
            CARWASH
          </div>
          <NavList />
        </aside>

        {/* Main area */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Topbar */}
          <header className="flex h-14 items-center border-b bg-card px-4 gap-4 shrink-0">
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <span className="md:hidden font-semibold tracking-tight">
              CARWASH
            </span>
            <div className="hidden md:block text-sm text-muted-foreground">
              Tenant: <TopbarTenant />
            </div>
            <div className="ml-auto flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={handleLogout}>
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </header>

          {/* Content */}
          <main className="flex-1 overflow-y-auto p-6">{children}</main>
        </div>
      </div>

      {/* Mobile sidebar */}
      <SheetContent side="left" className="w-64 p-0">
        <div className="flex h-14 items-center border-b px-6 font-semibold tracking-tight">
          CARWASH
        </div>
        <NavList onNavClick={() => {}} />
      </SheetContent>
    </Sheet>
    </TenantProvider>
  );
}
