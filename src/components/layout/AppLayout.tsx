import { useEffect, useState } from "react";
import { Outlet } from "react-router-dom";
import { AppHeader } from "./AppHeader";
import { AppSidebar } from "./AppSidebar";

interface AppLayoutProps {
  isDark: boolean;
  onToggleTheme: () => void;
}

export function AppLayout({ isDark, onToggleTheme }: AppLayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    if (!isSidebarOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsSidebarOpen(false);
    };

    document.body.classList.add("overflow-hidden", "lg:overflow-auto");
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.classList.remove("overflow-hidden", "lg:overflow-auto");
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isSidebarOpen]);

  return (
    <div className="min-h-screen overflow-x-hidden bg-background text-foreground">
      <div className="flex min-w-0">
        <AppSidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
        <div className="min-w-0 flex-1">
          <AppHeader isDark={isDark} onToggleTheme={onToggleTheme} onOpenMenu={() => setIsSidebarOpen(true)} />
          <main className="mx-auto w-full max-w-[1500px] px-3 py-4 sm:px-6 sm:py-6 lg:px-8">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
