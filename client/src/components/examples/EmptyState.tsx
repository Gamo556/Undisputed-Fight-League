import { EmptyState } from "../EmptyState";
import { Swords } from "lucide-react";

export default function EmptyStateExample() {
  return (
    <EmptyState
      icon={Swords}
      title="No Active Fights"
      description="Create a new fight to get started with the Undisputed Boxing League"
      action={{
        label: "Create First Fight",
        onClick: () => console.log("Create fight clicked"),
      }}
    />
  );
}
