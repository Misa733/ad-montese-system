import { Moon, Sun } from "lucide-react";
import { Button } from "./button";

export function ThemeToggle({ isDark, onToggle }: { isDark: boolean; onToggle: () => void }) {
  const Icon = isDark ? Sun : Moon;
  return (
    <Button variant="outline" size="icon" onClick={onToggle} aria-label="Alternar tema">
      <Icon className="h-4 w-4" />
    </Button>
  );
}
