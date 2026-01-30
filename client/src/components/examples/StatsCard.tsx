import { StatsCard } from "../StatsCard";
import { Swords, Users, MessageSquare, Bell } from "lucide-react";

export default function StatsCardExample() {
  return (
    <div className="grid grid-cols-2 gap-4">
      <StatsCard
        title="Active Fights"
        value={12}
        description="3 awaiting response"
        icon={Swords}
      />
      <StatsCard
        title="Total Fighters"
        value={48}
        description="from last week"
        trend={{ value: 8, isPositive: true }}
        icon={Users}
      />
      <StatsCard
        title="DMs Sent Today"
        value={156}
        description="notifications delivered"
        icon={MessageSquare}
      />
      <StatsCard
        title="Pending Notifs"
        value={7}
        description="awaiting delivery"
        icon={Bell}
      />
    </div>
  );
}
