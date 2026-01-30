import { ActivityFeed } from "../ActivityFeed";

// todo: remove mock functionality
const mockActivities = [
  {
    id: "1",
    type: "dm_sent" as const,
    message: "DM sent to IronMike2024 about new fight chat",
    timestamp: "2 minutes ago",
  },
  {
    id: "2",
    type: "fight_created" as const,
    message: "New fight: IronMike2024 vs KnockoutKing",
    timestamp: "5 minutes ago",
  },
  {
    id: "3",
    type: "message_notify" as const,
    message: "Notified ChampBoxer about opponent response",
    timestamp: "12 minutes ago",
  },
  {
    id: "4",
    type: "fight_completed" as const,
    message: "Fight completed: ShadowPuncher won",
    timestamp: "1 hour ago",
  },
  {
    id: "5",
    type: "dm_sent" as const,
    message: "DM sent to ThunderFist about match rules",
    timestamp: "2 hours ago",
  },
];

export default function ActivityFeedExample() {
  return (
    <div className="max-w-md">
      <ActivityFeed activities={mockActivities} />
    </div>
  );
}
