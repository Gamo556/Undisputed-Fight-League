import { 
  Client, 
  GatewayIntentBits, 
  TextChannel, 
  Message, 
  ChannelType, 
  EmbedBuilder, 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle,
  REST,
  Routes,
  PermissionFlagsBits,
  ChannelManager
} from 'discord.js';
import { storage } from './storage';

let discordClient: Client | null = null;
let isConnected = false;
let rankingsUpdateInterval: NodeJS.Timeout | null = null;

// Configuration
const FIGHT_CHAT_PREFIX = process.env.FIGHT_CHAT_PREFIX || 'fight-';
const RANKINGS_UPDATE_INTERVAL = 12 * 60 * 60 * 1000; // 12 hours

// Category IDs for different fight types
const CATEGORY_IDS = {
  CAF: '1437452382047965254',
  Offline: '1270419097821384836',
  OnTheRise: '1328664703270125588',
  ThursdayThrowdown: '1407349682895720581'
};

// Hardcoded rankings data from UFL website (fallback)
interface RankingData {
  champion: string | null;
  championRecord?: string;
  fighters: Array<{rank: number, name: string, record: string}>;
}

// Fighter opponent data
interface FighterOpponents {
  [fighterName: string]: Array<{name: string, isWin: boolean}>;
}

let fighterOpponents: FighterOpponents = {};

let rankingsData: Record<string, RankingData> = {
  world: {
    champion: null,
    championRecord: undefined,
    fighters: [
      { rank: 1, name: 'Dominik', record: '4-1-0' },
      { rank: 2, name: 'Veaazy', record: '4-0-0' },
      { rank: 3, name: 'Abbas', record: '4-0-1' },
      { rank: 4, name: 'Macxy', record: '3-1-0' },
      { rank: 5, name: 'SAJ', record: '3-1-0' },
      { rank: 6, name: 'XxDanny', record: '3-1-0' },
      { rank: 7, name: 'Sora', record: '3-0-0' },
      { rank: 8, name: 'Harvey', record: '3-1-0' },
      { rank: 9, name: 'StonelessLemur', record: '2-0-0' },
      { rank: 10, name: 'Moneybag_Mari', record: '2-0-0' },
      { rank: 11, name: 'Playernumber1', record: '2-0-0' },
      { rank: 12, name: 'Crazzysticks', record: '2-0-0' },
      { rank: 13, name: 'Cerebralboxer', record: '2-2-0' },
      { rank: 14, name: 'Max Power', record: '2-2-0' },
      { rank: 15, name: 'NineDaGoon', record: '1-0-0' }
    ]
  },
  rbc: {
    champion: 'Sora',
    championRecord: '3-0-0',
    fighters: [
      { rank: 1, name: 'Dominik', record: '4-1-0' },
      { rank: 2, name: 'Veaazy', record: '4-0-0' },
      { rank: 3, name: 'Abbas', record: '4-0-1' },
      { rank: 4, name: 'Macxy', record: '3-1-0' },
      { rank: 5, name: 'SAJ', record: '3-1-0' },
      { rank: 6, name: 'Harvey', record: '3-1-0' },
      { rank: 7, name: 'Z7', record: '1-1-0' },
      { rank: 8, name: 'Cunno', record: '1-2-0' },
      { rank: 9, name: 'Dancer', record: '1-1-0' },
      { rank: 10, name: 'Brown Snake', record: '1-1-0' },
      { rank: 11, name: 'DXKO', record: '1-2-0' },
      { rank: 12, name: 'Edward', record: '0-0-1' },
      { rank: 13, name: 'Axn', record: '1-2-0' },
      { rank: 14, name: 'Gusa', record: '1-2-0' },
      { rank: 15, name: 'Axdan', record: '0-1-0' }
    ]
  },
  abc: {
    champion: 'Grim Reaper',
    championRecord: '2-0-0',
    fighters: [
      { rank: 1, name: 'XxDanny', record: '3-1-0' },
      { rank: 2, name: 'StonelessLemur', record: '2-0-0' },
      { rank: 3, name: 'Moneybag_Mari', record: '2-0-0' },
      { rank: 4, name: 'Playernumber1', record: '2-0-0' },
      { rank: 5, name: 'Crazzysticks', record: '2-0-0' },
      { rank: 6, name: 'Cerebralboxer', record: '2-2-0' },
      { rank: 7, name: 'Max Power', record: '2-2-0' },
      { rank: 8, name: 'NineDaGoon', record: '1-0-0' },
      { rank: 9, name: 'Blackrob', record: '1-0-0' },
      { rank: 10, name: 'Friskies', record: '1-0-0' },
      { rank: 11, name: 'Junebugz', record: '1-0-0' },
      { rank: 12, name: 'JustinDaBeast', record: '1-0-0' },
      { rank: 13, name: 'Raff', record: '1-0-0' },
      { rank: 14, name: 'SkoolAHardKnox', record: '1-0-0' },
      { rank: 15, name: 'Snipeyy', record: '1-0-0' }
    ]
  }
};

// Global ID to name mapping for fighters
let fighterId_to_name: Record<string, string> = {};

// Exact ranking orders from UFL website (https://ufl-season-3.vercel.app)
const worldRankingOrder = [
  'Dominik', 'Veaazy', 'Macxy', 'SAJ', 'XxDanny', 'Sora', 'Abbas', 'Crazzysticks',
  'StonelessLemur', 'Harvey', 'Moneybag_Mari', 'Playernumber1', 'Cerebralboxer',
  'Max Power', 'NineDaGoon', 'Blackrob', 'Friskies', 'Grim Reaper', 'ItzDom',
  'JustinDaBeast', 'Raff', 'SkoolAHardKnox', 'Snipeyy', 'Strike', 'Z7', 'Jsoba',
  'Sleepy', 'Zedr', 'Babyboi Riv', 'Blaklepercon', 'Cunno', 'DLundy', 'IWoo',
  'DXKO', 'Edward', 'Gamo', 'Helix', 'Jaaay', '44z', 'Axn', 'Brown Snake', 'Gusa',
  'Juggman', 'Malatuya', 'Mark Berger', 'Axdan', 'Bigdude', 'BW_Undisputed',
  'Donnyent', 'Melser', 'Badman', 'DanF2618', 'Freddy', 'HotWheelzBoi', 'Ib', 'IQ',
  'Kash Mula', 'KwonCaesar', 'MacBoxing', 'Ohm', 'Rivera', 'Stealthbomber',
  'Nap', 'Nilxon Reed', 'Callum', 'Aidan', 'DM1FT', 'Dancer'
];

const rbcRankingOrder = [
  'Dominik', 'Veaazy', 'Macxy', 'SAJ', 'Abbas', 'Harvey', 'Z7', 'Jsoba',
  'Zedr', 'Cunno', 'DXKO', 'Edward', '44z', 'Axn', 'Brown Snake'
];

const abcRankingOrder = [
  'XxDanny', 'Crazzysticks', 'StonelessLemur', 'Moneybag_Mari', 'Playernumber1',
  'Cerebralboxer', 'Max Power', 'NineDaGoon', 'Blackrob', 'Friskies', 'ItzDom',
  'JustinDaBeast', 'Raff', 'SkoolAHardKnox', 'Snipeyy'
];

// Get ranking order from hardcoded UFL website rankings
// These are the official rankings from ufl-season-3.vercel.app
function getRankingOrder(region?: 'NA' | 'EU'): string[] {
  if (region === 'EU') return rbcRankingOrder;
  if (region === 'NA') return abcRankingOrder;
  return worldRankingOrder;
}

// Fetch fresh fighters records from Firestore and calculate dynamic rankings based on wins
async function fetchFreshFightersRankings(region?: 'NA' | 'EU'): Promise<Array<{rank: number, name: string, record: string}>> {
  try {
    const projectId = 'ufl-season-3';
    const apiKey = 'AIzaSyBkcyte__qrs-sxQilqjK40Wl5NDJARxzU';
    
    const response = await fetch(
      `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/fighters?key=${apiKey}&pageSize=200`,
      { method: 'GET' }
    );
    
    if (!response.ok) {
      console.error(`[Discord] Failed to fetch fighters: ${response.status}`);
      return [];
    }

    const data = await response.json() as any;
    const fighterRecords: Record<string, {wins: number, losses: number, draws: number}> = {};

    // Get current records from Firestore
    if (data.documents && Array.isArray(data.documents)) {
      for (const doc of data.documents) {
        const fields = doc.fields || {};
        const name = fields.name?.stringValue;
        if (name) {
          fighterRecords[name] = {
            wins: parseInt(fields.wins?.integerValue || '0', 10),
            losses: parseInt(fields.losses?.integerValue || '0', 10),
            draws: parseInt(fields.draws?.integerValue || '0', 10)
          };
        }
      }
    }

    // Get ranking order from official UFL website rankings
    const rankingOrder = getRankingOrder(region);

    // Build list with records for the region
    const fightersWithRecords = rankingOrder.map((name) => {
      const rec = fighterRecords[name] || {wins: 0, losses: 0, draws: 0};
      return {
        name: name,
        wins: rec.wins,
        losses: rec.losses,
        draws: rec.draws,
        record: `${rec.wins}-${rec.losses}-${rec.draws}`
      };
    });

    // Sort by wins (descending), then by losses (ascending) for dynamic ranking
    const sortedFighters = fightersWithRecords.sort((a, b) => {
      if (b.wins !== a.wins) return b.wins - a.wins; // More wins = higher rank
      return a.losses - b.losses; // Fewer losses = higher rank
    });

    // Assign dynamic ranks
    const ranked = sortedFighters.map((fighter, index) => ({
      rank: index + 1,
      name: fighter.name,
      record: fighter.record
    }));

    console.log(`[Discord] Fetched fresh rankings: ${ranked.length} fighters (region: ${region || 'world'}) with dynamic sorting by wins`);
    return ranked;
  } catch (error) {
    console.error('[Discord] Error fetching fresh fighters rankings:', error);
    return [];
  }
}

