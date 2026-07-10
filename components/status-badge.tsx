import { Badge } from "@/components/ui/badge";
import type { InstallationStatus } from "@/types/solaris";

const statusConfig = {
  normal: { label: "Normal", dot: "bg-green-500", variant: "success" },
  warning: { label: "Advertencia", dot: "bg-yellow-400", variant: "warning" },
  critical: { label: "Critica", dot: "bg-red-500", variant: "destructive" },
} as const;

export function StatusBadge({ status }: { status: InstallationStatus }) {
  const config = statusConfig[status];

  return (
    <Badge variant={config.variant}>
      <span className={`size-2 rounded-full ${config.dot}`} />
      {config.label}
    </Badge>
  );
}
