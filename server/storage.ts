import { 
  type User, 
  type InsertUser, 
  type Fight, 
  type InsertFight,
  type Activity,
  type InsertActivity,
  type NotificationSubscription,
  type BotSettings,
  type Fighter,
  type InsertFighter
} from "@shared/schema";
import { randomUUID } from "crypto";
import { promises as fs } from "fs";
import { join } from "path";

export interface IStorage {
  // User methods
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Fight methods
  getFights(): Promise<Fight[]>;
  getFight(id: string): Promise<Fight | undefined>;
  getFightByChannelId(channelId: string): Promise<Fight | undefined>;
  createFight(fight: InsertFight): Promise<Fight>;
  updateFightStatus(id: string, status: Fight["status"]): Promise<Fight | undefined>;
  updateFightActivity(id: string): Promise<Fight | undefined>;
  updateFightWinner(id: string, winnerId: string): Promise<Fight | undefined>;
  deleteFight(id: string): Promise<boolean>;
  
  // Fighter contact methods
  getFighters(): Promise<Fighter[]>;
  addFighter(fighter: InsertFighter): Promise<Fighter>;
  updateFighter(id: string, fighter: Partial<InsertFighter>): Promise<Fighter | undefined>;
  deleteFighter(id: string): Promise<boolean>;
  getFightersByDiscordId(discordId: string): Promise<Fighter[]>;
  
  // Notification subscription methods
  getNotificationSubscription(fightId: string, userId: string): Promise<NotificationSubscription | undefined>;
  setNotificationSubscription(fightId: string, userId: string, enabled: boolean): Promise<NotificationSubscription>;
  
  // Activity methods
  getActivities(limit?: number): Promise<Activity[]>;
  logActivity(activity: InsertActivity): Promise<Activity>;
  
  // Settings methods
  getSettings(): Promise<BotSettings>;
  updateSettings(settings: Partial<BotSettings>): Promise<BotSettings>;
}

export class FileStorage implements IStorage {
  private users: Map<string, User>;
  private fights: Map<string, Fight>;
  private fighters: Map<string, Fighter>;
  private subscriptions: Map<string, NotificationSubscription>;
  private activities: Activity[];
  private settings: BotSettings;
  private dataDir: string;
  private fightFile: string;
  private fighterFile: string;

  constructor(dataDir: string = "data") {
    this.dataDir = dataDir;
    this.fightFile = join(dataDir, "fights.json");
    this.fighterFile = join(dataDir, "fighters.json");
    this.users = new Map();
    this.fights = new Map();
    this.fighters = new Map();
    this.subscriptions = new Map();
    this.activities = [];
    this.settings = {
      autoNotifyOnMatch: true,
      notifyOnNewMessage: true,
      dmTemplate: "You've been matched for a fight in the Undisputed Boxing League!",
      fightChatPrefix: "fight-",
    };
  }

  async init(): Promise<void> {
    try {
      await fs.mkdir(this.dataDir, { recursive: true });
      await this.loadFights();
      await this.loadFighters();
    } catch (error) {
      console.error("[Storage] Error initializing storage:", error);
    }
  }

  private async loadFights(): Promise<void> {
    try {
      const data = await fs.readFile(this.fightFile, "utf-8");
      const fights = JSON.parse(data) as Fight[];
      this.fights.clear();
      fights.forEach((fight) => {
        this.fights.set(fight.id, fight);
      });
      console.log(`[Storage] Loaded ${fights.length} fights from file`);
    } catch (error) {
      // File doesn't exist yet, that's okay
      console.log("[Storage] No existing fights file, starting fresh");
    }
  }

  private async saveFights(): Promise<void> {
    try {
      const fights = Array.from(this.fights.values());
      await fs.writeFile(this.fightFile, JSON.stringify(fights, null, 2), "utf-8");
    } catch (error) {
      console.error("[Storage] Error saving fights:", error);
    }
  }

  private async loadFighters(): Promise<void> {
    try {
      const data = await fs.readFile(this.fighterFile, "utf-8");
      const fighters = JSON.parse(data) as Fighter[];
      this.fighters.clear();
      fighters.forEach((fighter) => {
        this.fighters.set(fighter.id, fighter);
      });
      console.log(`[Storage] Loaded ${fighters.length} fighters from file`);
    } catch (error) {
      console.log("[Storage] No existing fighters file, starting fresh");
    }
  }

  private async saveFighters(): Promise<void> {
    try {
      const fighters = Array.from(this.fighters.values());
      await fs.writeFile(this.fighterFile, JSON.stringify(fighters, null, 2), "utf-8");
    } catch (error) {
      console.error("[Storage] Error saving fighters:", error);
    }
  }