// Fetch opponent data from Firestore
async function fetchOpponentData(): Promise<Record<string, {wins: number, losses: number, draws: number}>> {
  try {
    // Query fights from Firestore REST API
    const projectId = 'ufl-season-3';
    const apiKey = 'AIzaSyBkcyte__qrs-sxQilqjK40Wl5NDJARxzU';
    
    const response = await fetch(
      `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/fights?key=${apiKey}`,
      { method: 'GET' }
    );
    
    if (!response.ok) {
      console.error(`[Discord] Firestore API error: ${response.status}`);
      return {};
    }

    const data = await response.json() as any;
    fighterOpponents = {};
    fighterId_to_name = {}; // Reset ID mapping
    
    // Track records for each fighter
    const fighterRecords: Record<string, {wins: number, losses: number, draws: number}> = {};

    // Process fights from Firestore
    if (data.documents && Array.isArray(data.documents)) {
      for (const doc of data.documents) {
        const fields = doc.fields || {};
        
        const fighter1Name = fields.fighter1Name?.stringValue;
        const fighter2Name = fields.fighter2Name?.stringValue;
        const fighter1Id = fields.fighter1?.stringValue;
        const fighter2Id = fields.fighter2?.stringValue;
        const winnerId = fields.winner?.stringValue;
        
        if (fighter1Name && fighter2Name && fighter1Id && fighter2Id && winnerId) {
          // Build ID to name mapping
          if (fighter1Id && fighter1Name) {
            fighterId_to_name[fighter1Id] = fighter1Name;
          }
          if (fighter2Id && fighter2Name) {
            fighterId_to_name[fighter2Id] = fighter2Name;
          }
          
          // Initialize records if needed
          if (!fighterRecords[fighter1Name]) {
            fighterRecords[fighter1Name] = {wins: 0, losses: 0, draws: 0};
          }
          if (!fighterRecords[fighter2Name]) {
            fighterRecords[fighter2Name] = {wins: 0, losses: 0, draws: 0};
          }
          
          // Determine who won based on winner ID
          const fighter1Won = winnerId === fighter1Id;
          
          // Update records
          if (fighter1Won) {
            fighterRecords[fighter1Name].wins++;
            fighterRecords[fighter2Name].losses++;
          } else {
            fighterRecords[fighter2Name].wins++;
            fighterRecords[fighter1Name].losses++;
          }
          
          // Add to fighter1's opponents
          if (!fighterOpponents[fighter1Name]) {
            fighterOpponents[fighter1Name] = [];
          }
          fighterOpponents[fighter1Name].push({ 
            name: fighter2Name, 
            isWin: fighter1Won 
          });
          
          // Add to fighter2's opponents
          if (!fighterOpponents[fighter2Name]) {
            fighterOpponents[fighter2Name] = [];
          }
          fighterOpponents[fighter2Name].push({ 
            name: fighter1Name, 
            isWin: !fighter1Won 
          });
        }
      }
    }
    
    console.log(`[Discord] Loaded ${Object.keys(fighterOpponents).length} fighters with fight history at ${new Date().toISOString()}`);
    return fighterRecords;
  } catch (error) {
    console.error('[Discord] Error fetching opponent data from Firestore:', error);
    return {};
  }
}

// Fetch fresh rankings from Firestore and update champions
async function fetchFreshRankings(): Promise<void> {
  try {
    const projectId = 'ufl-season-3';
    const apiKey = 'AIzaSyBkcyte__qrs-sxQilqjK40Wl5NDJARxzU';
    
    // Fetch champions
    const championsResponse = await fetch(
      `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/settings/champions?key=${apiKey}`,
      { method: 'GET' }
    );
    
    let champions: { world: string | null; rbc: string | null; abc: string | null } = { world: null, rbc: null, abc: null };
    if (championsResponse.ok) {
      const champData = await championsResponse.json() as any;
      const fields = champData.fields || {};
      champions.world = fields.world?.stringValue || null;
      champions.rbc = fields.rbc?.stringValue || null;
      champions.abc = fields.abc?.stringValue || null;
    }
    
    // Fetch opponent data to build ID mapping
    await fetchOpponentData();
    
    // Convert champion IDs to names
    if (champions.world && fighterId_to_name[champions.world]) {
      champions.world = fighterId_to_name[champions.world];
    } else {
      champions.world = null;
    }
    if (champions.rbc && fighterId_to_name[champions.rbc]) {
      champions.rbc = fighterId_to_name[champions.rbc];
    } else {
      champions.rbc = null;
    }
    if (champions.abc && fighterId_to_name[champions.abc]) {
      champions.abc = fighterId_to_name[champions.abc];
    } else {
      champions.abc = null;
    }
    
    // Fetch fresh rankings from fighters collection
    const worldRankings = await fetchFreshFightersRankings();
    const rbcRankings = await fetchFreshFightersRankings('EU');
    const abcRankings = await fetchFreshFightersRankings('NA');
    
    // Find champion records before filtering
    let worldChampRecord = '';
    let rbcChampRecord = '';
    let abcChampRecord = '';
    
    if (champions.world) {
      const champ = worldRankings.find(f => f.name === champions.world);
      if (champ) worldChampRecord = champ.record;
    }
    if (champions.rbc) {
      const champ = rbcRankings.find(f => f.name === champions.rbc);
      if (champ) rbcChampRecord = champ.record;
    }
    if (champions.abc) {
      const champ = abcRankings.find(f => f.name === champions.abc);
      if (champ) abcChampRecord = champ.record;
    }
    
    // Filter out champions from rankings (they should only appear as champion, not in top 15)
    const worldFightersFiltered = worldRankings.filter(f => f.name !== champions.world);
    const rbcFightersFiltered = rbcRankings.filter(f => f.name !== champions.rbc);
    const abcFightersFiltered = abcRankings.filter(f => f.name !== champions.abc);
    
    // Re-rank after filtering
    rankingsData.world.fighters = worldFightersFiltered.map((f, i) => ({...f, rank: i + 1}));
    rankingsData.world.champion = champions.world;
    rankingsData.world.championRecord = worldChampRecord;
    
    rankingsData.rbc.fighters = rbcFightersFiltered.map((f, i) => ({...f, rank: i + 1}));
    rankingsData.rbc.champion = champions.rbc;
    rankingsData.rbc.championRecord = rbcChampRecord;
    
    rankingsData.abc.fighters = abcFightersFiltered.map((f, i) => ({...f, rank: i + 1}));
    rankingsData.abc.champion = champions.abc;
    rankingsData.abc.championRecord = abcChampRecord;
    
    console.log(`[Discord] Updated fresh rankings at ${new Date().toISOString()}`);
  } catch (error) {
    console.error('[Discord] Error fetching fresh rankings:', error);
  }
}

// Get rankings (returns cached data)
async function fetchRankings(rankingType: 'world' | 'rbc' | 'abc'): Promise<RankingData | null> {
  try {
    return rankingsData[rankingType] || null;
  } catch (error) {
    console.error('[Discord] Error fetching rankings:', error);
    return null;
  }
}

// Start rankings update scheduler
function startRankingsUpdateScheduler(): void {
  if (rankingsUpdateInterval) {
    clearInterval(rankingsUpdateInterval);
  }
  
  // Fetch immediately on startup
  fetchFreshRankings();
  
  // Then schedule for every 12 hours
  rankingsUpdateInterval = setInterval(() => {
    fetchFreshRankings();
  }, RANKINGS_UPDATE_INTERVAL);
  
  console.log('[Discord] Rankings update scheduler started (every 12 hours)');
}

// Parse record string (e.g., "3-1-0") to wins count
function parseRecordWins(record: string): number {
  const [wins] = record.split('-').map(Number);
  return wins;
}

// Fuzzy match fighter name (find fighter by partial name match)
function findFighterByPartialName(
  searchTerm: string,
  fighters: Array<{rank: number, name: string, record: string}>
): {rank: number, name: string, record: string} | null {
  const term = searchTerm.toLowerCase().trim();
  
  // Exact match first (case-insensitive)
  let found = fighters.find(f => f.name.toLowerCase() === term);
  if (found) return found;
  
  // Partial match - check if search term is part of fighter name
  found = fighters.find(f => f.name.toLowerCase().includes(term));
  if (found) return found;
  
  // Reverse check - check if fighter name contains all words from search
  const searchWords = term.split(' ').filter(w => w);
  found = fighters.find(f => {
    const nameLower = f.name.toLowerCase();
    return searchWords.every(word => nameLower.includes(word));
  });
  
  return found || null;
}

// Find similar matchups based on record
function suggestMatchup(fighters: Array<{rank: number, name: string, record: string}>): {fighter1: {rank: number, name: string, record: string}, fighter2: {rank: number, name: string, record: string}} | null {
  if (fighters.length < 2) return null;
  
  // Randomly pick a fighter
  const fighter1Index = Math.floor(Math.random() * fighters.length);
  const fighter1 = fighters[fighter1Index];
  const fighter1Wins = parseRecordWins(fighter1.record);
  
  // Find fighters with similar record (within 1 win)
  const similarFighters = fighters.filter((f, idx) => {
    if (idx === fighter1Index) return false;
    const fWins = parseRecordWins(f.record);
    return Math.abs(fWins - fighter1Wins) <= 1;
  });
  
  if (similarFighters.length === 0) return null;
  
  // Pick a random fighter from similar fighters
  const fighter2 = similarFighters[Math.floor(Math.random() * similarFighters.length)];
  
  return { fighter1, fighter2 };
}

// Find all potential matchups for a specific fighter
function findAllMatchups(
  fighterName: string,
  fighters: Array<{rank: number, name: string, record: string}>
): Array<{rank: number, name: string, record: string}> | null {
  // Find the fighter using fuzzy matching
  const fighter = findFighterByPartialName(fighterName, fighters);
  
  if (!fighter) return null;
  
  const fighterWins = parseRecordWins(fighter.record);
  
  // Find all fighters with similar record (within 1 win), excluding the fighter themselves
  const matchups = fighters.filter(f => {
    if (f.name.toLowerCase() === fighter.name.toLowerCase()) return false;
    const fWins = parseRecordWins(f.record);
    return Math.abs(fWins - fighterWins) <= 1;
  });
  
  return matchups.length > 0 ? matchups : null;
}


// Helper function to get saved fighter display name
async function getSavedFighterName(fighterId: string, fallback: string): Promise<string> {
  try {
    const fighters = await storage.getFighters();
    const fighter = fighters.find(f => f.discordId === fighterId);
    return fighter?.displayName || fallback;
  } catch (error) {
    return fallback;
  }
}

// Helper function to auto-add fighter to Fighters list if not already there
async function ensureFighterInList(fighterId: string, username: string): Promise<void> {
  try {
    const fighters = await storage.getFighters();
    const exists = fighters.find(f => f.discordId === fighterId);
    if (!exists) {
      await storage.addFighter({
        discordId: fighterId,
        displayName: username,
      });
    }
  } catch (error) {
    console.error('[Discord] Error adding fighter to list:', error);
  }
}

// Initialize Discord bot with bot token
export async function initializeDiscordBot(): Promise<boolean> {
  const botToken = process.env.DISCORD_BOT_TOKEN;
  
  if (!botToken) {
    console.log('[Discord] No DISCORD_BOT_TOKEN found. Bot functionality disabled.');
    return false;
  }

  try {
    discordClient = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.GuildMembers,
      ],
    });

    // Handle ready event
    discordClient.once('ready', async () => {
      console.log(`[Discord] Bot connected as ${discordClient?.user?.tag}`);
      isConnected = true;
      
      // Start rankings update scheduler
      startRankingsUpdateScheduler();
      
      // Register slash commands
      await registerSlashCommands(botToken);
    });

    // Handle slash commands
    discordClient.on('interactionCreate', async (interaction) => {
      if (interaction.isChatInputCommand()) {
        const { commandName } = interaction;
        
        if (commandName === 'caffight') {
          await handleCAFFightCommand(interaction);
        } else if (commandName === 'offlinefight') {
          await handleOfflineFightCommand(interaction);
        } else if (commandName === 'ontherise') {
          await handleOnTheRiseCommand(interaction);
        } else if (commandName === 'thursdaythrowdown') {
          await handleThursdayThrowdownCommand(interaction);
        } else if (commandName === 'notifyreply') {
          await handleNotifyReplyCommand(interaction);
        } else if (commandName === 'finishfight') {
          await handleFinishFightCommand(interaction);
        } else if (commandName === 'spin') {
          await handleSpinCommand(interaction);
        } else if (commandName === 'spinall') {
          await handleSpinAllCommand(interaction);
        }
      } else if (interaction.isButton()) {
        if (interaction.customId.startsWith('notify_')) {
          await handleNotifyButton(interaction);
        } else if (interaction.customId.startsWith('spin')) {
          await handleSpinButton(interaction);
        }
      }
    });

    // Handle new messages in fight channels
    discordClient.on('messageCreate', async (message: Message) => {
      // Handle prefix commands
      if (message.content.startsWith('!')) {
        await handlePrefixCommand(message);
        return;
      }
      
      // Handle fight chat messages
      await handleFightChatMessage(message);
    });

    // Handle new channel creation (detect new fight chats)
    discordClient.on('channelCreate', async (channel) => {
      if (channel.type === ChannelType.GuildText) {
        const textChannel = channel as TextChannel;
        if (textChannel.name.startsWith(FIGHT_CHAT_PREFIX)) {
          console.log(`[Discord] New fight chat detected: ${textChannel.name}`);
          await storage.logActivity({
            type: 'fight_created',
            message: `New fight chat created: #${textChannel.name}`,
          });
        }
      }
    });

    await discordClient.login(botToken);
    return true;
  } catch (error) {
    console.error('[Discord] Failed to initialize bot:', error);
    return false;
  }
}

