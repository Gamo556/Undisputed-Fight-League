import { sql } from "drizzle-orm";
import { pgTable, text, varchar, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Available weightclasses
export const WEIGHTCLASSES = [
  "Heavyweight",
  "Light Heavyweight",
  "Cruiserweight",
  "Light Middleweight",
  "Middleweight",
  "Welterweight",
  "Lightweight",
  "Featherweight",
  "Bantamweight",
  "Flyweight",
  "Strawweight",
] as const;

export type Weightclass = typeof WEIGHTCLASSES[number];

// Fight tracking
export interface Fight {
  id: string;
  fighter1Id: string;
  fighter1Username: string;
  fighter1Weightclass?: string;
  fighter2Id: string;
  fighter2Username: string;
  fighter2Weightclass?: string;
  resolvedWeightclass?: string;
  channelId: string;
  channelName: string;
  channelLink: string;
  guildId: string;
  fightType: "CAF" | "Offline" | "On The Rise" | "Thursday Throwdown";
  rounds?: number | "RBC" | "ABC" | "World";
  status: "active" | "pending" | "completed";
  winnerId?: string;
  lastActivity: string;
  createdAt: string;
}

export interface InsertFight {
  fighter1Id: string;
  fighter1Username: string;
  fighter1Weightclass?: string;
  fighter2Id: string;
  fighter2Username: string;
  fighter2Weightclass?: string;
  resolvedWeightclass?: string;
  channelId: string;
  channelName: string;
  channelLink: string;
  guildId: string;
  fightType: "CAF" | "Offline" | "On The Rise" | "Thursday Throwdown";
  rounds?: number | "RBC" | "ABC" | "World";
  status?: "active" | "pending" | "completed";
  winnerId?: string;
}

// Notification subscription for fight response alerts
export interface NotificationSubscription {
  fightId: string;
  odescription: string;
  enabled: boolean;
}

// Activity log for dashboard
export type ActivityType = "dm_sent" | "fight_created" | "message_notify" | "fight_completed";

export interface Activity {
  id: string;
  type: ActivityType;
  message: string;
  timestamp: string;
}

export interface InsertActivity {
  type: ActivityType;
  message: string;
}

// Fighter contact list
export interface Fighter {
  id: string;
  discordId: string;
  displayName: string;
  addedAt: string;
}

export interface InsertFighter {
  discordId: string;
  displayName: string;
}

// Bot settings
export interface BotSettings {
  autoNotifyOnMatch: boolean;
  notifyOnNewMessage: boolean;
  dmTemplate: string;
  fightChatPrefix: string;
  selectedGuildId?: string;
}
