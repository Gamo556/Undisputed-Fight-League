import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type StatusType = "online" | "offline" | "active" | "pending" | "completed";

interface StatusBadgeProps {
  status: StatusType;
  className?: string;
}

const statusConfig: Record<StatusType, { label: string; className: string }> = {
  online: {
    label: "Online",
    className: "bg-green-500/15 text-green-700 dark:text-green-400 border-green-500/30",
  },
  offline: {
    label: "Offline",
    className: "bg-gray-500/15 text-gray-700 dark:text-gray-400 border-gray-500/30",
  },
  active: {
    label: "Active",
    className: "bg-primary/15 text-primary border-primary/30",
  },
  pending: {
    label: "Pending",
    className: "bg-yellow-500/15 text-yellow-700 dark:text-yellow-400 border-yellow-500/30",
  },
  completed: {
    label: "Completed",
    className: "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30",
  },
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status];

  return (
    <Badge
      variant="outline"
      className={cn(
        "text-xs font-medium no-default-hover-elevate no-default-active-elevate",
        config.className,
        className
      )}
      data-testid={`badge-status-${status}`}
    >
      <span className={cn(
        "mr-1.5 h-1.5 w-1.5 rounded-full",
        status === "online" && "bg-green-500",
        status === "offline" && "bg-gray-500",
        status === "active" && "bg-primary",
        status === "pending" && "bg-yellow-500",
        status === "completed" && "bg-blue-500"
      )} />
      {config.label}
    </Badge>
  );
}