// Register slash commands
async function registerSlashCommands(botToken: string): Promise<void> {
  try {
    const rest = new REST().setToken(botToken);
    
    const commands = [
      {
        name: 'caffight',
        description: 'Create a new CAF fight between two fighters (mods only)',
        options: [
          {
            name: 'fighter1',
            description: 'First fighter (mention)',
            type: 9, // USER type
            required: true,
          },
          {
            name: 'fighter2',
            description: 'Second fighter (mention)',
            type: 9, // USER type
            required: true,
          },
        ],
      },
      {
        name: 'offlinefight',
        description: 'Create a new offline fight between two fighters (mods only)',
        options: [
          {
            name: 'fighter1',
            description: 'First fighter (mention)',
            type: 9, // USER type
            required: true,
          },
          {
            name: 'fighter2',
            description: 'Second fighter (mention)',
            type: 9, // USER type
            required: true,
          },
        ],
      },
      {
        name: 'ontherise',
        description: 'Create a new On The Rise (Wednesday) fight (mods only)',
        options: [
          {
            name: 'fighter1',
            description: 'First fighter (mention)',
            type: 9, // USER type
            required: true,
          },
          {
            name: 'fighter2',
            description: 'Second fighter (mention)',
            type: 9, // USER type
            required: true,
          },
          {
            name: 'rounds',
            description: 'Number of rounds or championship type',
            type: 3, // STRING type for both numbers and championship types
            required: true,
            choices: [
              { name: '8 Rounds', value: '8' },
              { name: '10 Rounds', value: '10' },
              { name: 'RBC Championship', value: 'RBC' },
              { name: 'ABC Championship', value: 'ABC' },
              { name: 'World Championship', value: 'World' },
            ],
          },
        ],
      },
      {
        name: 'thursdaythrowdown',
        description: 'Create a new Thursday Throwdown (Thursday) fight (mods only)',
        options: [
          {
            name: 'fighter1',
            description: 'First fighter (mention)',
            type: 9, // USER type
            required: true,
          },
          {
            name: 'fighter2',
            description: 'Second fighter (mention)',
            type: 9, // USER type
            required: true,
          },
          {
            name: 'rounds',
            description: 'Number of rounds or championship type',
            type: 3, // STRING type for both numbers and championship types
            required: true,
            choices: [
              { name: '8 Rounds', value: '8' },
              { name: '10 Rounds', value: '10' },
              { name: 'RBC Championship', value: 'RBC' },
              { name: 'ABC Championship', value: 'ABC' },
              { name: 'World Championship', value: 'World' },
            ],
          },
        ],
      },
      {
        name: 'notifyreply',
        description: 'Notify your opponent that you responded',
        options: [],
      },
      {
        name: 'finishfight',
        description: 'Mark this fight as finished (fighters or mods only)',
        options: [],
      },
      {
        name: 'spin',
        description: 'Spin a weightclass between two options',
        options: [
          {
            name: 'weight1',
            description: 'First weightclass option',
            type: 3, // STRING type
            choices: [
              { name: 'Heavyweight (M)', value: 'Heavyweight (M)' },
              { name: 'Cruiserweight (M)', value: 'Cruiserweight (M)' },
              { name: 'Light Heavyweight (M)', value: 'Light Heavyweight (M)' },
              { name: 'Middleweight (M)', value: 'Middleweight (M)' },
              { name: 'Welterweight (M)', value: 'Welterweight (M)' },
              { name: 'Lightweight (M)', value: 'Lightweight (M)' },
              { name: 'Featherweight (M)', value: 'Featherweight (M)' },
              { name: 'Bantamweight (M)', value: 'Bantamweight (M)' },
              { name: 'Welterweight (W)', value: 'Welterweight (W)' },
              { name: 'Lightweight (W)', value: 'Lightweight (W)' },
            ],
            required: true,
          },
          {
            name: 'weight2',
            description: 'Second weightclass option',
            type: 3, // STRING type
            choices: [
              { name: 'Heavyweight (M)', value: 'Heavyweight (M)' },
              { name: 'Cruiserweight (M)', value: 'Cruiserweight (M)' },
              { name: 'Light Heavyweight (M)', value: 'Light Heavyweight (M)' },
              { name: 'Middleweight (M)', value: 'Middleweight (M)' },
              { name: 'Welterweight (M)', value: 'Welterweight (M)' },
              { name: 'Lightweight (M)', value: 'Lightweight (M)' },
              { name: 'Featherweight (M)', value: 'Featherweight (M)' },
              { name: 'Bantamweight (M)', value: 'Bantamweight (M)' },
              { name: 'Welterweight (W)', value: 'Welterweight (W)' },
              { name: 'Lightweight (W)', value: 'Lightweight (W)' },
            ],
            required: true,
          },
        ],
      },
      {
        name: 'spinall',
        description: 'Spin to randomly select from all weightclasses',
        options: [],
      },
    ];

    // Register commands globally
    await rest.put(Routes.applicationCommands(discordClient!.user!.id), { body: commands });
    console.log('[Discord] Slash commands registered');
  } catch (error) {
    console.error('[Discord] Error registering slash commands:', error);
  }
}

// Handle /caffight command
async function handleCAFFightCommand(interaction: any): Promise<void> {
  try {
    // Check if user is a mod (has Manage Channels permission)
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageChannels)) {
      await interaction.reply({
        content: '❌ Only moderators can create fights.',
        ephemeral: true,
      });
      return;
    }

    const fighter1 = interaction.options.getUser('fighter1');
    const fighter2 = interaction.options.getUser('fighter2');

    if (!fighter1 || !fighter2) {
      await interaction.reply({ content: 'Invalid fighters provided.', ephemeral: true });
      return;
    }

    if (fighter1.id === fighter2.id) {
      await interaction.reply({ content: 'A fighter cannot fight themselves!', ephemeral: true });
      return;
    }

    await interaction.deferReply({ ephemeral: true });

    const guild = interaction.guild;
    
    // Auto-add fighters to the Fighters list if they don't exist
    await ensureFighterInList(fighter1.id, fighter1.username);
    await ensureFighterInList(fighter2.id, fighter2.username);
    
    // Get saved fighter display names (or fall back to Discord username)
    const fighter1Name = await getSavedFighterName(fighter1.id, fighter1.username);
    const fighter2Name = await getSavedFighterName(fighter2.id, fighter2.username);
    
    const channelName = `caf-${fighter1Name}-vs-${fighter2Name}`.toLowerCase().slice(0, 100);

    // Build permission overwrites
    const cafPermissions: any[] = [
      {
        id: guild.id, // @everyone
        deny: [PermissionFlagsBits.ViewChannel],
      },
      {
        id: discordClient!.user!.id, // Bot
        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory],
      },
      {
        id: fighter1.id,
        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory],
      },
      {
        id: fighter2.id,
        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory],
      },
    ];

    // Add mod role if it exists
    const modRole = interaction.member.roles.cache.find((role: any) => role.permissions.has(PermissionFlagsBits.ManageChannels));
    if (modRole) {
      cafPermissions.push({
        id: modRole.id,
        allow: [PermissionFlagsBits.ViewChannel],
      });
    }

    // Create private channel under CAF category
    const channel = await guild.channels.create({
      name: channelName,
      type: ChannelType.GuildText,
      parent: CATEGORY_IDS.CAF,
      permissionOverwrites: cafPermissions,
    });

    // Save fight to storage
    const fight = await storage.createFight({
      fighter1Id: fighter1.id,
      fighter1Username: fighter1Name,
      fighter2Id: fighter2.id,
      fighter2Username: fighter2Name,
      channelId: channel.id,
      channelName: channel.name,
      channelLink: `https://discord.com/channels/${guild.id}/${channel.id}`,
      guildId: guild.id,
      fightType: 'CAF',
      status: 'active',
    });

    // Send welcome message to fight channel
    const now = new Date();
    const deadline = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days from now
    const deadlineStr = deadline.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    
    const welcomeMessage = `**UFL CAF FIGHT**

**DEADLINE: ${deadlineStr}**

Turn in the SCORECARD and OVERALL STATS to <#1443111926023458916> with this format: Winner name def opponent name by (METHOD: KO/Decision/etc)

**10 ROUND CAF BOUT**

🔴 <@${fighter1.id}>

🔵 <@${fighter2.id}>

**FOLLOW THESE STEPS IN ORDER**
• Read the <#1443046834573676659>
• Agree to a weight class. If you can't agree, use \`!spin weight1 weight2\` or \`!spinall\` to randomly select
• ONLY ALLOWED ONE TRAIT
• TRAIT BANS: LIGHTNING HANDS, STING LIKE A BEE, TIRELESS
• 1.5 damage/1.0 stamina/1.5 relative time

**COMMANDS**
• Use \`!notifyreply\` to notify your opponent when you respond`;

    await channel.send(welcomeMessage);

    // DM both fighters
    await sendFightMatchDM(fighter1.id, fighter2Name, channel.name, `https://discord.com/channels/${guild.id}/${channel.id}`, fight.id);
    await sendFightMatchDM(fighter2.id, fighter1Name, channel.name, `https://discord.com/channels/${guild.id}/${channel.id}`, fight.id);

    await interaction.editReply({
      content: `✅ Fight created! Channel: ${channel} \n\nDMs sent to ${fighter1Name} and ${fighter2Name}`,
    });

    await storage.logActivity({
      type: 'fight_created',
      message: `Fight created: ${fighter1Name} vs ${fighter2Name}`,
    });
  } catch (error) {
    console.error('[Discord] Error in /caffight command:', error);
    try {
      await interaction.editReply({
        content: '❌ Error creating fight. Please check that the bot has channel creation permissions.',
      });
    } catch {}
  }
}