  // User methods
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  // Fight methods
  async getFights(): Promise<Fight[]> {
    return Array.from(this.fights.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  async getFight(id: string): Promise<Fight | undefined> {
    return this.fights.get(id);
  }

  async getFightByChannelId(channelId: string): Promise<Fight | undefined> {
    return Array.from(this.fights.values()).find(
      (fight) => fight.channelId === channelId
    );
  }

  async createFight(insertFight: InsertFight): Promise<Fight> {
    const id = randomUUID();
    const now = new Date().toISOString();
    const fight: Fight = {
      ...insertFight,
      id,
      status: insertFight.status || "pending",
      lastActivity: now,
      createdAt: now,
    };
    this.fights.set(id, fight);
    await this.saveFights();
    return fight;
  }

  async updateFightStatus(id: string, status: Fight["status"]): Promise<Fight | undefined> {
    const fight = this.fights.get(id);
    if (!fight) return undefined;
    
    fight.status = status;
    fight.lastActivity = new Date().toISOString();
    this.fights.set(id, fight);
    await this.saveFights();
    return fight;
  }

  async updateFightActivity(id: string): Promise<Fight | undefined> {
    const fight = this.fights.get(id);
    if (!fight) return undefined;
    
    fight.lastActivity = new Date().toISOString();
    if (fight.status === "pending") {
      fight.status = "active";
    }
    this.fights.set(id, fight);
    await this.saveFights();
    return fight;
  }

  async updateFightWinner(id: string, winnerId: string): Promise<Fight | undefined> {
    const fight = this.fights.get(id);
    if (!fight) return undefined;
    
    fight.winnerId = winnerId;
    this.fights.set(id, fight);
    await this.saveFights();
    return fight;
  }

  async deleteFight(id: string): Promise<boolean> {
    const deleted = this.fights.delete(id);
    if (deleted) {
      await this.saveFights();
    }
    return deleted;
  }

  // Fighter contact methods
  async getFighters(): Promise<Fighter[]> {
    return Array.from(this.fighters.values()).sort((a, b) => {
      // Sort alphabetically by displayName, then numerically by discordId
      const nameCompare = a.displayName.localeCompare(b.displayName);
      if (nameCompare !== 0) return nameCompare;
      return a.discordId.localeCompare(b.discordId);
    });
  }

  async addFighter(insertFighter: InsertFighter): Promise<Fighter> {
    const id = randomUUID();
    const fighter: Fighter = {
      ...insertFighter,
      id,
      addedAt: new Date().toISOString(),
    };
    this.fighters.set(id, fighter);
    await this.saveFighters();
    return fighter;
  }

  async updateFighter(id: string, updates: Partial<InsertFighter>): Promise<Fighter | undefined> {
    const fighter = this.fighters.get(id);
    if (!fighter) return undefined;
    
    const updated: Fighter = {
      ...fighter,
      discordId: updates.discordId || fighter.discordId,
      displayName: updates.displayName || fighter.displayName,
    };
    this.fighters.set(id, updated);
    await this.saveFighters();
    return updated;
  }

  async getFightersByDiscordId(discordId: string): Promise<Fighter[]> {
    return Array.from(this.fighters.values()).filter(f => f.discordId === discordId);
  }

  async deleteFighter(id: string): Promise<boolean> {
    const deleted = this.fighters.delete(id);
    if (deleted) {
      await this.saveFighters();
    }
    return deleted;
  }

  // Notification subscription methods
  async getNotificationSubscription(fightId: string, userId: string): Promise<NotificationSubscription | undefined> {
    const key = `${fightId}:${userId}`;
    return this.subscriptions.get(key);
  }

  async setNotificationSubscription(fightId: string, userId: string, enabled: boolean): Promise<NotificationSubscription> {
    const key = `${fightId}:${userId}`;
    const subscription: NotificationSubscription = { fightId, odescription: userId, enabled };
    this.subscriptions.set(key, subscription);
    return subscription;
  }

  // Activity methods
  async getActivities(limit: number = 50): Promise<Activity[]> {
    return this.activities.slice(0, limit);
  }

  async logActivity(insertActivity: InsertActivity): Promise<Activity> {
    const activity: Activity = {
      id: randomUUID(),
      ...insertActivity,
      timestamp: new Date().toISOString(),
    };
    this.activities.unshift(activity);
    
    // Keep only the last 100 activities
    if (this.activities.length > 100) {
      this.activities = this.activities.slice(0, 100);
    }
    
    return activity;
  }

  // Settings methods
  async getSettings(): Promise<BotSettings> {
    return { ...this.settings };
  }

  async updateSettings(settings: Partial<BotSettings>): Promise<BotSettings> {
    this.settings = { ...this.settings, ...settings };
    return { ...this.settings };
  }
}

export const storage = new FileStorage();

// Initialize on module load
storage.init().catch(error => console.error("[Storage] Initialization error:", error));
