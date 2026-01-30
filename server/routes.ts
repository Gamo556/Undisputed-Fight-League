import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  initializeDiscordBot, 
  getBotStatus, 
  getBotGuilds, 
  findFightChannels,
  sendFightMatchDM,
  sendManualNotification,
  getChannelInfo,
  createFightWithChannel,
  deleteFightChannel,
  updateFightChannelName
} from "./discord";

export async function registerRoutes(app: Express): Promise<Server> {
  // Initialize Discord bot on startup
  const botInitialized = await initializeDiscordBot();
  console.log(`[API] Discord bot initialized: ${botInitialized}`);

  // Bot status endpoint
  app.get("/api/bot/status", (_req, res) => {
    const status = getBotStatus();
    res.json(status);
  });

  // Get bot guilds
  app.get("/api/bot/guilds", async (_req, res) => {
    try {
      const guilds = await getBotGuilds();
      res.json(guilds);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch guilds" });
    }
  });

  // Get fight channels in a guild
  app.get("/api/bot/guilds/:guildId/channels", async (req, res) => {
    try {
      const channels = await findFightChannels(req.params.guildId);
      res.json(channels);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch channels" });
    }
  });

  // Get all fights
  app.get("/api/fights", async (_req, res) => {
    try {
      const fights = await storage.getFights();
      res.json(fights);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch fights" });
    }
  });

  // Get single fight
  app.get("/api/fights/:id", async (req, res) => {
    try {
      const fight = await storage.getFight(req.params.id);
      if (!fight) {
        return res.status(404).json({ error: "Fight not found" });
      }
      res.json(fight);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch fight" });
    }
  });

  // Create new fight
  app.post("/api/fights", async (req, res) => {
    try {
      const { 
        fighter1Id, 
        fighter1Username, 
        fighter2Id, 
        fighter2Username, 
        fightType,
        guildId,
        rounds
      } = req.body;

      // Create fight with Discord channel (just like the slash commands)
      const fight = await createFightWithChannel(
        fighter1Id,
        fighter1Username,
        fighter2Id,
        fighter2Username,
        fightType as 'CAF' | 'Offline' | 'On The Rise' | 'Thursday Throwdown',
        guildId,
        rounds
      );

      res.status(201).json(fight);
    } catch (error) {
      console.error("Error creating fight:", error);
      res.status(500).json({ error: "Failed to create fight" });
    }
  });

  // Update fight status
  app.patch("/api/fights/:id/status", async (req, res) => {
    try {
      const { status } = req.body;
      const fight = await storage.updateFightStatus(req.params.id, status);
      
      if (!fight) {
        return res.status(404).json({ error: "Fight not found" });
      }

      if (status === "completed") {
        await storage.logActivity({
          type: "fight_completed",
          message: `Fight completed: ${fight.fighter1Username} vs ${fight.fighter2Username}`,
        });
      }

      res.json(fight);
    } catch (error) {
      res.status(500).json({ error: "Failed to update fight status" });
    }
  });

  // Delete fight
  app.delete("/api/fights/:id", async (req, res) => {
    try {
      const fight = await storage.getFight(req.params.id);
      if (!fight) {
        return res.status(404).json({ error: "Fight not found" });
      }
      
      // Delete Discord channel if it exists
      if (fight.channelId) {
        await deleteFightChannel(fight.channelId);
      }
      
      // Delete from storage
      const deleted = await storage.deleteFight(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Failed to delete fight" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete fight" });
    }
  });

  // Get all saved fighters
  app.get("/api/fighters", async (_req, res) => {
    try {
      const fighters = await storage.getFighters();
      res.json(fighters);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch fighters" });
    }
  });

  // Add a new fighter to contacts
  app.post("/api/fighters", async (req, res) => {
    try {
      const { discordId, displayName } = req.body;
      if (!discordId || !displayName) {
        return res.status(400).json({ error: "discordId and displayName are required" });
      }
      const fighter = await storage.addFighter({ discordId, displayName });
      res.status(201).json(fighter);
    } catch (error) {
      res.status(500).json({ error: "Failed to add fighter" });
    }
  });

  // Update a fighter
  app.patch("/api/fighters/:id", async (req, res) => {
    try {
      const { discordId, displayName } = req.body;
      const fighter = await storage.getFighters().then(f => f.find(x => x.id === req.params.id));
      if (!fighter) {
        return res.status(404).json({ error: "Fighter not found" });
      }
      
      // Update fighter in storage
      const updated = await storage.updateFighter(req.params.id, {
        discordId: discordId || fighter.discordId,
        displayName: displayName || fighter.displayName
      });

      if (!updated) {
        return res.status(500).json({ error: "Failed to update fighter" });
      }

      // If display name changed, update all fights involving this fighter
      if (displayName && displayName !== fighter.displayName) {
        const allFights = await storage.getFights();
        const fightsToUpdate = allFights.filter(f => 
          f.fighter1Id === fighter.discordId || f.fighter2Id === fighter.discordId
        );

        for (const fight of fightsToUpdate) {
          // Update fight data in storage
          const updatedFight: any = { ...fight };
          
          if (fight.fighter1Id === fighter.discordId) {
            updatedFight.fighter1Username = displayName;
          } else if (fight.fighter2Id === fighter.discordId) {
            updatedFight.fighter2Username = displayName;
          }

          // Update Discord channel name
          await updateFightChannelName(
            fight.guildId,
            fight.channelId,
            updatedFight.fighter1Username,
            updatedFight.fighter2Username,
            fight.fightType
          );

          // Update the fights map directly by getting and updating
          const fights = await storage.getFights();
          const fightToUpdate = fights.find(f => f.id === fight.id);
          if (fightToUpdate) {
            if (fightToUpdate.fighter1Id === fighter.discordId) {
              fightToUpdate.fighter1Username = displayName;
            } else if (fightToUpdate.fighter2Id === fighter.discordId) {
              fightToUpdate.fighter2Username = displayName;
            }
          }
        }

        await storage.logActivity({
          type: 'fight_created',
          message: `Fighter ${fighter.displayName} updated to ${displayName} - channels renamed`
        });
      }

      res.json(updated);
    } catch (error) {
      console.error("Error updating fighter:", error);
      res.status(500).json({ error: "Failed to update fighter" });
    }
  });

  // Delete a fighter
  app.delete("/api/fighters/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteFighter(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Fighter not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete fighter" });
    }
  });

  // Send manual notification to a fighter
  app.post("/api/notify/:userId", async (req, res) => {
    try {
      const { message } = req.body;
      const success = await sendManualNotification(req.params.userId, message || "You have a notification from UBL!");
      
      if (success) {
        res.json({ success: true, message: "Notification sent" });
      } else {
        res.status(500).json({ error: "Failed to send notification. Bot may not be connected or user has DMs disabled." });
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to send notification" });
    }
  });

  // Get activities
  app.get("/api/activities", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const activities = await storage.getActivities(limit);
      res.json(activities);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch activities" });
    }
  });

  // Get bot settings
  app.get("/api/settings", async (_req, res) => {
    try {
      const settings = await storage.getSettings();
      res.json(settings);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch settings" });
    }
  });

  // Update bot settings
  app.patch("/api/settings", async (req, res) => {
    try {
      const settings = await storage.updateSettings(req.body);
      res.json(settings);
    } catch (error) {
      res.status(500).json({ error: "Failed to update settings" });
    }
  });

  // Get stats for dashboard
  app.get("/api/stats", async (_req, res) => {
    try {
      const fights = await storage.getFights();
      const activities = await storage.getActivities(100);
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const dmsSentToday = activities.filter(
        (a) => a.type === "dm_sent" && new Date(a.timestamp) >= today
      ).length;

      const pendingNotifs = fights.filter((f) => f.status === "pending").length;
      const activeFights = fights.filter((f) => f.status === "active").length;

      // Get unique fighters
      const fighterIds = new Set<string>();
      fights.forEach((f) => {
        fighterIds.add(f.fighter1Id);
        fighterIds.add(f.fighter2Id);
      });

      res.json({
        activeFights,
        totalFighters: fighterIds.size,
        dmsSentToday,
        pendingNotifs,
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch stats" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