// Handle /offlinefight command
async function handleOfflineFightCommand(interaction: any): Promise<void> {
  try {
    // Check if user is a mod (has Manage Channels permission)
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageChannels)) {
      await interaction.reply({
        content: '❌ Only moderators can create fights.',
        ephemeral: true,
      });
      return;
    }

    const fighter1 = interaction.options.getUser('fighter1');
    const fighter2 = interaction.options.getUser('fighter2');

    if (!fighter1 || !fighter2) {
      await interaction.reply({ content: 'Invalid fighters provided.', ephemeral: true });
      return;
    }

    if (fighter1.id === fighter2.id) {
      await interaction.reply({ content: 'A fighter cannot fight themselves!', ephemeral: true });
      return;
    }

    await interaction.deferReply({ ephemeral: true });

    const guild = interaction.guild;
    
    // Auto-add fighters to the Fighters list if they don't exist
    await ensureFighterInList(fighter1.id, fighter1.username);
    await ensureFighterInList(fighter2.id, fighter2.username);
    
    // Get saved fighter display names (or fall back to Discord username)
    const fighter1Name = await getSavedFighterName(fighter1.id, fighter1.username);
    const fighter2Name = await getSavedFighterName(fighter2.id, fighter2.username);
    
    const channelName = `off-${fighter1Name}-vs-${fighter2Name}`.toLowerCase().slice(0, 100);

    // Build permission overwrites
    const offlinePermissions: any[] = [
      {
        id: guild.id, // @everyone
        deny: [PermissionFlagsBits.ViewChannel],
      },
      {
        id: discordClient!.user!.id, // Bot
        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory],
      },
      {
        id: fighter1.id,
        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory],
      },
      {
        id: fighter2.id,
        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory],
      },
    ];

    // Add mod role if it exists
    const modRole = interaction.member.roles.cache.find((role: any) => role.permissions.has(PermissionFlagsBits.ManageChannels));
    if (modRole) {
      offlinePermissions.push({
        id: modRole.id,
        allow: [PermissionFlagsBits.ViewChannel],
      });
    }

    // Create private channel under Offline category
    const channel = await guild.channels.create({
      name: channelName,
      type: ChannelType.GuildText,
      parent: CATEGORY_IDS.Offline,
      permissionOverwrites: offlinePermissions,
    });

    // Save fight to storage
    const fight = await storage.createFight({
      fighter1Id: fighter1.id,
      fighter1Username: fighter1Name,
      fighter2Id: fighter2.id,
      fighter2Username: fighter2Name,
      channelId: channel.id,
      channelName: channel.name,
      channelLink: `https://discord.com/channels/${guild.id}/${channel.id}`,
      guildId: guild.id,
      fightType: 'Offline',
      status: 'active',
    });

    // Calculate next Sunday date
    const today = new Date();
    const nextSunday = new Date(today);
    nextSunday.setDate(today.getDate() + (7 - today.getDay()));
    const sundayStr = nextSunday.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

    // Send welcome message to fight channel
    const welcomeMessage = `**UFL OFFLINE FIGHT**

MAKE SURE YOU READ THE <#1335708721480728790>  BEFORE YOUR FIGHT!

**THE DEADLINE TO COMPLETE THIS FIGHT IS MIDNIGHT ON SUNDAY (${sundayStr})**

**Turn in the SCORECARD and OVERALL STATS to <#1263612116498251889> with this format: Winner name def opponent name by (METHOD: KO/Decision/etc)**

**10 ROUND BOUT**

🔴 <@${fighter1.id}>
🔵 <@${fighter2.id}>

**FOLLOW THESE STEPS IN ORDER**
-Read the <#1335708721480728790>
-Agree to a weight class. If you can't agree, we will randomly select one for you
-Red corner bans a fighter
-Blue corner bans a fighter
-Red corner picks fighter
-Blue corner picks fighter
-NO MIRROR MATCHES
-1.0 stamina/1.5 relative time`;

    await channel.send(welcomeMessage);

    // DM both fighters
    await sendFightMatchDM(fighter1.id, fighter2Name, channel.name, `https://discord.com/channels/${guild.id}/${channel.id}`, fight.id);
    await sendFightMatchDM(fighter2.id, fighter1Name, channel.name, `https://discord.com/channels/${guild.id}/${channel.id}`, fight.id);

    await interaction.editReply({
      content: `✅ Offline fight created! Channel: ${channel} \n\nDMs sent to ${fighter1Name} and ${fighter2Name}`,
    });

    await storage.logActivity({
      type: 'fight_created',
      message: `Offline fight created: ${fighter1Name} vs ${fighter2Name}`,
    });
  } catch (error) {
    console.error('[Discord] Error in /offlinefight command:', error);
    try {
      await interaction.editReply({
        content: '❌ Error creating fight. Please check that the bot has channel creation permissions.',
      });
    } catch {}
  }
}

// Helper function to create a live fight in a specific category
async function createLiveFight(interaction: any, categoryId: string, categoryName: string, rounds?: number | string): Promise<void> {
  try {
    // Check if user is a mod (has Manage Channels permission)
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageChannels)) {
      await interaction.reply({
        content: '❌ Only moderators can create fights.',
        ephemeral: true,
      });
      return;
    }

    const fighter1 = interaction.options.getUser('fighter1');
    const fighter2 = interaction.options.getUser('fighter2');

    if (!fighter1 || !fighter2) {
      await interaction.reply({ content: 'Invalid fighters provided.', ephemeral: true });
      return;
    }

    if (fighter1.id === fighter2.id) {
      await interaction.reply({ content: 'A fighter cannot fight themselves!', ephemeral: true });
      return;
    }

    await interaction.deferReply({ ephemeral: true });

    const guild = interaction.guild;
    
    // Auto-add fighters to the Fighters list if they don't exist
    await ensureFighterInList(fighter1.id, fighter1.username);
    await ensureFighterInList(fighter2.id, fighter2.username);
    
    // Get saved fighter display names (or fall back to Discord username)
    const fighter1Name = await getSavedFighterName(fighter1.id, fighter1.username);
    const fighter2Name = await getSavedFighterName(fighter2.id, fighter2.username);

    const channelName = `live-${fighter1Name}-vs-${fighter2Name}`.toLowerCase().slice(0, 100);

    // Build permission overwrites
    const livePermissions: any[] = [
      {
        id: guild.id, // @everyone
        deny: [PermissionFlagsBits.ViewChannel],
      },
      {
        id: discordClient!.user!.id, // Bot
        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory],
      },
      {
        id: fighter1.id,
        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory],
      },
      {
        id: fighter2.id,
        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory],
      },
    ];

    // Add mod role if it exists
    const modRole = interaction.member.roles.cache.find((role: any) => role.permissions.has(PermissionFlagsBits.ManageChannels));
    if (modRole) {
      livePermissions.push({
        id: modRole.id,
        allow: [PermissionFlagsBits.ViewChannel],
      });
    }

    // Create private channel under Live category
    const channel = await guild.channels.create({
      name: channelName,
      type: ChannelType.GuildText,
      parent: categoryId,
      permissionOverwrites: livePermissions,
    });

    // Save fight to storage
    const fight = await storage.createFight({
      fighter1Id: fighter1.id,
      fighter1Username: fighter1Name,
      fighter2Id: fighter2.id,
      fighter2Username: fighter2Name,
      channelId: channel.id,
      channelName: channel.name,
      channelLink: `https://discord.com/channels/${guild.id}/${channel.id}`,
      guildId: guild.id,
      fightType: categoryName as "CAF" | "Offline" | "On The Rise" | "Thursday Throwdown",
      rounds: rounds,
      status: 'active',
    });

    // Send welcome message to fight channel
    let welcomeMessage: string;
    let displayName = categoryName === 'Thursday Throwdown' ? 'THURSDAY SHOWDOWN' : categoryName.toUpperCase();
    let isChampionship = typeof rounds === 'string' && ['RBC', 'ABC', 'World'].includes(rounds);
    
    if (categoryName === 'On The Rise' || categoryName === 'Thursday Throwdown') {
      if (isChampionship) {
        // Championship fight templates
        const champType = rounds as string;
        let shortDisplayName = categoryName === 'Thursday Throwdown' ? 'Thursday Showdown' : 'On The Rise';
        
        if (champType === 'RBC') {
          welcomeMessage = `UFL: ${shortDisplayName}

MAKE SURE YOU READ THE ⁠https://discord.com/channels/1258129766762942525/1335708721480728790 BEFORE YOUR FIGHT!

Turn in the SCORECARD and OVERALL STATS to ⁠https://discord.com/channels/1258129766762942525/1263612116498251889 with this format: Winner name def opponent name by (METHOD: KO/Decision/etc)

RBC CHAMPIONSHIP
12 ROUND BOUT

:red_circle: <@${fighter1.id}> <:rbcpctitle:1403388593946366054>
 
:blue_circle: <@${fighter2.id}>

FOLLOW THESE STEPS IN ORDER
-Read the ⁠https://discord.com/channels/1258129766762942525/1335708721480728790
-Champion chooses weight class
-Champion corner bans a fighter
-Blue corner bans a fighter
-Champion corner picks fighter
-Blue corner picks fighter
-NO MIRROR MATCHES
-1.0 stamina/1.5 relative time`;
        } else {
          // Placeholder for ABC and World templates
          welcomeMessage = `UFL: ${shortDisplayName}

MAKE SURE YOU READ THE ⁠https://discord.com/channels/1258129766762942525/1335708721480728790 BEFORE YOUR FIGHT!

Turn in the SCORECARD and OVERALL STATS to ⁠https://discord.com/channels/1258129766762942525/1263612116498251889 with this format: Winner name def opponent name by (METHOD: KO/Decision/etc)

${champType} CHAMPIONSHIP
12 ROUND BOUT

:red_circle: <@${fighter1.id}>
 
:blue_circle: <@${fighter2.id}>

FOLLOW THESE STEPS IN ORDER
-Read the ⁠https://discord.com/channels/1258129766762942525/1335708721480728790
-Champion chooses weight class
-Champion corner bans a fighter
-Blue corner bans a fighter
-Champion corner picks fighter
-Blue corner picks fighter
-NO MIRROR MATCHES
-1.0 stamina/1.5 relative time`;
        }
      } else {
        // Regular live fight template
        welcomeMessage = `**UFL: ${displayName}**

MAKE SURE YOU READ THE ⁠https://discord.com/channels/1258129766762942525/1335708721480728790  BEFORE YOUR FIGHT!

**Turn in the SCORECARD and OVERALL STATS to https://discord.com/channels/1258129766762942525/1263612116498251889 with this format: Winner name def opponent name by (METHOD: KO/Decision/etc)**

**${rounds || 10} ROUND BOUT**

🔴 <@${fighter1.id}>

🔵 <@${fighter2.id}>

**FOLLOW THESE STEPS IN ORDER**
• Read the https://discord.com/channels/1258129766762942525/1335708721480728790
• Agree to a weight class. If you can't agree, we will randomly select one for you
• Red corner bans a fighter
• Blue corner bans a fighter
• Red corner picks fighter
• Blue corner picks fighter
• NO MIRROR MATCHES
• 1.0 stamina/1.5 relative time`;
      }
    } else {
      welcomeMessage = `**UFL ${categoryName.toUpperCase()} FIGHT**

🔴 <@${fighter1.id}>

🔵 <@${fighter2.id}>

**This is a LIVE BOUT!**
• Responses will be streamed in real-time
• Use \`!notifyreply\` to notify your opponent when you respond
• Use \`!finishfight\` when the match is over`;
    }

    await channel.send(welcomeMessage);

    // DM both fighters
    await sendFightMatchDM(fighter1.id, fighter2Name, channel.name, `https://discord.com/channels/${guild.id}/${channel.id}`, fight.id);
    await sendFightMatchDM(fighter2.id, fighter1Name, channel.name, `https://discord.com/channels/${guild.id}/${channel.id}`, fight.id);

    await interaction.editReply({
      content: `✅ ${categoryName} fight created! Channel: ${channel} \n\nDMs sent to ${fighter1Name} and ${fighter2Name}`,
    });

    await storage.logActivity({
      type: 'fight_created',
      message: `${categoryName} fight created: ${fighter1Name} vs ${fighter2Name}`,
    });
  } catch (error) {
    console.error(`[Discord] Error in live fight command:`, error);
    try {
      await interaction.editReply({
        content: '❌ Error creating fight. Please check that the bot has channel creation permissions.',
      });
    } catch {}
  }
}

