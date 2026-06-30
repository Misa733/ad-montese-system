import type { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function ChartCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card className="min-w-0 overflow-hidden">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="h-64 min-w-0 overflow-hidden px-2 pb-4 sm:h-72 sm:px-5 lg:h-80">{children}</CardContent>
    </Card>
  );
}
