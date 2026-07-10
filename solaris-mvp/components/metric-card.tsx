import type { LucideIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function MetricCard({
  title,
  value,
  detail,
  icon: Icon,
  tone = "blue",
}: {
  title: string;
  value: string;
  detail: string;
  icon: LucideIcon;
  tone?: "blue" | "yellow" | "green" | "red";
}) {
  const toneClass = {
    blue: "bg-blue-50 text-blue-700",
    yellow: "bg-yellow-50 text-yellow-700",
    green: "bg-green-50 text-green-700",
    red: "bg-red-50 text-red-700",
  }[tone];

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-3 pb-3">
        <CardTitle className="text-muted-foreground">{title}</CardTitle>
        <div className={`flex size-9 items-center justify-center rounded-md ${toneClass}`}>
          <Icon className="size-4" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-semibold tracking-normal text-foreground">{value}</div>
        <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
      </CardContent>
    </Card>
  );
}