// Handle /ontherise command
async function handleOnTheRiseCommand(interaction: any): Promise<void> {
  const roundsInput = interaction.options.getString('rounds');
  const rounds = isNaN(Number(roundsInput)) ? roundsInput : Number(roundsInput);
  return createLiveFight(interaction, CATEGORY_IDS.OnTheRise, 'On The Rise', rounds);
}

// Handle /thursdaythrowdown command
async function handleThursdayThrowdownCommand(interaction: any): Promise<void> {
  const roundsInput = interaction.options.getString('rounds');
  const rounds = isNaN(Number(roundsInput)) ? roundsInput : Number(roundsInput);
  return createLiveFight(interaction, CATEGORY_IDS.ThursdayThrowdown, 'Thursday Throwdown', rounds);
}

// Handle /notifyreply command
async function handleNotifyReplyCommand(interaction: any): Promise<void> {
  try {
    const channel = interaction.channel;
    if (channel.type !== ChannelType.GuildText) {
      await interaction.reply({ content: 'This command can only be used in a fight channel.', ephemeral: true });
      return;
    }

    const fight = await storage.getFightByChannelId(channel.id);
    if (!fight) {
      await interaction.reply({ content: 'This is not an active fight channel.', ephemeral: true });
      return;
    }

    // Determine opponent
    const userId = interaction.user.id;
    let opponentId = '';
    let opponentName = '';
    let senderName = '';

    if (userId === fight.fighter1Id) {
      opponentId = fight.fighter2Id;
      opponentName = fight.fighter2Username;
      senderName = fight.fighter1Username;
    } else if (userId === fight.fighter2Id) {
      opponentId = fight.fighter1Id;
      opponentName = fight.fighter1Username;
      senderName = fight.fighter2Username;
    } else {
      await interaction.reply({ content: 'You are not a fighter in this match.', ephemeral: true });
      return;
    }

    // Send DM to opponent
    const embed = new EmbedBuilder()
      .setColor(0xF59E0B)
      .setTitle('🔔 Opponent Responded!')
      .setDescription(`${senderName} has responded in your fight!`)
      .addFields(
        { name: 'Jump to Chat', value: `[Click here to jump to the fight](https://discord.com/channels/${fight.guildId}/${fight.channelId})`, inline: false }
      )
      .setTimestamp();

    const jumpButton = new ActionRowBuilder<ButtonBuilder>()
      .addComponents(
        new ButtonBuilder()
          .setLabel('Jump to Fight')
          .setStyle(ButtonStyle.Link)
          .setURL(`https://discord.com/channels/${fight.guildId}/${fight.channelId}`)
      );

    try {
      const user = await discordClient!.users.fetch(opponentId);
      await user.send({ embeds: [embed], components: [jumpButton as any] });
      
      await storage.logActivity({
        type: 'dm_sent',
        message: `Notification sent to ${opponentName} about ${senderName}'s response`,
      });

      await interaction.reply({
        content: `✅ ${opponentName} has been notified!`,
        ephemeral: true,
      });
    } catch (error) {
      console.error('[Discord] Failed to notify opponent:', error);
      await interaction.reply({
        content: '❌ Could not notify opponent. They may have DMs disabled.',
        ephemeral: true,
      });
    }
  } catch (error) {
    console.error('[Discord] Error in /notifyreply command:', error);
    await interaction.reply({ content: '❌ Error processing command.', ephemeral: true });
  }
}

// Handle /finishfight command
async function handleFinishFightCommand(interaction: any): Promise<void> {
  try {
    const channel = interaction.channel;
    if (channel.type !== ChannelType.GuildText) {
      await interaction.reply({ content: 'This command can only be used in a fight channel.', ephemeral: true });
      return;
    }

    const fight = await storage.getFightByChannelId(channel.id);
    if (!fight) {
      await interaction.reply({ content: 'This is not an active fight channel.', ephemeral: true });
      return;
    }

    // Check if user is a fighter or mod
    const isFighter = interaction.user.id === fight.fighter1Id || interaction.user.id === fight.fighter2Id;
    const isMod = interaction.memberPermissions?.has(PermissionFlagsBits.ManageChannels);

    if (!isFighter && !isMod) {
      await interaction.reply({
        content: '❌ Only fighters or moderators can finish a fight.',
        ephemeral: true,
      });
      return;
    }

    // Update channel name with check emoji
    const newName = `${FIGHT_CHAT_PREFIX}✅-${fight.fighter1Username}-vs-${fight.fighter2Username}`.toLowerCase().slice(0, 100);
    await channel.setName(newName);

    // Update fight status
    await storage.updateFightStatus(fight.id, 'completed');

    await interaction.reply({
      content: '✅ Fight marked as finished!',
      ephemeral: true,
    });

    await storage.logActivity({
      type: 'fight_completed',
      message: `Fight finished: ${fight.fighter1Username} vs ${fight.fighter2Username}`,
    });
  } catch (error) {
    console.error('[Discord] Error in /finishfight command:', error);
    await interaction.reply({ content: '❌ Error finishing fight.', ephemeral: true });
  }
}

