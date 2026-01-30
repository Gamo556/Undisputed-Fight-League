// server/index-prod.ts
import fs2 from "node:fs";
import path from "node:path";
import express2 from "express";

// server/app.ts
import express from "express";

// server/routes.ts
import { createServer } from "http";

// server/storage.ts
import { randomUUID } from "crypto";
import { promises as fs } from "fs";
import { join } from "path";
var FileStorage = class {
  users;
  fights;
  fighters;
  subscriptions;
  activities;
  settings;
  dataDir;
  fightFile;
  fighterFile;
  constructor(dataDir = "data") {
    this.dataDir = dataDir;
    this.fightFile = join(dataDir, "fights.json");
    this.fighterFile = join(dataDir, "fighters.json");
    this.users = /* @__PURE__ */ new Map();
    this.fights = /* @__PURE__ */ new Map();
    this.fighters = /* @__PURE__ */ new Map();
    this.subscriptions = /* @__PURE__ */ new Map();
    this.activities = [];
    this.settings = {
      autoNotifyOnMatch: true,
      notifyOnNewMessage: true,
      dmTemplate: "You've been matched for a fight in the Undisputed Boxing League!",
      fightChatPrefix: "fight-"
    };
  }
  async init() {
    try {
      await fs.mkdir(this.dataDir, { recursive: true });
      await this.loadFights();
      await this.loadFighters();
    } catch (error) {
      console.error("[Storage] Error initializing storage:", error);
    }
  }
  async loadFights() {
    try {
      const data = await fs.readFile(this.fightFile, "utf-8");
      const fights = JSON.parse(data);
      this.fights.clear();
      fights.forEach((fight) => {
        this.fights.set(fight.id, fight);
      });
      console.log(`[Storage] Loaded ${fights.length} fights from file`);
    } catch (error) {
      console.log("[Storage] No existing fights file, starting fresh");
    }
  }
  async saveFights() {
    try {
      const fights = Array.from(this.fights.values());
      await fs.writeFile(this.fightFile, JSON.stringify(fights, null, 2), "utf-8");
    } catch (error) {
      console.error("[Storage] Error saving fights:", error);
    }
  }
  async loadFighters() {
    try {
      const data = await fs.readFile(this.fighterFile, "utf-8");
      const fighters = JSON.parse(data);
      this.fighters.clear();
      fighters.forEach((fighter) => {
        this.fighters.set(fighter.id, fighter);
      });
      console.log(`[Storage] Loaded ${fighters.length} fighters from file`);
    } catch (error) {
      console.log("[Storage] No existing fighters file, starting fresh");
    }
  }
  async saveFighters() {
    try {
      const fighters = Array.from(this.fighters.values());
      await fs.writeFile(this.fighterFile, JSON.stringify(fighters, null, 2), "utf-8");
    } catch (error) {
      console.error("[Storage] Error saving fighters:", error);
    }
  }
  // User methods
  async getUser(id) {
    return this.users.get(id);
  }
  async getUserByUsername(username) {
    return Array.from(this.users.values()).find(
      (user) => user.username === username
    );
  }
  async createUser(insertUser) {
    const id = randomUUID();
    const user = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }
  // Fight methods
  async getFights() {
    return Array.from(this.fights.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }
  async getFight(id) {
    return this.fights.get(id);
  }
  async getFightByChannelId(channelId) {
    return Array.from(this.fights.values()).find(
      (fight) => fight.channelId === channelId
    );
  }
  async createFight(insertFight) {
    const id = randomUUID();
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const fight = {
      ...insertFight,
      id,
      status: insertFight.status || "pending",
      lastActivity: now,
      createdAt: now
    };
    this.fights.set(id, fight);
    await this.saveFights();
    return fight;
  }
  async updateFightStatus(id, status) {
    const fight = this.fights.get(id);
    if (!fight) return void 0;
    fight.status = status;
    fight.lastActivity = (/* @__PURE__ */ new Date()).toISOString();
    this.fights.set(id, fight);
    await this.saveFights();
    return fight;
  }
  async updateFightActivity(id) {
    const fight = this.fights.get(id);
    if (!fight) return void 0;
    fight.lastActivity = (/* @__PURE__ */ new Date()).toISOString();
    if (fight.status === "pending") {
      fight.status = "active";
    }
    this.fights.set(id, fight);
    await this.saveFights();
    return fight;
  }
  async deleteFight(id) {
    const deleted = this.fights.delete(id);
    if (deleted) {
      await this.saveFights();
    }
    return deleted;
  }
  // Fighter contact methods
  async getFighters() {
    return Array.from(this.fighters.values()).sort((a, b) => {
      const nameCompare = a.displayName.localeCompare(b.displayName);
      if (nameCompare !== 0) return nameCompare;
      return a.discordId.localeCompare(b.discordId);
    });
  }
  async addFighter(insertFighter) {
    const id = randomUUID();
    const fighter = {
      ...insertFighter,
      id,
      addedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    this.fighters.set(id, fighter);
    await this.saveFighters();
    return fighter;
  }
  async deleteFighter(id) {
    const deleted = this.fighters.delete(id);
    if (deleted) {
      await this.saveFighters();
    }
    return deleted;
  }
  // Notification subscription methods
  async getNotificationSubscription(fightId, userId) {
    const key = `${fightId}:${userId}`;
    return this.subscriptions.get(key);
  }
  async setNotificationSubscription(fightId, userId, enabled) {
    const key = `${fightId}:${userId}`;
    const subscription = { fightId, odescription: userId, enabled };
    this.subscriptions.set(key, subscription);
    return subscription;
  }
  // Activity methods
  async getActivities(limit = 50) {
    return this.activities.slice(0, limit);
  }
  async logActivity(insertActivity) {
    const activity = {
      id: randomUUID(),
      ...insertActivity,
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    };
    this.activities.unshift(activity);
    if (this.activities.length > 100) {
      this.activities = this.activities.slice(0, 100);
    }
    return activity;
  }
  // Settings methods
  async getSettings() {
    return { ...this.settings };
  }
  async updateSettings(settings) {
    this.settings = { ...this.settings, ...settings };
    return { ...this.settings };
  }
};
var storage = new FileStorage();
storage.init().catch((error) => console.error("[Storage] Initialization error:", error));

// server/discord.ts
import {
  Client,
  GatewayIntentBits,
  ChannelType,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  REST,
  Routes,
  PermissionFlagsBits
} from "discord.js";
var discordClient = null;
var isConnected = false;
var FIGHT_CHAT_PREFIX = process.env.FIGHT_CHAT_PREFIX || "fight-";
async function getSavedFighterName(fighterId, fallback) {
  try {
    const fighters = await storage.getFighters();
    const fighter = fighters.find((f) => f.discordId === fighterId);
    return fighter?.displayName || fallback;
  } catch (error) {
    return fallback;
  }
}
async function initializeDiscordBot() {
  const botToken = process.env.DISCORD_BOT_TOKEN;
  if (!botToken) {
    console.log("[Discord] No DISCORD_BOT_TOKEN found. Bot functionality disabled.");
    return false;
  }
  try {
    discordClient = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.GuildMembers
      ]
    });
    discordClient.once("ready", async () => {
      console.log(`[Discord] Bot connected as ${discordClient?.user?.tag}`);
      isConnected = true;
      await registerSlashCommands(botToken);
    });
    discordClient.on("interactionCreate", async (interaction) => {
      if (interaction.isChatInputCommand()) {
        const { commandName } = interaction;
        if (commandName === "caffight") {
          await handleCAFFightCommand(interaction);
        } else if (commandName === "offlinefight") {
          await handleOfflineFightCommand(interaction);
        } else if (commandName === "livefight") {
          await handleLiveFightCommand(interaction);
        } else if (commandName === "notifyreply") {
          await handleNotifyReplyCommand(interaction);
        } else if (commandName === "finishfight") {
          await handleFinishFightCommand(interaction);
        }
      } else if (interaction.isButton()) {
        if (interaction.customId.startsWith("notify_")) {
          await handleNotifyButton(interaction);
        }
      }
    });
    discordClient.on("messageCreate", async (message) => {
      await handleFightChatMessage(message);
    });
    discordClient.on("channelCreate", async (channel) => {
      if (channel.type === ChannelType.GuildText) {
        const textChannel = channel;
        if (textChannel.name.startsWith(FIGHT_CHAT_PREFIX)) {
          console.log(`[Discord] New fight chat detected: ${textChannel.name}`);
          await storage.logActivity({
            type: "fight_created",
            message: `New fight chat created: #${textChannel.name}`
          });
        }
      }
    });
    await discordClient.login(botToken);
    return true;
  } catch (error) {
    console.error("[Discord] Failed to initialize bot:", error);
    return false;
  }
}
async function registerSlashCommands(botToken) {
  try {
    const rest = new REST().setToken(botToken);
    const commands = [
      {
        name: "caffight",
        description: "Create a new CAF fight between two fighters (mods only)",
        options: [
          {
            name: "fighter1",
            description: "First fighter (mention)",
            type: 9,
            // USER type
            required: true
          },
          {
            name: "fighter2",
            description: "Second fighter (mention)",
            type: 9,
            // USER type
            required: true
          }
        ]
      },
      {
        name: "offlinefight",
        description: "Create a new offline fight between two fighters (mods only)",
        options: [
          {
            name: "fighter1",
            description: "First fighter (mention)",
            type: 9,
            // USER type
            required: true
          },
          {
            name: "fighter2",
            description: "Second fighter (mention)",
            type: 9,
            // USER type
            required: true
          }
        ]
      },
      {
        name: "livefight",
        description: "Create a new live fight between two fighters (mods only)",
        options: [
          {
            name: "fighter1",
            description: "First fighter (mention)",
            type: 9,
            // USER type
            required: true
          },
          {
            name: "fighter2",
            description: "Second fighter (mention)",
            type: 9,
            // USER type
            required: true
          }
        ]
      },
      {
        name: "notifyreply",
        description: "Notify your opponent that you responded"
      },
      {
        name: "finishfight",
        description: "Mark this fight as finished (fighters or mods only)"
      }
    ];
    await rest.put(Routes.applicationCommands(discordClient.user.id), { body: commands });
    console.log("[Discord] Slash commands registered");
  } catch (error) {
    console.error("[Discord] Error registering slash commands:", error);
  }
}
async function handleCAFFightCommand(interaction) {
  try {
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageChannels)) {
      await interaction.reply({
        content: "\u274C Only moderators can create fights.",
        ephemeral: true
      });
      return;
    }
    const fighter1 = interaction.options.getUser("fighter1");
    const fighter2 = interaction.options.getUser("fighter2");
    if (!fighter1 || !fighter2) {
      await interaction.reply({ content: "Invalid fighters provided.", ephemeral: true });
      return;
    }
    if (fighter1.id === fighter2.id) {
      await interaction.reply({ content: "A fighter cannot fight themselves!", ephemeral: true });
      return;
    }
    await interaction.deferReply({ ephemeral: true });
    const guild = interaction.guild;
    const fighter1Name = await getSavedFighterName(fighter1.id, fighter1.username);
    const fighter2Name = await getSavedFighterName(fighter2.id, fighter2.username);
    let cafCategory = guild.channels.cache.find((ch) => ch.type === ChannelType.GuildCategory && ch.name === "CAF");
    if (!cafCategory) {
      cafCategory = await guild.channels.create({
        name: "CAF",
        type: ChannelType.GuildCategory
      });
    }
    const channelName = `caf-${fighter1Name}-vs-${fighter2Name}`.toLowerCase().slice(0, 100);
    const channel = await guild.channels.create({
      name: channelName,
      type: ChannelType.GuildText,
      parent: cafCategory.id,
      permissionOverwrites: [
        {
          id: guild.id,
          // @everyone
          deny: [PermissionFlagsBits.ViewChannel]
        },
        {
          id: fighter1.id,
          allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory]
        },
        {
          id: fighter2.id,
          allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory]
        },
        // Allow mods (users with Manage Channels) to see
        {
          id: interaction.member.roles.cache.find((role) => role.permissions.has(PermissionFlagsBits.ManageChannels))?.id || "",
          allow: [PermissionFlagsBits.ViewChannel]
        }
      ]
    });
    const fight = await storage.createFight({
      fighter1Id: fighter1.id,
      fighter1Username: fighter1Name,
      fighter2Id: fighter2.id,
      fighter2Username: fighter2Name,
      channelId: channel.id,
      channelName: channel.name,
      channelLink: `https://discord.com/channels/${guild.id}/${channel.id}`,
      guildId: guild.id,
      fightType: "CAF",
      status: "active"
    });
    const now = /* @__PURE__ */ new Date();
    const deadline = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1e3);
    const deadlineStr = deadline.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
    const welcomeMessage = `**UFL CAF FIGHT**

**DEADLINE: ${deadlineStr}**

Turn in the SCORECARD and OVERALL STATS to <#1443111926023458916> with this format: Winner name def opponent name by (METHOD: KO/Decision/etc)

**10 ROUND CAF BOUT**

\u{1F534} <@${fighter1.id}>

\u{1F535} <@${fighter2.id}>

**FOLLOW THESE STEPS IN ORDER**
\u2022 Read the <#1443046834573676659>
\u2022 ONLY ALLOWED ONE TRAIT
\u2022 TRAIT BANS: LIGHTNING HANDS, STING LIKE A BEE, TIRELESS
\u2022 1.5 damage/1.0 stamina/1.5 relative time`;
    await channel.send(welcomeMessage);
    await sendFightMatchDM(fighter1.id, fighter2Name, channel.name, `https://discord.com/channels/${guild.id}/${channel.id}`, fight.id);
    await sendFightMatchDM(fighter2.id, fighter1Name, channel.name, `https://discord.com/channels/${guild.id}/${channel.id}`, fight.id);
    await interaction.editReply({
      content: `\u2705 Fight created! Channel: ${channel} 

DMs sent to ${fighter1Name} and ${fighter2Name}`
    });
    await storage.logActivity({
      type: "fight_created",
      message: `Fight created: ${fighter1Name} vs ${fighter2Name}`
    });
  } catch (error) {
    console.error("[Discord] Error in /caffight command:", error);
    try {
      await interaction.editReply({
        content: "\u274C Error creating fight. Please check that the bot has channel creation permissions."
      });
    } catch {
    }
  }
}
async function handleOfflineFightCommand(interaction) {
  try {
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageChannels)) {
      await interaction.reply({
        content: "\u274C Only moderators can create fights.",
        ephemeral: true
      });
      return;
    }
    const fighter1 = interaction.options.getUser("fighter1");
    const fighter2 = interaction.options.getUser("fighter2");
    if (!fighter1 || !fighter2) {
      await interaction.reply({ content: "Invalid fighters provided.", ephemeral: true });
      return;
    }
    if (fighter1.id === fighter2.id) {
      await interaction.reply({ content: "A fighter cannot fight themselves!", ephemeral: true });
      return;
    }
    await interaction.deferReply({ ephemeral: true });
    const guild = interaction.guild;
    const fighter1Name = await getSavedFighterName(fighter1.id, fighter1.username);
    const fighter2Name = await getSavedFighterName(fighter2.id, fighter2.username);
    let offlineCategory = guild.channels.cache.find((ch) => ch.type === ChannelType.GuildCategory && ch.name === "Offline");
    if (!offlineCategory) {
      offlineCategory = await guild.channels.create({
        name: "Offline",
        type: ChannelType.GuildCategory
      });
    }
    const channelName = `off-${fighter1Name}-vs-${fighter2Name}`.toLowerCase().slice(0, 100);
    const channel = await guild.channels.create({
      name: channelName,
      type: ChannelType.GuildText,
      parent: offlineCategory.id,
      permissionOverwrites: [
        {
          id: guild.id,
          // @everyone
          deny: [PermissionFlagsBits.ViewChannel]
        },
        {
          id: fighter1.id,
          allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory]
        },
        {
          id: fighter2.id,
          allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory]
        },
        {
          id: interaction.member.roles.cache.find((role) => role.permissions.has(PermissionFlagsBits.ManageChannels))?.id || "",
          allow: [PermissionFlagsBits.ViewChannel]
        }
      ]
    });
    const fight = await storage.createFight({
      fighter1Id: fighter1.id,
      fighter1Username: fighter1Name,
      fighter2Id: fighter2.id,
      fighter2Username: fighter2Name,
      channelId: channel.id,
      channelName: channel.name,
      channelLink: `https://discord.com/channels/${guild.id}/${channel.id}`,
      guildId: guild.id,
      fightType: "Offline",
      status: "active"
    });
    const welcomeMessage = `**UFL OFFLINE FIGHT**

\u{1F534} <@${fighter1.id}>

\u{1F535} <@${fighter2.id}>

**Instructions:**
\u2022 Take your time with this fight
\u2022 Use \`/notifyreply\` to notify your opponent when you respond
\u2022 Use \`/finishfight\` when the match is over`;
    await channel.send(welcomeMessage);
    await sendFightMatchDM(fighter1.id, fighter2Name, channel.name, `https://discord.com/channels/${guild.id}/${channel.id}`, fight.id);
    await sendFightMatchDM(fighter2.id, fighter1Name, channel.name, `https://discord.com/channels/${guild.id}/${channel.id}`, fight.id);
    await interaction.editReply({
      content: `\u2705 Offline fight created! Channel: ${channel} 

DMs sent to ${fighter1Name} and ${fighter2Name}`
    });
    await storage.logActivity({
      type: "fight_created",
      message: `Offline fight created: ${fighter1Name} vs ${fighter2Name}`
    });
  } catch (error) {
    console.error("[Discord] Error in /offlinefight command:", error);
    try {
      await interaction.editReply({
        content: "\u274C Error creating fight. Please check that the bot has channel creation permissions."
      });
    } catch {
    }
  }
}
async function handleLiveFightCommand(interaction) {
  try {
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageChannels)) {
      await interaction.reply({
        content: "\u274C Only moderators can create fights.",
        ephemeral: true
      });
      return;
    }
    const fighter1 = interaction.options.getUser("fighter1");
    const fighter2 = interaction.options.getUser("fighter2");
    if (!fighter1 || !fighter2) {
      await interaction.reply({ content: "Invalid fighters provided.", ephemeral: true });
      return;
    }
    if (fighter1.id === fighter2.id) {
      await interaction.reply({ content: "A fighter cannot fight themselves!", ephemeral: true });
      return;
    }
    await interaction.deferReply({ ephemeral: true });
    const guild = interaction.guild;
    const fighter1Name = await getSavedFighterName(fighter1.id, fighter1.username);
    const fighter2Name = await getSavedFighterName(fighter2.id, fighter2.username);
    let liveCategory = guild.channels.cache.find((ch) => ch.type === ChannelType.GuildCategory && ch.name === "Live");
    if (!liveCategory) {
      liveCategory = await guild.channels.create({
        name: "Live",
        type: ChannelType.GuildCategory
      });
    }
    const channelName = `live-${fighter1Name}-vs-${fighter2Name}`.toLowerCase().slice(0, 100);
    const channel = await guild.channels.create({
      name: channelName,
      type: ChannelType.GuildText,
      parent: liveCategory.id,
      permissionOverwrites: [
        {
          id: guild.id,
          // @everyone
          deny: [PermissionFlagsBits.ViewChannel]
        },
        {
          id: fighter1.id,
          allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory]
        },
        {
          id: fighter2.id,
          allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory]
        },
        {
          id: interaction.member.roles.cache.find((role) => role.permissions.has(PermissionFlagsBits.ManageChannels))?.id || "",
          allow: [PermissionFlagsBits.ViewChannel]
        }
      ]
    });
    const fight = await storage.createFight({
      fighter1Id: fighter1.id,
      fighter1Username: fighter1Name,
      fighter2Id: fighter2.id,
      fighter2Username: fighter2Name,
      channelId: channel.id,
      channelName: channel.name,
      channelLink: `https://discord.com/channels/${guild.id}/${channel.id}`,
      guildId: guild.id,
      fightType: "Live",
      status: "active"
    });
    const welcomeMessage = `**UFL LIVE FIGHT**

\u{1F534} <@${fighter1.id}>

\u{1F535} <@${fighter2.id}>

**This is a LIVE BOUT!**
\u2022 Responses will be streamed in real-time
\u2022 Use \`/notifyreply\` to notify your opponent when you respond
\u2022 Use \`/finishfight\` when the match is over`;
    await channel.send(welcomeMessage);
    await sendFightMatchDM(fighter1.id, fighter2Name, channel.name, `https://discord.com/channels/${guild.id}/${channel.id}`, fight.id);
    await sendFightMatchDM(fighter2.id, fighter1Name, channel.name, `https://discord.com/channels/${guild.id}/${channel.id}`, fight.id);
    await interaction.editReply({
      content: `\u2705 Live fight created! Channel: ${channel} 

DMs sent to ${fighter1Name} and ${fighter2Name}`
    });
    await storage.logActivity({
      type: "fight_created",
      message: `Live fight created: ${fighter1Name} vs ${fighter2Name}`
    });
  } catch (error) {
    console.error("[Discord] Error in /livefight command:", error);
    try {
      await interaction.editReply({
        content: "\u274C Error creating fight. Please check that the bot has channel creation permissions."
      });
    } catch {
    }
  }
}
async function handleNotifyReplyCommand(interaction) {
  try {
    const channel = interaction.channel;
    if (channel.type !== ChannelType.GuildText) {
      await interaction.reply({ content: "This command can only be used in a fight channel.", ephemeral: true });
      return;
    }
    const fight = await storage.getFightByChannelId(channel.id);
    if (!fight) {
      await interaction.reply({ content: "This is not an active fight channel.", ephemeral: true });
      return;
    }
    const userId = interaction.user.id;
    let opponentId = "";
    let opponentName = "";
    let senderName = "";
    if (userId === fight.fighter1Id) {
      opponentId = fight.fighter2Id;
      opponentName = fight.fighter2Username;
      senderName = fight.fighter1Username;
    } else if (userId === fight.fighter2Id) {
      opponentId = fight.fighter1Id;
      opponentName = fight.fighter1Username;
      senderName = fight.fighter2Username;
    } else {
      await interaction.reply({ content: "You are not a fighter in this match.", ephemeral: true });
      return;
    }
    const embed = new EmbedBuilder().setColor(16096779).setTitle("\u{1F514} Opponent Responded!").setDescription(`${senderName} has responded in your fight!`).addFields(
      { name: "Jump to Chat", value: `[Click here to jump to the fight](https://discord.com/channels/${fight.guildId}/${fight.channelId})`, inline: false }
    ).setTimestamp();
    const jumpButton = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setLabel("Jump to Fight").setStyle(ButtonStyle.Link).setURL(`https://discord.com/channels/${fight.guildId}/${fight.channelId}`)
    );
    try {
      const user = await discordClient.users.fetch(opponentId);
      await user.send({ embeds: [embed], components: [jumpButton] });
      await storage.logActivity({
        type: "dm_sent",
        message: `Notification sent to ${opponentName} about ${senderName}'s response`
      });
      await interaction.reply({
        content: `\u2705 ${opponentName} has been notified!`,
        ephemeral: true
      });
    } catch (error) {
      console.error("[Discord] Failed to notify opponent:", error);
      await interaction.reply({
        content: "\u274C Could not notify opponent. They may have DMs disabled.",
        ephemeral: true
      });
    }
  } catch (error) {
    console.error("[Discord] Error in /notifyreply command:", error);
    await interaction.reply({ content: "\u274C Error processing command.", ephemeral: true });
  }
}
async function handleFinishFightCommand(interaction) {
  try {
    const channel = interaction.channel;
    if (channel.type !== ChannelType.GuildText) {
      await interaction.reply({ content: "This command can only be used in a fight channel.", ephemeral: true });
      return;
    }
    const fight = await storage.getFightByChannelId(channel.id);
    if (!fight) {
      await interaction.reply({ content: "This is not an active fight channel.", ephemeral: true });
      return;
    }
    const isFighter = interaction.user.id === fight.fighter1Id || interaction.user.id === fight.fighter2Id;
    const isMod = interaction.memberPermissions?.has(PermissionFlagsBits.ManageChannels);
    if (!isFighter && !isMod) {
      await interaction.reply({
        content: "\u274C Only fighters or moderators can finish a fight.",
        ephemeral: true
      });
      return;
    }
    const newName = `${FIGHT_CHAT_PREFIX}\u2705-${fight.fighter1Username}-vs-${fight.fighter2Username}`.toLowerCase().slice(0, 100);
    await channel.setName(newName);
    await storage.updateFightStatus(fight.id, "completed");
    await interaction.reply({
      content: "\u2705 Fight marked as finished!",
      ephemeral: true
    });
    await storage.logActivity({
      type: "fight_completed",
      message: `Fight finished: ${fight.fighter1Username} vs ${fight.fighter2Username}`
    });
  } catch (error) {
    console.error("[Discord] Error in /finishfight command:", error);
    await interaction.reply({ content: "\u274C Error finishing fight.", ephemeral: true });
  }
}
async function handleFightChatMessage(message) {
  if (message.author.bot) return;
  const channel = message.channel;
  if (channel.type !== ChannelType.GuildText) return;
  const textChannel = channel;
  if (!textChannel.name.startsWith(FIGHT_CHAT_PREFIX)) return;
  const fight = await storage.getFightByChannelId(textChannel.id);
  if (!fight) return;
  await storage.updateFightActivity(fight.id);
  const otherFighterId = message.author.id === fight.fighter1Id ? fight.fighter2Id : fight.fighter1Id;
  const subscription = await storage.getNotificationSubscription(fight.id, otherFighterId);
  if (subscription && subscription.enabled) {
    await sendFightResponseNotification(otherFighterId, fight, message.author.username, textChannel);
  }
  await storage.logActivity({
    type: "message_notify",
    message: `New message in #${textChannel.name} from ${message.author.username}`
  });
}
async function handleNotifyButton(interaction) {
  const [, fightId, userId] = interaction.customId.split("_");
  try {
    const current = await storage.getNotificationSubscription(fightId, userId);
    const newState = !current?.enabled;
    await storage.setNotificationSubscription(fightId, userId, newState);
    await interaction.reply({
      content: newState ? "\u2705 Notifications enabled! You will be DMed when your opponent responds." : "\u274C Notifications disabled.",
      ephemeral: true
    });
  } catch (error) {
    console.error("[Discord] Error handling notify button:", error);
    await interaction.reply({
      content: "\u274C Error updating notification settings.",
      ephemeral: true
    });
  }
}
async function createFightWithChannel(fighter1Id, fighter1Username, fighter2Id, fighter2Username, fightType, guildId) {
  if (!discordClient || !isConnected) {
    throw new Error("Discord bot not connected");
  }
  try {
    const guild = discordClient.guilds.cache.get(guildId);
    if (!guild) {
      throw new Error(`Guild ${guildId} not found`);
    }
    let categoryName;
    let channelPrefix;
    let welcomeMessage;
    if (fightType === "CAF") {
      categoryName = "CAF";
      channelPrefix = "caf";
      const deadline = new Date(Date.now() + 7 * 24 * 60 * 60 * 1e3);
      const deadlineStr = deadline.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
      welcomeMessage = `**UFL CAF FIGHT**

**DEADLINE: ${deadlineStr}**

Turn in the SCORECARD and OVERALL STATS to <#1443111926023458916> with this format: Winner name def opponent name by (METHOD: KO/Decision/etc)

**10 ROUND CAF BOUT**

\u{1F534} <@${fighter1Id}>

\u{1F535} <@${fighter2Id}>

**FOLLOW THESE STEPS IN ORDER**
\u2022 Read the <#1443046834573676659>
\u2022 ONLY ALLOWED ONE TRAIT
\u2022 TRAIT BANS: LIGHTNING HANDS, STING LIKE A BEE, TIRELESS
\u2022 1.5 damage/1.0 stamina/1.5 relative time`;
    } else if (fightType === "Offline") {
      categoryName = "Offline";
      channelPrefix = "off";
      welcomeMessage = `**UFL OFFLINE FIGHT**

\u{1F534} <@${fighter1Id}>

\u{1F535} <@${fighter2Id}>

**Instructions:**
\u2022 Take your time with this fight
\u2022 Use \`/notifyreply\` to notify your opponent when you respond
\u2022 Use \`/finishfight\` when the match is over`;
    } else {
      categoryName = "Live";
      channelPrefix = "live";
      welcomeMessage = `**UFL LIVE FIGHT**

\u{1F534} <@${fighter1Id}>

\u{1F535} <@${fighter2Id}>

**This is a LIVE BOUT!**
\u2022 Responses will be streamed in real-time
\u2022 Use \`/notifyreply\` to notify your opponent when you respond
\u2022 Use \`/finishfight\` when the match is over`;
    }
    let category = guild.channels.cache.find((ch) => ch.type === ChannelType.GuildCategory && ch.name === categoryName);
    if (!category) {
      category = await guild.channels.create({
        name: categoryName,
        type: ChannelType.GuildCategory
      });
    }
    const channelName = `${channelPrefix}-${fighter1Username}-vs-${fighter2Username}`.toLowerCase().slice(0, 100);
    const fighter1User = await discordClient.users.fetch(fighter1Id);
    const fighter2User = await discordClient.users.fetch(fighter2Id);
    const channel = await guild.channels.create({
      name: channelName,
      type: ChannelType.GuildText,
      parent: category.id,
      permissionOverwrites: [
        {
          id: guild.id,
          // @everyone
          deny: [PermissionFlagsBits.ViewChannel]
        },
        {
          id: fighter1User.id,
          allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory]
        },
        {
          id: fighter2User.id,
          allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory]
        }
      ]
    });
    const fight = await storage.createFight({
      fighter1Id,
      fighter1Username,
      fighter2Id,
      fighter2Username,
      channelId: channel.id,
      channelName: channel.name,
      channelLink: `https://discord.com/channels/${guild.id}/${channel.id}`,
      guildId,
      fightType,
      status: "active"
    });
    await channel.send(welcomeMessage);
    await sendFightMatchDM(fighter1Id, fighter2Username, channel.name, `https://discord.com/channels/${guild.id}/${channel.id}`, fight.id);
    await sendFightMatchDM(fighter2Id, fighter1Username, channel.name, `https://discord.com/channels/${guild.id}/${channel.id}`, fight.id);
    await storage.logActivity({
      type: "fight_created",
      message: `${fightType} fight created: ${fighter1Username} vs ${fighter2Username}`
    });
    return fight;
  } catch (error) {
    console.error("[Discord] Error creating fight with channel:", error);
    throw error;
  }
}
async function sendFightMatchDM(userId, opponentUsername, channelName, channelLink, fightId, rules) {
  if (!discordClient || !isConnected) {
    console.log("[Discord] Bot not connected, cannot send DM");
    return false;
  }
  try {
    const user = await discordClient.users.fetch(userId);
    const embed = new EmbedBuilder().setColor(14427686).setTitle("New Fight Match!").setDescription(`You have been matched against **${opponentUsername}**!`).addFields(
      { name: "Fight Chat", value: `#${channelName}`, inline: true },
      { name: "Status", value: "Awaiting your response", inline: true }
    ).setTimestamp();
    if (rules) {
      embed.addFields({ name: "Rules", value: rules });
    }
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setLabel("Open Fight Chat").setStyle(ButtonStyle.Link).setURL(channelLink),
      new ButtonBuilder().setCustomId(`notify_${fightId}_${userId}`).setLabel("Enable Response Notifications").setStyle(ButtonStyle.Primary)
    );
    await user.send({ embeds: [embed], components: [row] });
    await storage.logActivity({
      type: "dm_sent",
      message: `DM sent to ${user.username} about new fight match`
    });
    return true;
  } catch (error) {
    console.error(`[Discord] Failed to send DM to user ${userId}:`, error);
    return false;
  }
}
async function sendFightResponseNotification(userId, fight, responderUsername, channel) {
  if (!discordClient || !isConnected) return false;
  try {
    const user = await discordClient.users.fetch(userId);
    const embed = new EmbedBuilder().setColor(16096779).setTitle("Opponent Responded!").setDescription(`**${responderUsername}** has responded in your fight!`).addFields(
      { name: "Fight Chat", value: channel.toString(), inline: true }
    ).setTimestamp();
    const jumpButton = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setLabel("Jump to Chat").setStyle(ButtonStyle.Link).setURL(`https://discord.com/channels/${fight.guildId}/${fight.channelId}`)
    );
    await user.send({ embeds: [embed], components: [jumpButton] });
    await storage.logActivity({
      type: "message_notify",
      message: `Notified ${user.username} about ${responderUsername}'s response`
    });
    return true;
  } catch (error) {
    console.error(`[Discord] Failed to send notification to user ${userId}:`, error);
    return false;
  }
}
async function sendManualNotification(userId, message) {
  if (!discordClient || !isConnected) return false;
  try {
    const user = await discordClient.users.fetch(userId);
    const embed = new EmbedBuilder().setColor(14427686).setTitle("UBL Notification").setDescription(message).setTimestamp();
    await user.send({ embeds: [embed] });
    await storage.logActivity({
      type: "dm_sent",
      message: `Manual notification sent to ${user.username}`
    });
    return true;
  } catch (error) {
    console.error(`[Discord] Failed to send manual notification to ${userId}:`, error);
    return false;
  }
}
function getBotStatus() {
  return {
    connected: isConnected,
    username: discordClient?.user?.username
  };
}
async function getBotGuilds() {
  if (!discordClient) return [];
  try {
    return discordClient.guilds.cache.map((guild) => ({
      id: guild.id,
      name: guild.name,
      icon: guild.iconURL()
    }));
  } catch (error) {
    console.error("[Discord] Error fetching guilds:", error);
    return [];
  }
}
async function findFightChannels(guildId) {
  if (!discordClient) return [];
  try {
    const guild = await discordClient.guilds.fetch(guildId);
    const channels = await guild.channels.fetch();
    return channels.filter((channel) => channel?.type === ChannelType.GuildText && channel.name.startsWith(FIGHT_CHAT_PREFIX)).map((channel) => ({
      id: channel?.id,
      name: channel?.name,
      type: "GUILD_TEXT"
    }));
  } catch (error) {
    console.error("[Discord] Error fetching channels:", error);
    return [];
  }
}

