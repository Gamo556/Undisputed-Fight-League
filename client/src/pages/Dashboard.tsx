import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Header } from "@/components/Header";
import { StatsCard } from "@/components/StatsCard";
import { FightCard } from "@/components/FightCard";
import { ActivityFeed } from "@/components/ActivityFeed";
import { EmptyState } from "@/components/EmptyState";
import { SettingsDialog } from "@/components/SettingsDialog";
import { CreateFightDialog } from "@/components/CreateFightDialog";
import { FightersTab } from "@/pages/FightersTab";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Swords, Users, MessageSquare, Bell, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Fight, Activity, BotSettings } from "@shared/schema";

interface Stats {
  activeFights: number;
  totalFighters: number;
  dmsSentToday: number;
  pendingNotifs: number;
}

interface BotStatus {
  connected: boolean;
  username?: string;
}

function formatTimeAgo(timestamp: string): string {
  const now = new Date();
  const time = new Date(timestamp);
  const diffMs = now.getTime() - time.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
  
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
}

export default function Dashboard() {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [createFightOpen, setCreateFightOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("active");
  const [fightTypeFilter, setFightTypeFilter] = useState<"all" | "CAF" | "Offline" | "On The Rise" | "Thursday Throwdown">("all");
  const { toast } = useToast();

  // Fetch bot status
  const { data: botStatus } = useQuery<BotStatus>({
    queryKey: ["/api/bot/status"],
    refetchInterval: 30000,
  });

  // Fetch stats
  const { data: stats, isLoading: statsLoading } = useQuery<Stats>({
    queryKey: ["/api/stats"],
    refetchInterval: 10000,
  });

  // Fetch fights
  const { data: fights = [], isLoading: fightsLoading } = useQuery<Fight[]>({
    queryKey: ["/api/fights"],
    refetchInterval: 10000,
  });

  // Fetch activities
  const { data: activities = [], isLoading: activitiesLoading } = useQuery<Activity[]>({
    queryKey: ["/api/activities"],
    refetchInterval: 10000,
  });

  // Fetch settings
  const { data: settings } = useQuery<BotSettings>({
    queryKey: ["/api/settings"],
  });

  // Notify mutation
  const notifyMutation = useMutation({
    mutationFn: async (userId: string) => {
      return apiRequest("POST", `/api/notify/${userId}`, {
        message: "Your opponent is waiting for your response in the fight chat!",
      });
    },
    onSuccess: () => {
      toast({
        title: "Notification Sent",
        description: "DM notification sent to fighter",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/activities"] });
    },
    onError: () => {
      toast({
        title: "Failed to Send",
        description: "Could not send notification. Make sure the bot is connected.",
        variant: "destructive",
      });
    },
  });

  // Delete fight mutation
  const deleteFightMutation = useMutation({
    mutationFn: async (fightId: string) => {
      return apiRequest("DELETE", `/api/fights/${fightId}`, {});
    },
    onSuccess: () => {
      toast({
        title: "Fight Deleted",
        description: "Fight has been removed",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/fights"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
    },
    onError: () => {
      toast({
        title: "Failed to Delete",
        description: "Could not delete fight. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Create fight mutation
  interface Fighter {
    id: string;
    username: string;
  }
  
  const createFightMutation = useMutation({
    mutationFn: async ({ fighter1, fighter2, fightType, guildId, rounds }: { fighter1: Fighter; fighter2: Fighter; fightType: string; guildId: string; rounds?: number | string }) => {
      return apiRequest("POST", "/api/fights", {
        fighter1Id: fighter1.id,
        fighter1Username: fighter1.username,
        fighter2Id: fighter2.id,
        fighter2Username: fighter2.username,
        fightType: fightType,
        guildId: guildId,
        rounds: rounds,
      });
    },
    onSuccess: () => {
      toast({
        title: "Fight Created",
        description: "New fight has been created. DMs will be sent to fighters.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/fights"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/activities"] });
    },
    onError: () => {
      toast({
        title: "Failed to Create Fight",
        description: "Could not create the fight. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Update settings mutation
  const updateSettingsMutation = useMutation({
    mutationFn: async (newSettings: Partial<BotSettings>) => {
      return apiRequest("PATCH", "/api/settings", newSettings);
    },
    onSuccess: () => {
      toast({
        title: "Settings Saved",
        description: "Bot configuration updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
    },
    onError: () => {
      toast({
        title: "Failed to Save",
        description: "Could not update settings. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleNotify = (fighterId: string) => {
    notifyMutation.mutate(fighterId);
  };

  const handleDeleteFight = (fightId: string) => {
    deleteFightMutation.mutate(fightId);
  };

  const handleCreateFight = (fighter1: Fighter, fighter2: Fighter, fightType: string, guildId: string, rounds?: number | string) => {
    createFightMutation.mutate({ fighter1, fighter2, fightType, guildId, rounds });
  };

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/fights"] });
    queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
    queryClient.invalidateQueries({ queryKey: ["/api/activities"] });
    queryClient.invalidateQueries({ queryKey: ["/api/bot/status"] });
    toast({
      title: "Refreshed",
      description: "Dashboard data updated",
    });
  };

  // Transform fights into the format expected by FightCard
  const transformedFights = fights.map((fight) => ({
    id: fight.id,
    fighter1: {
      id: fight.fighter1Id,
      username: fight.fighter1Username,
      lastSeen: formatTimeAgo(fight.lastActivity),
    },
    fighter2: {
      id: fight.fighter2Id,
      username: fight.fighter2Username,
      lastSeen: formatTimeAgo(fight.lastActivity),
    },
    channelName: fight.channelName,
    channelLink: fight.channelLink,
    status: fight.status,
    lastActivity: formatTimeAgo(fight.lastActivity),
    unreadCount: 0,
  }));

  // Transform activities
  const transformedActivities = activities.map((activity) => ({
    id: activity.id,
    type: activity.type,
    message: activity.message,
    timestamp: formatTimeAgo(activity.timestamp),
  }));

  const filteredFights = fightTypeFilter === "all" 
    ? transformedFights 
    : transformedFights.filter((f) => (f as any).fightType === fightTypeFilter);
  const activeFights = filteredFights.filter((f) => f.status === "active");
  const completedFights = filteredFights.filter((f) => f.status === "completed");

  return (
    <div className="min-h-screen bg-background">
      <Header
        botStatus={botStatus?.connected ? "online" : "offline"}
        serverName="Undisputed Boxing League"
        onRefresh={handleRefresh}
        onSettings={() => setSettingsOpen(true)}
      />

      <main className="container max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {statsLoading ? (
            <>
              <Skeleton className="h-[120px]" />
              <Skeleton className="h-[120px]" />
              <Skeleton className="h-[120px]" />
              <Skeleton className="h-[120px]" />
            </>
          ) : (
            <>
              <StatsCard
                title="Active Fights"
                value={stats?.activeFights || 0}
                description={`${completedFights.length} completed`}
                icon={Swords}
              />
              <StatsCard
                title="Total Fighters"
                value={stats?.totalFighters || 0}
                description="registered fighters"
                icon={Users}
              />
              <StatsCard
                title="DMs Sent Today"
                value={stats?.dmsSentToday || 0}
                description="notifications delivered"
                icon={MessageSquare}
              />
              <StatsCard
                title="Pending Notifs"
                value={stats?.pendingNotifs || 0}
                description="awaiting delivery"
                icon={Bell}
              />
            </>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <div className="flex flex-col gap-4 mb-4">
              <Tabs value={fightTypeFilter} onValueChange={(value) => setFightTypeFilter(value as any)} className="w-full">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <TabsList>
                    <TabsTrigger value="all" data-testid="tab-all-types">
                      All Types
                    </TabsTrigger>
                    <TabsTrigger value="CAF" data-testid="tab-caf">
                      CAF
                    </TabsTrigger>
                    <TabsTrigger value="Offline" data-testid="tab-offline">
                      Offline
                    </TabsTrigger>
                    <TabsTrigger value="On The Rise" data-testid="tab-on-the-rise">
                      On The Rise
                    </TabsTrigger>
                    <TabsTrigger value="Thursday Throwdown" data-testid="tab-thursday-throwdown">
                      Thursday Throwdown
                    </TabsTrigger>
                  </TabsList>
                  <Button onClick={() => setCreateFightOpen(true)} data-testid="button-new-fight">
                    <Plus className="h-4 w-4 mr-2" />
                    New Fight
                  </Button>
                </div>
              </Tabs>

              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList>
                  <TabsTrigger value="active" data-testid="tab-active">
                    Active ({activeFights.length})
                  </TabsTrigger>
                  <TabsTrigger value="completed" data-testid="tab-completed">
                    Completed ({completedFights.length})
                  </TabsTrigger>
                  <TabsTrigger value="all" data-testid="tab-all">
                    All ({filteredFights.length})
                  </TabsTrigger>
                  <TabsTrigger value="fighters" data-testid="tab-fighters">
                    Fighters
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="active" className="mt-4">
                  {fightsLoading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Skeleton className="h-[280px]" />
                      <Skeleton className="h-[280px]" />
                    </div>
                  ) : activeFights.length === 0 ? (
                    <EmptyState
                      icon={Swords}
                      title="No Active Fights"
                      description="All fights are either completed or awaiting start"
                    />
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {activeFights.map((fight) => (
                        <FightCard key={fight.id} {...fight} onNotify={handleNotify} onDelete={handleDeleteFight} />
                      ))}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="completed" className="mt-4">
                  {fightsLoading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Skeleton className="h-[280px]" />
                    </div>
                  ) : completedFights.length === 0 ? (
                    <EmptyState
                      icon={Swords}
                      title="No Completed Fights"
                      description="Finished fights will appear here"
                    />
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {completedFights.map((fight) => (
                        <FightCard key={fight.id} {...fight} onNotify={handleNotify} onDelete={handleDeleteFight} />
                      ))}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="fighters" className="mt-4">
                  <FightersTab />
                </TabsContent>

                <TabsContent value="all" className="mt-4">
                  {fightsLoading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Skeleton className="h-[280px]" />
                      <Skeleton className="h-[280px]" />
                    </div>
                  ) : filteredFights.length === 0 ? (
                    <EmptyState
                      icon={Swords}
                      title="No Fights Yet"
                      description="Create your first fight to get started"
                      action={{
                        label: "Create First Fight",
                        onClick: () => setCreateFightOpen(true),
                      }}
                    />
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {filteredFights.map((fight) => (
                        <FightCard key={fight.id} {...fight} onNotify={handleNotify} />
                      ))}
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </div>
          </div>

          <div className="lg:col-span-1">
            {activitiesLoading ? (
              <Skeleton className="h-[400px]" />
            ) : (
              <ActivityFeed activities={transformedActivities} />
            )}
          </div>
        </div>
      </main>

      {settings && (
        <SettingsDialog
          open={settingsOpen}
          onOpenChange={setSettingsOpen}
          settings={settings}
          onSave={(newSettings) => {
            updateSettingsMutation.mutate(newSettings);
          }}
        />
      )}

      <CreateFightDialog
        open={createFightOpen}
        onOpenChange={setCreateFightOpen}
        onCreate={handleCreateFight}
      />
    </div>
  );
}