// Handle prefix commands (e.g., !notifyreply, !finishfight, !spin)
async function handlePrefixCommand(message: Message) {
  if (message.author.bot) return;
  
  const channel = message.channel;
  if (channel.type !== ChannelType.GuildText) {
    await message.reply('Commands can only be used in guild channels.');
    return;
  }

  const args = message.content.slice(1).trim().split(/ +/);
  const command = args.shift()?.toLowerCase();

  try {
    if (command === 'notifyreply') {
      const textChannel = channel as TextChannel;
      const fight = await storage.getFightByChannelId(textChannel.id);
      if (!fight) {
        await message.reply('This is not an active fight channel.');
        return;
      }

      const userId = message.author.id;
      const isMod = (message.member?.permissions as any)?.has(PermissionFlagsBits.ManageChannels);
      const isFighter = userId === fight.fighter1Id || userId === fight.fighter2Id;

      if (!isFighter && !isMod) {
        await message.reply('You are not a fighter in this match.');
        return;
      }

      const jumpButton = new ActionRowBuilder<ButtonBuilder>()
        .addComponents(
          new ButtonBuilder()
            .setLabel('Jump to Fight')
            .setStyle(ButtonStyle.Link)
            .setURL(`https://discord.com/channels/${fight.guildId}/${fight.channelId}`)
        );

      // If mod, notify both fighters. If fighter, notify opponent.
      const recipientsToNotify: string[] = [];
      if (isMod) {
        recipientsToNotify.push(fight.fighter1Id, fight.fighter2Id);
      } else {
        recipientsToNotify.push(userId === fight.fighter1Id ? fight.fighter2Id : fight.fighter1Id);
      }

      let successCount = 0;
      for (const recipientId of recipientsToNotify) {
        try {
          const embed = new EmbedBuilder()
            .setColor(0xF59E0B)
            .setTitle('🔔 Opponent Responded!')
            .setDescription(isMod ? 'A moderator has sent a response notification.' : `${message.author.username} has responded in your fight!`)
            .addFields(
              { name: 'Jump to Chat', value: `[Click here to jump to the fight](https://discord.com/channels/${fight.guildId}/${fight.channelId})`, inline: false }
            )
            .setTimestamp();

          const user = await discordClient!.users.fetch(recipientId);
          await user.send({ embeds: [embed], components: [jumpButton as any] });
          successCount++;

          await storage.logActivity({
            type: 'dm_sent',
            message: `Notification sent to user ${recipientId}`,
          });
        } catch (error) {
          console.error(`[Discord] Failed to notify user ${recipientId}:`, error);
        }
      }

      if (successCount > 0) {
        await message.reply(`✅ Notified ${successCount} fighter(s)!`);
      } else {
        await message.reply('❌ Could not notify fighters. They may have DMs disabled.');
      }
    } else if (command === 'finishfight') {
      const textChannel = channel as TextChannel;
      const fight = await storage.getFightByChannelId(textChannel.id);
      if (!fight) {
        await message.reply('This is not an active fight channel.');
        return;
      }

      const isFighter = message.author.id === fight.fighter1Id || message.author.id === fight.fighter2Id;
      const isMod = (message.member?.permissions as any)?.has(PermissionFlagsBits.ManageChannels);

      if (!isFighter && !isMod) {
        await message.reply('❌ Only fighters or moderators can finish a fight.');
        return;
      }

      const newName = `${FIGHT_CHAT_PREFIX}✅-${fight.fighter1Username}-vs-${fight.fighter2Username}`.toLowerCase().slice(0, 100);
      await textChannel.setName(newName);
      
      // Lock the channel - deny send messages for both fighters
      try {
        await textChannel.permissionOverwrites.edit(fight.fighter1Id, { SendMessages: false });
        await textChannel.permissionOverwrites.edit(fight.fighter2Id, { SendMessages: false });
      } catch (lockError) {
        console.error('[Discord] Error locking channel:', lockError);
      }

      await storage.updateFightStatus(fight.id, 'completed');

      await message.reply('✅ Fight marked as finished! Channel is now locked.');

      await storage.logActivity({
        type: 'fight_completed',
        message: `Fight finished: ${fight.fighter1Username} vs ${fight.fighter2Username}`,
      });
    } else if (command === 'rankings') {
      const isMod = (message.member?.permissions as any)?.has(PermissionFlagsBits.ManageChannels);
      if (!isMod) {
        await message.reply('❌ Only moderators can use this command.');
        return;
      }

      const rankingType = args[0]?.toLowerCase();
      if (!rankingType || !['world', 'rbc', 'abc'].includes(rankingType)) {
        await message.reply('Usage: `!rankings <world|rbc|abc>`');
        return;
      }

      // Fetch fresh rankings from the website
      await fetchFreshRankings();
      
      const rankings = await fetchRankings(rankingType as 'world' | 'rbc' | 'abc');
      if (!rankings || rankings.fighters.length === 0) {
        await message.reply('Could not fetch rankings. Please try again later.');
        return;
      }

      let description = '';
      
      // Add champion at the top if exists
      if (rankings.champion) {
        const championRecord = rankings.championRecord || '0-0-0';
        description = `👑 ${rankings.champion} ${championRecord}\n\n`;
      }
      
      // Add only top 15 fighters for display
      const top15 = rankings.fighters.slice(0, 15);
      description += top15.map(r => {
        return `**#${r.rank}** ${r.name} ${r.record}`;
      }).join('\n');

      const embed = new EmbedBuilder()
        .setColor(0xDC2626)
        .setTitle(`UFL ${rankingType.toUpperCase()} Rankings - Top 15`)
        .setDescription(description)
        .setFooter({ text: 'Data from ufl-season-3.vercel.app' });

      await message.reply({ embeds: [embed] });
    } else if (command === 'rankingsnear') {
      const isMod = (message.member?.permissions as any)?.has(PermissionFlagsBits.ManageChannels);
      if (!isMod) {
        await message.reply('❌ Only moderators can use this command.');
        return;
      }

      // Parse: !rankingsnear [fighter name...] [ranking_type]
      if (args.length < 2) {
        await message.reply('Usage: `!rankingsnear [name] <world|rbc|abc>`\nExample: `!rankingsnear Dominik world`');
        return;
      }

      const rankingType = args[args.length - 1]?.toLowerCase();
      const fighterName = args.slice(0, -1).join(' ');

      if (!rankingType || !['world', 'rbc', 'abc'].includes(rankingType)) {
        await message.reply('Usage: `!rankingsnear [name] <world|rbc|abc>`\nExample: `!rankingsnear Dominik world`');
        return;
      }

      // Fetch fresh rankings from the website
      await fetchFreshRankings();
      
      const rankings = await fetchRankings(rankingType as 'world' | 'rbc' | 'abc');
      if (!rankings || rankings.fighters.length === 0) {
        await message.reply('Could not fetch rankings. Please try again later.');
        return;
      }

      // Find the fighter in rankings
      const fighterIndex = rankings.fighters.findIndex(f => f.name.toLowerCase() === fighterName.toLowerCase());
      if (fighterIndex === -1) {
        await message.reply(`❌ Fighter "${fighterName}" not found in ${rankingType.toUpperCase()} rankings.`);
        return;
      }

      // Get 4 above and 4 below
      const startIndex = Math.max(0, fighterIndex - 4);
      const endIndex = Math.min(rankings.fighters.length, fighterIndex + 5);
      const nearbyFighters = rankings.fighters.slice(startIndex, endIndex);

      // Build description
      let description = '';
      nearbyFighters.forEach((fighter) => {
        const isTarget = fighter.name.toLowerCase() === fighterName.toLowerCase();
        const marker = isTarget ? '**→** ' : '';
        description += `${marker}**#${fighter.rank}** ${fighter.name} ${fighter.record}\n`;
      });

      const embed = new EmbedBuilder()
        .setColor(0xDC2626)
        .setTitle(`UFL ${rankingType.toUpperCase()} Rankings - Near ${fighterName}`)
        .setDescription(description)
        .setFooter({ text: 'Data from ufl-season-3.vercel.app' });

      await message.reply({ embeds: [embed] });
    } else if (command === 'spin') {
      const weight1 = args[0];
      const weight2 = args[1];

      if (!weight1 || !weight2) {
        await message.reply('Usage: !spin <weight1> <weight2>\nExample: !spin "Heavyweight (M)" "Middleweight (M)"');
        return;
      }

      const row = new ActionRowBuilder<ButtonBuilder>()
        .addComponents(
          new ButtonBuilder()
            .setCustomId(`spin|${weight1}|${weight2}`)
            .setLabel('🎰 Spin!')
            .setStyle(ButtonStyle.Primary)
        );

      const embed = new EmbedBuilder()
        .setColor(0xDC2626)
        .setTitle('Weightclass Spinner')
        .setDescription(`Choose between **${weight1}** or **${weight2}**`)
        .setFooter({ text: 'Click the button to spin!' });

      await message.reply({ embeds: [embed], components: [row as any] });
    } else if (command === 'spinall') {
      const row = new ActionRowBuilder<ButtonBuilder>()
        .addComponents(
          new ButtonBuilder()
            .setCustomId('spinall_wheel')
            .setLabel('🎡 Spin All Weights!')
            .setStyle(ButtonStyle.Primary)
        );

      const embed = new EmbedBuilder()
        .setColor(0xDC2626)
        .setTitle('Weightclass Spinner - All Weights')
        .setDescription('Spin to randomly select from ALL weightclasses!')
        .setFooter({ text: 'Click the button to spin!' });

      await message.reply({ embeds: [embed], components: [row as any] });
    } else if (command === 'matchup') {
      const isMod = (message.member?.permissions as any)?.has(PermissionFlagsBits.ManageChannels);
      if (!isMod) {
        await message.reply('❌ Only moderators can use this command.');
        return;
      }

      // Fetch fresh rankings from the website
      await fetchFreshRankings();
      
      const rankings = await fetchRankings('world');
      if (!rankings || rankings.fighters.length === 0) {
        await message.reply('Could not fetch world rankings.');
        return;
      }

      const fighterName = args.join(' ');

      if (fighterName) {
        // Show all matchups for a specific fighter
        const matchups = findAllMatchups(fighterName, rankings.fighters);
        if (!matchups) {
          await message.reply(`❌ Fighter "${fighterName}" not found or has no suitable matchups in World rankings.`);
          return;
        }

        const fighter = findFighterByPartialName(fighterName, rankings.fighters);
        if (!fighter) return;

        // Limit to first 10 matchups to fit in embed (1024 char limit)
        const displayMatchups = matchups.slice(0, 10);
        const matchupList = displayMatchups.map(m => `#${m.rank} ${m.name} ${m.record}`).join('\n');

        const embed = new EmbedBuilder()
          .setColor(0xDC2626)
          .setTitle(`🥊 Potential Matchups for ${fighter.name}`)
          .setDescription(`**${fighter.name}** (${fighter.record})`)
          .addFields(
            { name: `Possible Opponents - Similar Record ${matchups.length > 10 ? `(showing 10/${matchups.length})` : ''}`, value: matchupList || 'No suitable matchups found' }
          )
          .setFooter({ text: `${matchups.length} total potential opponent(s)` });

        await message.reply({ embeds: [embed] });
      } else {
        // Random matchup suggestion
        const matchup = suggestMatchup(rankings.fighters);
        if (!matchup) {
          await message.reply('Could not suggest a matchup. Not enough fighters with similar records.');
          return;
        }

        const embed = new EmbedBuilder()
          .setColor(0xDC2626)
          .setTitle('🥊 Suggested World Matchup')
          .addFields(
            { name: `#${matchup.fighter1.rank} ${matchup.fighter1.name}`, value: matchup.fighter1.record, inline: true },
            { name: 'VS', value: '\u200B', inline: true },
            { name: `#${matchup.fighter2.rank} ${matchup.fighter2.name}`, value: matchup.fighter2.record, inline: true }
          )
          .setFooter({ text: 'Based on similar records' });

        await message.reply({ embeds: [embed] });
      }
    } else if (command === 'matchupeu') {
      const isMod = (message.member?.permissions as any)?.has(PermissionFlagsBits.ManageChannels);
      if (!isMod) {
        await message.reply('❌ Only moderators can use this command.');
        return;
      }

      // Fetch fresh rankings from the website
      await fetchFreshRankings();
      
      const rankings = await fetchRankings('rbc');
      if (!rankings || rankings.fighters.length === 0) {
        await message.reply('Could not fetch RBC (EU) rankings.');
        return;
      }

      const fighterName = args.join(' ');

      if (fighterName) {
        // Show all matchups for a specific fighter
        const matchups = findAllMatchups(fighterName, rankings.fighters);
        if (!matchups) {
          await message.reply(`❌ Fighter "${fighterName}" not found or has no suitable matchups in RBC (EU) rankings.`);
          return;
        }

        const fighter = findFighterByPartialName(fighterName, rankings.fighters);
        if (!fighter) return;

        // Limit to first 10 matchups to fit in embed (1024 char limit)
        const displayMatchups = matchups.slice(0, 10);
        const matchupList = displayMatchups.map(m => `#${m.rank} ${m.name} ${m.record}`).join('\n');

        const embed = new EmbedBuilder()
          .setColor(0xDC2626)
          .setTitle(`🥊 Potential Matchups for ${fighter.name} (RBC/EU)`)
          .setDescription(`**${fighter.name}** (${fighter.record})`)
          .addFields(
            { name: `Possible Opponents - Similar Record ${matchups.length > 10 ? `(showing 10/${matchups.length})` : ''}`, value: matchupList || 'No suitable matchups found' }
          )
          .setFooter({ text: `${matchups.length} total potential opponent(s)` });

        await message.reply({ embeds: [embed] });
      } else {
        // Random matchup suggestion
        const matchup = suggestMatchup(rankings.fighters);
        if (!matchup) {
          await message.reply('Could not suggest a matchup. Not enough fighters with similar records.');
          return;
        }

        const embed = new EmbedBuilder()
          .setColor(0xDC2626)
          .setTitle('🥊 Suggested RBC (EU) Matchup')
          .addFields(
            { name: `#${matchup.fighter1.rank} ${matchup.fighter1.name}`, value: matchup.fighter1.record, inline: true },
            { name: 'VS', value: '\u200B', inline: true },
            { name: `#${matchup.fighter2.rank} ${matchup.fighter2.name}`, value: matchup.fighter2.record, inline: true }
          )
          .setFooter({ text: 'Based on similar records' });

        await message.reply({ embeds: [embed] });
      }
    } else if (command === 'matchupna') {
      const isMod = (message.member?.permissions as any)?.has(PermissionFlagsBits.ManageChannels);
      if (!isMod) {
        await message.reply('❌ Only moderators can use this command.');
        return;
      }

      // Fetch fresh rankings from the website
      await fetchFreshRankings();
      
      const rankings = await fetchRankings('abc');
      if (!rankings || rankings.fighters.length === 0) {
        await message.reply('Could not fetch ABC (NA) rankings.');
        return;
      }

      const fighterName = args.join(' ');

      if (fighterName) {
        // Show all matchups for a specific fighter
        const matchups = findAllMatchups(fighterName, rankings.fighters);
        if (!matchups) {
          await message.reply(`❌ Fighter "${fighterName}" not found or has no suitable matchups in ABC (NA) rankings.`);
          return;
        }

        const fighter = findFighterByPartialName(fighterName, rankings.fighters);
        if (!fighter) return;

        // Limit to first 10 matchups to fit in embed (1024 char limit)
        const displayMatchups = matchups.slice(0, 10);
        const matchupList = displayMatchups.map(m => `#${m.rank} ${m.name} ${m.record}`).join('\n');

        const embed = new EmbedBuilder()
          .setColor(0xDC2626)
          .setTitle(`🥊 Potential Matchups for ${fighter.name} (ABC/NA)`)
          .setDescription(`**${fighter.name}** (${fighter.record})`)
          .addFields(
            { name: `Possible Opponents - Similar Record ${matchups.length > 10 ? `(showing 10/${matchups.length})` : ''}`, value: matchupList || 'No suitable matchups found' }
          )
          .setFooter({ text: `${matchups.length} total potential opponent(s)` });

        await message.reply({ embeds: [embed] });
      } else {
        // Random matchup suggestion
        const matchup = suggestMatchup(rankings.fighters);
        if (!matchup) {
          await message.reply('Could not suggest a matchup. Not enough fighters with similar records.');
          return;
        }

        const embed = new EmbedBuilder()
          .setColor(0xDC2626)
          .setTitle('🥊 Suggested ABC (NA) Matchup')
          .addFields(
            { name: `#${matchup.fighter1.rank} ${matchup.fighter1.name}`, value: matchup.fighter1.record, inline: true },
            { name: 'VS', value: '\u200B', inline: true },
            { name: `#${matchup.fighter2.rank} ${matchup.fighter2.name}`, value: matchup.fighter2.record, inline: true }
          )
          .setFooter({ text: 'Based on similar records' });

        await message.reply({ embeds: [embed] });
      }
    } else if (command === 'fightcard') {
      const isMod = (message.member?.permissions as any)?.has(PermissionFlagsBits.ManageChannels);
      if (!isMod) {
        await message.reply('❌ Only moderators can use this command.');
        return;
      }

      const fighterName = args.join(' ');
      
      if (!fighterName) {
        await message.reply('Usage: `!fightcard [fighter name]`\nExample: `!fightcard Sora`');
        return;
      }

      // Fetch fresh rankings and opponent data from the website
      await fetchFreshRankings();
      
      // Fetch rankings from all regions
      const rankings = await fetchRankings('world');
      if (!rankings) {
        await message.reply('Could not fetch fighter rankings.');
        return;
      }

      // Find the fighter using fuzzy matching
      const fighter = findFighterByPartialName(fighterName, rankings.fighters);
      if (!fighter) {
        await message.reply(`Fighter "${fighterName}" not found in rankings.`);
        return;
      }

      // Parse the record from rankings (e.g., "3-1-0" -> 3 wins, 1 loss)
      const recordParts = fighter.record.split('-').map(Number);
      const wins = recordParts[0];
      const losses = recordParts[1];

      // Get last 5 opponents from cached opponent data (from website)
      const opponents = fighterOpponents[fighter.name] || [];
      const last5 = opponents.slice(-5).reverse();
      
      const opponentList = last5.length > 0
        ? last5.map(opp => `${opp.isWin ? '✅' : '❌'} ${opp.name}`).join('\n')
        : 'No fight history recorded';

      const embed = new EmbedBuilder()
        .setColor(0xDC2626)
        .setTitle(`🥊 ${fighter.name} - Fight Card`)
        .setDescription(`**Record: ${wins}-${losses}**`)
        .addFields(
          { name: 'Last 5 Opponents', value: opponentList }
        )
        .setFooter({ text: `✅ = Win | ❌ = Loss | Rank: #${fighter.rank}` });

      await message.reply({ embeds: [embed] });
    }
  } catch (error) {
    console.error('[Discord] Error handling prefix command:', error);
    await message.reply('❌ Error processing command.');
  }
}

