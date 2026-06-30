import { X } from "lucide-react";
import { NavLink } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { navItems, productBadges } from "./nav-items";

interface AppSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AppSidebar({ isOpen, onClose }: AppSidebarProps) {
  return (
    <>
      <div
        className={cn("fixed inset-0 z-40 bg-black/45 transition-opacity lg:hidden", isOpen ? "opacity-100" : "pointer-events-none opacity-0")}
        aria-hidden="true"
        onClick={onClose}
      />
      <aside
        id="app-sidebar"
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex h-dvh w-[min(18rem,86vw)] shrink-0 flex-col border-r border-border bg-card p-4 shadow-soft transition-transform duration-200 ease-out lg:sticky lg:top-0 lg:z-auto lg:h-screen lg:w-72 lg:transform-none lg:shadow-none",
          isOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex items-center gap-3 px-2 py-3">
          <img src="/assets/logo.png" alt="AD Montese" className="h-12 w-12 shrink-0 rounded-md object-contain" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold leading-tight">AD Montese</p>
            <p className="truncate text-xs text-muted-foreground">Sistema Administrativo</p>
          </div>
          <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Fechar menu" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="mt-4 space-y-2">
          {productBadges.map(({ label, icon: Icon }) => (
            <div key={label} className="flex items-center gap-2 rounded-md bg-surface px-3 py-2 text-xs text-muted-foreground">
              <Icon className="h-3.5 w-3.5 shrink-0 text-primary" />
              <span className="min-w-0 truncate">{label}</span>
            </div>
          ))}
        </div>

        <nav className="mt-6 min-h-0 flex-1 space-y-1 overflow-y-auto pr-1">
          {navItems.map(({ title, href, icon: Icon }) => (
            <NavLink
              key={href}
              to={href}
              end={href === "/app"}
              onClick={onClose}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
                  isActive && "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground",
                )
              }
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="min-w-0 truncate">{title}</span>
            </NavLink>
          ))}
        </nav>
      </aside>
    </>
  );
}