// server/routes.ts
async function registerRoutes(app2) {
  const botInitialized = await initializeDiscordBot();
  console.log(`[API] Discord bot initialized: ${botInitialized}`);
  app2.get("/api/bot/status", (_req, res) => {
    const status = getBotStatus();
    res.json(status);
  });
  app2.get("/api/bot/guilds", async (_req, res) => {
    try {
      const guilds = await getBotGuilds();
      res.json(guilds);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch guilds" });
    }
  });
  app2.get("/api/bot/guilds/:guildId/channels", async (req, res) => {
    try {
      const channels = await findFightChannels(req.params.guildId);
      res.json(channels);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch channels" });
    }
  });
  app2.get("/api/fights", async (_req, res) => {
    try {
      const fights = await storage.getFights();
      res.json(fights);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch fights" });
    }
  });
  app2.get("/api/fights/:id", async (req, res) => {
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
  app2.post("/api/fights", async (req, res) => {
    try {
      const {
        fighter1Id,
        fighter1Username,
        fighter2Id,
        fighter2Username,
        fightType,
        guildId
      } = req.body;
      const fight = await createFightWithChannel(
        fighter1Id,
        fighter1Username,
        fighter2Id,
        fighter2Username,
        fightType,
        guildId
      );
      res.status(201).json(fight);
    } catch (error) {
      console.error("Error creating fight:", error);
      res.status(500).json({ error: "Failed to create fight" });
    }
  });
  app2.patch("/api/fights/:id/status", async (req, res) => {
    try {
      const { status } = req.body;
      const fight = await storage.updateFightStatus(req.params.id, status);
      if (!fight) {
        return res.status(404).json({ error: "Fight not found" });
      }
      if (status === "completed") {
        await storage.logActivity({
          type: "fight_completed",
          message: `Fight completed: ${fight.fighter1Username} vs ${fight.fighter2Username}`
        });
      }
      res.json(fight);
    } catch (error) {
      res.status(500).json({ error: "Failed to update fight status" });
    }
  });
  app2.delete("/api/fights/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteFight(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Fight not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete fight" });
    }
  });
  app2.get("/api/fighters", async (_req, res) => {
    try {
      const fighters = await storage.getFighters();
      res.json(fighters);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch fighters" });
    }
  });
  app2.post("/api/fighters", async (req, res) => {
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
  app2.patch("/api/fighters/:id", async (req, res) => {
    try {
      const { discordId, displayName } = req.body;
      const fighter = await storage.getFighters().then((f) => f.find((x) => x.id === req.params.id));
      if (!fighter) {
        return res.status(404).json({ error: "Fighter not found" });
      }
      const updated = await storage.addFighter({
        discordId: discordId || fighter.discordId,
        displayName: displayName || fighter.displayName
      });
      await storage.deleteFighter(req.params.id);
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "Failed to update fighter" });
    }
  });
  app2.delete("/api/fighters/:id", async (req, res) => {
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
  app2.post("/api/notify/:userId", async (req, res) => {
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
  app2.get("/api/activities", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit) || 50;
      const activities = await storage.getActivities(limit);
      res.json(activities);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch activities" });
    }
  });
  app2.get("/api/settings", async (_req, res) => {
    try {
      const settings = await storage.getSettings();
      res.json(settings);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch settings" });
    }
  });
  app2.patch("/api/settings", async (req, res) => {
    try {
      const settings = await storage.updateSettings(req.body);
      res.json(settings);
    } catch (error) {
      res.status(500).json({ error: "Failed to update settings" });
    }
  });
  app2.get("/api/stats", async (_req, res) => {
    try {
      const fights = await storage.getFights();
      const activities = await storage.getActivities(100);
      const today = /* @__PURE__ */ new Date();
      today.setHours(0, 0, 0, 0);
      const dmsSentToday = activities.filter(
        (a) => a.type === "dm_sent" && new Date(a.timestamp) >= today
      ).length;
      const pendingNotifs = fights.filter((f) => f.status === "pending").length;
      const activeFights = fights.filter((f) => f.status === "active").length;
      const fighterIds = /* @__PURE__ */ new Set();
      fights.forEach((f) => {
        fighterIds.add(f.fighter1Id);
        fighterIds.add(f.fighter2Id);
      });
      res.json({
        activeFights,
        totalFighters: fighterIds.size,
        dmsSentToday,
        pendingNotifs
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch stats" });
    }
  });
  const httpServer = createServer(app2);
  return httpServer;
}

// server/app.ts
function log(message, source = "express") {
  const formattedTime = (/* @__PURE__ */ new Date()).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}
var app = express();
app.use(express.json({
  verify: (req, _res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ extended: false }));
app.use((req, res, next) => {
  const start = Date.now();
  const path2 = req.path;
  let capturedJsonResponse = void 0;
  const originalResJson = res.json;
  res.json = function(bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path2.startsWith("/api")) {
      let logLine = `${req.method} ${path2} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "\u2026";
      }
      log(logLine);
    }
  });
  next();
});
async function runApp(setup) {
  const server = await registerRoutes(app);
  app.use((err, _req, res, _next) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    throw err;
  });
  await setup(app, server);
  const port = parseInt(process.env.PORT || "5000", 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true
  }, () => {
    log(`serving on port ${port}`);
  });
}

// server/index-prod.ts
async function serveStatic(app2, _server) {
  const distPath = path.resolve(import.meta.dirname, "public");
  if (!fs2.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app2.use(express2.static(distPath));
  app2.use("*", (_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
(async () => {
  await runApp(serveStatic);
})();
export {
  serveStatic
};