// Handle messages in fight chat channels
async function handleFightChatMessage(message: Message) {
  // Ignore bot messages
  if (message.author.bot) return;
  
  // Check if this is a fight chat channel
  const channel = message.channel;
  if (channel.type !== ChannelType.GuildText) return;
  
  const textChannel = channel as TextChannel;
  if (!textChannel.name.startsWith(FIGHT_CHAT_PREFIX)) return;

  // Find the fight associated with this channel
  const fight = await storage.getFightByChannelId(textChannel.id);
  if (!fight) return;

  // Update last activity
  await storage.updateFightActivity(fight.id);

  // Get the other fighter (not the one who sent the message)
  const otherFighterId = message.author.id === fight.fighter1Id 
    ? fight.fighter2Id 
    : fight.fighter1Id;

  // Check if the other fighter has notifications enabled
  const subscription = await storage.getNotificationSubscription(fight.id, otherFighterId);
  
  if (subscription && subscription.enabled) {
    // Send DM notification to the other fighter
    await sendFightResponseNotification(otherFighterId, fight, message.author.username, textChannel);
  }

  // Log the activity
  await storage.logActivity({
    type: 'message_notify',
    message: `New message in #${textChannel.name} from ${message.author.username}`,
  });
}

// Handle notify button interaction
async function handleNotifyButton(interaction: any) {
  const [, fightId, userId] = interaction.customId.split('_');
  
  try {
    // Toggle notification subscription
    const current = await storage.getNotificationSubscription(fightId, userId);
    const newState = !current?.enabled;
    
    await storage.setNotificationSubscription(fightId, userId, newState);
    
    await interaction.reply({
      content: newState 
        ? '✅ Notifications enabled! You will be DMed when your opponent responds.'
        : '❌ Notifications disabled.',
      ephemeral: true,
    });
  } catch (error) {
    console.error('[Discord] Error handling notify button:', error);
    await interaction.reply({
      content: '❌ Error updating notification settings.',
      ephemeral: true,
    });
  }
}

// Create a fight with Discord channel (used by website and slash commands)
export async function createFightWithChannel(
  fighter1Id: string,
  fighter1Username: string,
  fighter2Id: string,
  fighter2Username: string,
  fightType: 'CAF' | 'Offline' | 'On The Rise' | 'Thursday Throwdown',
  guildId: string,
  rounds?: number | string
): Promise<any> {
  if (!discordClient || !isConnected) {
    throw new Error('Discord bot not connected');
  }

  try {
    const guild = discordClient.guilds.cache.get(guildId);
    if (!guild) {
      throw new Error(`Guild ${guildId} not found`);
    }

    // Determine category ID, name and channel prefix
    let categoryId: string;
    let categoryName: string;
    let channelPrefix: string;
    let welcomeMessage: string;

    if (fightType === 'CAF') {
      categoryId = CATEGORY_IDS.CAF;
      categoryName = 'CAF';
      channelPrefix = 'caf';
      const deadline = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      const deadlineStr = deadline.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
      welcomeMessage = `**UFL CAF FIGHT**

**DEADLINE: ${deadlineStr}**

Turn in the SCORECARD and OVERALL STATS to <#1443111926023458916> with this format: Winner name def opponent name by (METHOD: KO/Decision/etc)

**10 ROUND CAF BOUT**

🔴 <@${fighter1Id}>

🔵 <@${fighter2Id}>

**FOLLOW THESE STEPS IN ORDER**
• Read the <#1443046834573676659>
• Agree to a weight class. If you can't agree, use \`!spin weight1 weight2\` or \`!spinall\` to randomly select
• ONLY ALLOWED ONE TRAIT
• TRAIT BANS: LIGHTNING HANDS, STING LIKE A BEE, TIRELESS
• 1.5 damage/1.0 stamina/1.5 relative time

**COMMANDS**
• Use \`!notifyreply\` to notify your opponent when you respond
• Use \`!finishfight\` when the bout is complete`;
    } else if (fightType === 'Offline') {
      categoryId = CATEGORY_IDS.Offline;
      categoryName = 'Offline';
      channelPrefix = 'off';
      const today = new Date();
      const nextSunday = new Date(today);
      nextSunday.setDate(today.getDate() + (7 - today.getDay()));
      const sundayStr = nextSunday.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
      welcomeMessage = `**UFL OFFLINE FIGHT**

MAKE SURE YOU READ THE <#1335708721480728790>  BEFORE YOUR FIGHT!

**THE DEADLINE TO COMPLETE THIS FIGHT IS MIDNIGHT ON SUNDAY (${sundayStr})**

**Turn in the SCORECARD and OVERALL STATS to <#1263612116498251889> with this format: Winner name def opponent name by (METHOD: KO/Decision/etc)**

**10 ROUND BOUT**

🔴 <@${fighter1Id}>
🔵 <@${fighter2Id}>

**FOLLOW THESE STEPS IN ORDER**
-Read the <#1335708721480728790>
-Agree to a weight class. If you can't agree, we will randomly select one for you
-Red corner bans a fighter
-Blue corner bans a fighter
-Red corner picks fighter
-Blue corner picks fighter
-NO MIRROR MATCHES
-1.0 stamina/1.5 relative time`;
    } else if (fightType === 'On The Rise') {
      categoryId = CATEGORY_IDS.OnTheRise;
      categoryName = 'On The Rise';
      channelPrefix = 'otr';
      welcomeMessage = `##**UFL: ON THE RISE**

MAKE SURE YOU READ THE ⁠https://discord.com/channels/1258129766762942525/1335708721480728790  BEFORE YOUR FIGHT!

**Turn in the SCORECARD and OVERALL STATS to https://discord.com/channels/1258129766762942525/1263612116498251889 with this format: Winner name def opponent name by (METHOD: KO/Decision/etc)**

**10 ROUND BOUT**

🔴 <@${fighter1Id}>

🔵 <@${fighter2Id}>

**FOLLOW THESE STEPS IN ORDER**
• Read the https://discord.com/channels/1258129766762942525/1335708721480728790
• Agree to a weight class. If you can't agree, we will randomly select one for you
• Red corner bans a fighter
• Blue corner bans a fighter
• Red corner picks fighter
• Blue corner picks fighter
• NO MIRROR MATCHES
• 1.0 stamina/1.5 relative time`;
    } else {
      categoryId = CATEGORY_IDS.ThursdayThrowdown;
      categoryName = 'Thursday Throwdown';
      channelPrefix = 'tt';
      welcomeMessage = `**UFL THURSDAY THROWDOWN**

🔴 <@${fighter1Id}>

🔵 <@${fighter2Id}>

**This is a LIVE BOUT!**
• Responses will be streamed in real-time
• Use \`!notifyreply\` to notify your opponent when you respond
• Use \`!finishfight\` when the match is over
• Use \`!spin weight1 weight2\` or \`!spinall\` to select a weight class`;
    }

    // Get the category using the hardcoded category ID
    let category = guild.channels.cache.get(categoryId) as any;
    if (!category || category.type !== ChannelType.GuildCategory) {
      throw new Error(`Category ${categoryName} not found with ID ${categoryId}`);
    }

    const channelName = `${channelPrefix}-${fighter1Username}-vs-${fighter2Username}`.toLowerCase().slice(0, 100);

    // Fetch user objects for permission handling
    const fighter1User = await discordClient!.users.fetch(fighter1Id);
    const fighter2User = await discordClient!.users.fetch(fighter2Id);
    
    // For hardcoded category approach, use a fixed categoryId instead of searching
    const finalCategoryId = categoryId;

    // Create private channel
    const channel = await guild.channels.create({
      name: channelName,
      type: ChannelType.GuildText,
      parent: finalCategoryId,
      permissionOverwrites: [
        {
          id: guild.id, // @everyone
          deny: [PermissionFlagsBits.ViewChannel],
        },
        {
          id: discordClient!.user!.id, // Bot
          allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory],
        },
        {
          id: fighter1User.id,
          allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory],
        },
        {
          id: fighter2User.id,
          allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory],
        },
      ],
    });

    // Save fight to storage
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
      rounds,
      status: 'active',
    });

    // Send welcome message
    await channel.send(welcomeMessage);

    // DM both fighters
    await sendFightMatchDM(fighter1Id, fighter2Username, channel.name, `https://discord.com/channels/${guild.id}/${channel.id}`, fight.id);
    await sendFightMatchDM(fighter2Id, fighter1Username, channel.name, `https://discord.com/channels/${guild.id}/${channel.id}`, fight.id);

    await storage.logActivity({
      type: 'fight_created',
      message: `${fightType} fight created: ${fighter1Username} vs ${fighter2Username}`,
    });

    return fight;
  } catch (error) {
    console.error('[Discord] Error creating fight with channel:', error);
    throw error;
  }
}

