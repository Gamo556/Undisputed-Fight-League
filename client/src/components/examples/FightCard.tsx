import { FightCard } from "../FightCard";

// todo: remove mock functionality
const mockFight = {
  id: "fight-001",
  fighter1: {
    id: "fighter-1",
    username: "IronMike2024",
    lastSeen: "Active now",
  },
  fighter2: {
    id: "fighter-2",
    username: "KnockoutKing",
    lastSeen: "2 hours ago",
  },
  channelName: "fight-irommike-vs-knockoutking",
  channelLink: "https://discord.com/channels/123/456",
  status: "active" as const,
  lastActivity: "5 minutes ago",
  unreadCount: 3,
};

export default function FightCardExample() {
  return (
    <div className="max-w-sm">
      <FightCard
        {...mockFight}
        onNotify={(fighterId) => console.log(`Notifying fighter: ${fighterId}`)}
      />
    </div>
  );
}
