import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bell, MessageSquare, Swords, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";

type ActivityType = "dm_sent" | "fight_created" | "message_notify" | "fight_completed";

interface Activity {
  id: string;
  type: ActivityType;
  message: string;
  timestamp: string;
}

interface ActivityFeedProps {
  activities: Activity[];
  className?: string;
}

const activityIcons: Record<ActivityType, typeof Bell> = {
  dm_sent: MessageSquare,
  fight_created: Swords,
  message_notify: Bell,
  fight_completed: CheckCircle,
};

const activityColors: Record<ActivityType, string> = {
  dm_sent: "text-blue-500 bg-blue-500/10",
  fight_created: "text-primary bg-primary/10",
  message_notify: "text-yellow-500 bg-yellow-500/10",
  fight_completed: "text-green-500 bg-green-500/10",
};

export function ActivityFeed({ activities, className }: ActivityFeedProps) {
  return (
    <Card className={cn("flex flex-col", className)} data-testid="card-activity-feed">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Recent Activity</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 p-0">
        <ScrollArea className="h-[300px] px-4 pb-4">
          {activities.length === 0 ? (
            <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
              No recent activity
            </div>
          ) : (
            <div className="space-y-3">
              {activities.map((activity) => {
                const Icon = activityIcons[activity.type];
                return (
                  <div
                    key={activity.id}
                    className="flex items-start gap-3 p-2 rounded-md hover-elevate"
                    data-testid={`activity-${activity.id}`}
                  >
                    <div
                      className={cn(
                        "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                        activityColors[activity.type]
                      )}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm leading-relaxed">{activity.message}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {activity.timestamp}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
