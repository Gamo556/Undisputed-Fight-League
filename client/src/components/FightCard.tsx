import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { StatusBadge } from "./StatusBadge";
import { ExternalLink, Bell, MessageSquare, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface Fighter {
  id: string;
  username: string;
  avatarUrl?: string;
  lastSeen?: string;
}

interface FightCardProps {
  id: string;
  fighter1: Fighter;
  fighter2: Fighter;
  channelName: string;
  channelLink: string;
  status: "active" | "pending" | "completed";
  lastActivity?: string;
  unreadCount?: number;
  rounds?: number | string;
  onNotify?: (fighterId: string) => void;
  onDelete?: (fightId: string) => void;
  className?: string;
}

export function FightCard({
  id,
  fighter1,
  fighter2,
  channelName,
  channelLink,
  status,
  lastActivity,
  unreadCount = 0,
  rounds,
  onNotify,
  onDelete,
  className,
}: FightCardProps) {
  const getInitials = (name: string) => {
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <Card className={cn("hover-elevate", className)} data-testid={`card-fight-${id}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-semibold text-sm truncate">#{channelName}</span>
            {unreadCount > 0 && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-medium text-primary-foreground">
                {unreadCount}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge status={status} />
            {onDelete && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onDelete(id)}
                data-testid={`button-delete-fight-${id}`}
                className="h-8 w-8 opacity-60 hover:opacity-100 transition-opacity"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10 border border-border">
              <AvatarImage src={fighter1.avatarUrl} alt={fighter1.username} />
              <AvatarFallback className="text-xs bg-muted">
                {getInitials(fighter1.username)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{fighter1.username}</p>
              {fighter1.lastSeen && (
                <p className="text-xs text-muted-foreground">{fighter1.lastSeen}</p>
              )}
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onNotify?.(fighter1.id)}
            data-testid={`button-notify-${fighter1.id}`}
          >
            <Bell className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex-1 h-px bg-border" />
          <span className="text-xs font-bold text-muted-foreground px-2">VS</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10 border border-border">
              <AvatarImage src={fighter2.avatarUrl} alt={fighter2.username} />
              <AvatarFallback className="text-xs bg-muted">
                {getInitials(fighter2.username)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{fighter2.username}</p>
              {fighter2.lastSeen && (
                <p className="text-xs text-muted-foreground">{fighter2.lastSeen}</p>
              )}
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onNotify?.(fighter2.id)}
            data-testid={`button-notify-${fighter2.id}`}
          >
            <Bell className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center justify-between text-xs text-muted-foreground gap-2">
          {lastActivity && (
            <p className="flex items-center gap-1">
              <MessageSquare className="h-3 w-3" />
              Last activity: {lastActivity}
            </p>
          )}
          {rounds && (
            <span className="font-medium" data-testid={`text-rounds-${id}`}>
              {typeof rounds === 'string' && ['RBC', 'ABC', 'World'].includes(rounds) ? `${rounds} CHAMP` : `${rounds} RD`}
            </span>
          )}
        </div>

        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={() => window.open(channelLink, "_blank")}
          data-testid={`button-open-channel-${id}`}
        >
          <ExternalLink className="h-4 w-4 mr-2" />
          Open Fight Chat
        </Button>
      </CardContent>
    </Card>
  );
}
