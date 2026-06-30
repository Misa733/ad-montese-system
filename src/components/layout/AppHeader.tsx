import { Menu, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ThemeToggle } from "@/components/ui/theme-toggle";

interface AppHeaderProps {
  isDark: boolean;
  onToggleTheme: () => void;
  onOpenMenu: () => void;
}

export function AppHeader({ isDark, onToggleTheme, onOpenMenu }: AppHeaderProps) {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur">
      <div className="flex h-16 min-w-0 items-center gap-3 px-3 sm:px-6">
        <Button variant="outline" size="icon" className="shrink-0 lg:hidden" aria-label="Abrir menu" aria-controls="app-sidebar" onClick={onOpenMenu}>
          <Menu className="h-4 w-4" />
        </Button>
        <div className="relative hidden min-w-0 flex-1 sm:block">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="max-w-md pl-9" placeholder="Pesquisar membros, recibos, congregacoes..." />
        </div>
        <div className="ml-auto flex min-w-0 items-center gap-2">
          <ThemeToggle isDark={isDark} onToggle={onToggleTheme} />
          <div className="hidden text-right sm:block">
            <p className="text-sm font-medium">Administrador</p>
            <p className="text-xs text-muted-foreground">Sede Montese</p>
          </div>
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary text-sm font-semibold text-primary-foreground">
            AD
          </div>
        </div>
      </div>
    </header>
  );
}