// Send DM when a new fight is created
export async function sendFightMatchDM(
  userId: string,
  opponentUsername: string,
  channelName: string,
  channelLink: string,
  fightId: string,
  rules?: string
): Promise<boolean> {
  if (!discordClient || !isConnected) {
    console.log('[Discord] Bot not connected, cannot send DM');
    return false;
  }

  try {
    const user = await discordClient.users.fetch(userId);
    
    const embed = new EmbedBuilder()
      .setColor(0xDC2626) // Red color matching the theme
      .setTitle('New Fight Match!')
      .setDescription(`You have been matched against **${opponentUsername}**!`)
      .addFields(
        { name: 'Fight Chat', value: `#${channelName}`, inline: true },
        { name: 'Status', value: 'Awaiting your response', inline: true }
      )
      .setTimestamp();

    if (rules) {
      embed.addFields({ name: 'Rules', value: rules });
    }

    // Create notify button with fight ID and user ID
    const row = new ActionRowBuilder<ButtonBuilder>()
      .addComponents(
        new ButtonBuilder()
          .setLabel('Open Fight Chat')
          .setStyle(ButtonStyle.Link)
          .setURL(channelLink)
      );

    await user.send({ embeds: [embed], components: [row as any] });
    
    await storage.logActivity({
      type: 'dm_sent',
      message: `DM sent to ${user.username} about new fight match`,
    });

    return true;
  } catch (error) {
    console.error(`[Discord] Failed to send DM to user ${userId}:`, error);
    return false;
  }
}

// Send DM notification when opponent responds
async function sendFightResponseNotification(
  userId: string,
  fight: any,
  responderUsername: string,
  channel: TextChannel
): Promise<boolean> {
  if (!discordClient || !isConnected) return false;

  try {
    const user = await discordClient.users.fetch(userId);
    
    const embed = new EmbedBuilder()
      .setColor(0xF59E0B) // Gold color for notifications
      .setTitle('Opponent Responded!')
      .setDescription(`**${responderUsername}** has responded in your fight!`)
      .addFields(
        { name: 'Fight Chat', value: channel.toString(), inline: true }
      )
      .setTimestamp();

    const jumpButton = new ActionRowBuilder<ButtonBuilder>()
      .addComponents(
        new ButtonBuilder()
          .setLabel('Jump to Chat')
          .setStyle(ButtonStyle.Link)
          .setURL(`https://discord.com/channels/${fight.guildId}/${fight.channelId}`)
      );

    await user.send({ embeds: [embed], components: [jumpButton as any] });
    
    await storage.logActivity({
      type: 'message_notify',
      message: `Notified ${user.username} about ${responderUsername}'s response`,
    });

    return true;
  } catch (error) {
    console.error(`[Discord] Failed to send notification to user ${userId}:`, error);
    return false;
  }
}

// Manually send a notification to a fighter
export async function sendManualNotification(
  userId: string,
  message: string
): Promise<boolean> {
  if (!discordClient || !isConnected) return false;

  try {
    const user = await discordClient.users.fetch(userId);
    
    const embed = new EmbedBuilder()
      .setColor(0xDC2626)
      .setTitle('UBL Notification')
      .setDescription(message)
      .setTimestamp();

    await user.send({ embeds: [embed] });
    
    await storage.logActivity({
      type: 'dm_sent',
      message: `Manual notification sent to ${user.username}`,
    });

    return true;
  } catch (error) {
    console.error(`[Discord] Failed to send manual notification to ${userId}:`, error);
    return false;
  }
}

// Get bot connection status
export function getBotStatus(): { connected: boolean; username?: string } {
  return {
    connected: isConnected,
    username: discordClient?.user?.username,
  };
}

// Get bot guilds
export async function getBotGuilds(): Promise<any[]> {
  if (!discordClient) return [];
  
  try {
    return discordClient.guilds.cache.map((guild) => ({
      id: guild.id,
      name: guild.name,
      icon: guild.iconURL(),
    }));
  } catch (error) {
    console.error('[Discord] Error fetching guilds:', error);
    return [];
  }
}

// Find fight channels in a guild
export async function findFightChannels(guildId: string): Promise<any[]> {
  if (!discordClient) return [];
  
  try {
    const guild = await discordClient.guilds.fetch(guildId);
    const channels = await guild.channels.fetch();
    
    return channels
      .filter((channel) => channel?.type === ChannelType.GuildText && channel.name.startsWith(FIGHT_CHAT_PREFIX))
      .map((channel) => ({
        id: channel?.id,
        name: channel?.name,
        type: 'GUILD_TEXT',
      }));
  } catch (error) {
    console.error('[Discord] Error fetching channels:', error);
    return [];
  }
}

// Get channel info
export async function getChannelInfo(channelId: string): Promise<any> {
  if (!discordClient) return null;
  
  try {
    const channel = await discordClient.channels.fetch(channelId);
    if (channel?.type === ChannelType.GuildText) {
      const guildChannel = channel as TextChannel;
      return {
        channelId: channel.id,
        channelName: guildChannel.name,
        guildId: guildChannel.guildId,
      };
    }
  } catch (error) {
    console.error('[Discord] Error fetching channel info:', error);
  }
  
  return null;
}

// Delete a fight channel
export async function updateFightChannelName(
  guildId: string,
  channelId: string,
  fighter1Username: string,
  fighter2Username: string,
  fightType: 'CAF' | 'Offline' | 'Live'
): Promise<boolean> {
  if (!discordClient || !isConnected) return false;

  try {
    const guild = discordClient.guilds.cache.get(guildId);
    if (!guild) return false;

    const channel = guild.channels.cache.get(channelId);
    if (!channel || channel.type !== ChannelType.GuildText) return false;

    const textChannel = channel as TextChannel;
    
    // Build new channel name based on fight type
    let prefix = '';
    if (fightType === 'CAF') prefix = 'caf';
    else if (fightType === 'Offline') prefix = 'off';
    else prefix = 'live';

    // Check if completed
    const currentName = textChannel.name;
    const isCompleted = currentName.includes('✅');
    
    const newName = `${prefix}${isCompleted ? '-✅' : '-'}-${fighter1Username}-vs-${fighter2Username}`.toLowerCase().slice(0, 100);
    
    if (textChannel.name !== newName) {
      await textChannel.setName(newName);
      console.log(`[Discord] Updated channel name from ${textChannel.name} to ${newName}`);
      return true;
    }
    return false;
  } catch (error) {
    console.error('[Discord] Error updating channel name:', error);
    return false;
  }
}

export async function deleteFightChannel(channelId: string): Promise<boolean> {
  if (!discordClient) return false;
  
  try {
    const channel = await discordClient.channels.fetch(channelId);
    if (channel?.type === ChannelType.GuildText) {
      await channel.delete();
      console.log(`[Discord] Deleted fight channel: ${channelId}`);
      return true;
    }
  } catch (error) {
    console.error(`[Discord] Error deleting channel ${channelId}:`, error);
  }
  
  return false;
}

// Handle /spin command
async function handleSpinCommand(interaction: any): Promise<void> {
  try {
    console.log(`[Discord] /spin command received in channel: ${interaction.channelId}, guild: ${interaction.guildId}`);
    
    const weight1 = interaction.options.getString('weight1');
    const weight2 = interaction.options.getString('weight2');

    console.log(`[Discord] Spin options: ${weight1} vs ${weight2}`);

    const row = new ActionRowBuilder<ButtonBuilder>()
      .addComponents(
        new ButtonBuilder()
          .setCustomId(`spin|${weight1}|${weight2}`)
          .setLabel('🎰 Spin!')
          .setStyle(ButtonStyle.Primary)
      );

    const embed = new EmbedBuilder()
      .setColor(0xDC2626)
      .setTitle('Weightclass Spinner')
      .setDescription(`Choose between **${weight1}** or **${weight2}**`)
      .setFooter({ text: 'Click the button to spin!' });

    await interaction.reply({ embeds: [embed], components: [row as any], ephemeral: false });
    console.log('[Discord] /spin command replied successfully');
  } catch (error) {
    console.error('[Discord] Error handling spin command:', error);
    try {
      await interaction.reply({ content: `Error: Could not process spin command. ${error}`, ephemeral: true });
    } catch (replyError) {
      console.error('[Discord] Failed to send error reply:', replyError);
    }
  }
}

// Handle /spinall command
async function handleSpinAllCommand(interaction: any): Promise<void> {
  try {
    console.log(`[Discord] /spinall command received in channel: ${interaction.channelId}, guild: ${interaction.guildId}`);
    
    const row = new ActionRowBuilder<ButtonBuilder>()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('spinall_wheel')
          .setLabel('🎡 Spin All Weights!')
          .setStyle(ButtonStyle.Primary)
      );

    const embed = new EmbedBuilder()
      .setColor(0xDC2626)
      .setTitle('Weightclass Spinner - All Weights')
      .setDescription('Spin to randomly select from ALL 11 weightclasses!')
      .setFooter({ text: 'Click the button to spin!' });

    await interaction.reply({ embeds: [embed], components: [row as any], ephemeral: false });
    console.log('[Discord] /spinall command replied successfully');
  } catch (error) {
    console.error('[Discord] Error handling spinall command:', error);
    try {
      await interaction.reply({ content: `Error: Could not process spinall command. ${error}`, ephemeral: true });
    } catch (replyError) {
      console.error('[Discord] Failed to send error reply:', replyError);
    }
  }
}

// Handle spin button interactions
async function handleSpinButton(interaction: any): Promise<void> {
  try {
    const customId = interaction.customId;
    let result: string;

    if (customId === 'spinall_wheel') {
      // Spin all weightclasses
      const WEIGHTCLASSES = [
        'Heavyweight (M)', 'Cruiserweight (M)', 'Light Heavyweight (M)', 'Middleweight (M)',
        'Welterweight (M)', 'Lightweight (M)', 'Featherweight (M)', 'Bantamweight (M)',
        'Welterweight (W)', 'Lightweight (W)'
      ];
      result = WEIGHTCLASSES[Math.floor(Math.random() * WEIGHTCLASSES.length)];
    } else {
      // Spin between two weights
      const parts = customId.split('|');
      const weight1 = parts[1];
      const weight2 = parts[2];
      result = Math.random() > 0.5 ? weight1 : weight2;
    }

    const embed = new EmbedBuilder()
      .setColor(0x10B981)
      .setTitle('🎰 Result!')
      .setDescription(`**${result}**`)
      .setFooter({ text: 'Weightclass has been selected!' });

    await interaction.reply({ embeds: [embed], ephemeral: false });
  } catch (error) {
    console.error('[Discord] Error handling spin button:', error);
    await interaction.reply({ content: 'Error processing spin', ephemeral: true });
  }
}
