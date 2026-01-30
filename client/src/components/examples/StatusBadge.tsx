import { StatusBadge } from "../StatusBadge";

export default function StatusBadgeExample() {
  return (
    <div className="flex flex-wrap gap-2">
      <StatusBadge status="online" />
      <StatusBadge status="offline" />
      <StatusBadge status="active" />
      <StatusBadge status="pending" />
      <StatusBadge status="completed" />
    </div>
  );
}
