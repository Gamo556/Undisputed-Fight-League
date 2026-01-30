# Undisputed Boxing League - Fight Manager Bot

## Overview
A Discord bot with admin dashboard for managing the Undisputed Boxing League fight matches. The bot automatically DMs fighters when they're matched and notifies them when their opponent responds in fight chats.

## Features
- **Auto DM on Match**: When a fight is created, both fighters receive a DM with the fight chat link
- **Response Notifications**: Use `!notifyreply` in fight channels to notify opponent (mods notify both)
- **Fight Chat Monitoring**: Bot monitors all fight channels for activity
- **Admin Dashboard**: Web interface to view active fights, create new matches, and manage fighters
- **Activity Feed**: Real-time log of bot actions (DMs sent, fights created, notifications)
- **Fighter Contacts**: Save fighter Discord IDs and display names on the website for easy reuse
- **Auto Channel Renaming**: Updating a fighter's display name automatically renames all their active fight channels
- **Dynamic Rankings**: Rankings calculated in real-time based on fighter records (wins, then losses). All 68 fighters ranked dynamically
- **Rankings Commands**: 
  - `!rankings <world|rbc|abc>` - View top 15 fighters
  - `!rankingsnear [name] <world|rbc|abc>` - Show 4 above/below target fighter
- **Matchup Suggestions**: Use `!matchup [name]`, `!matchupeu [name]`, or `!matchupna [name]` to find potential opponents
- **Fight Card**: Use `!fightcard [name]` to view fighter's record and last 5 opponents
- **Weightclass Spinner**: Use `!spin` or `!spinall` commands to randomly select weightclasses
- **Multiple Live Show Categories**: Separate fight channels for On The Rise (Wednesday) and Thursday Throwdown

## Slash Commands

### Fight Creation (Moderators Only)
- `/caffight <fighter1> <fighter2>` - Create CAF fight
- `/offlinefight <fighter1> <fighter2>` - Create Offline fight
- `/ontherise <fighter1> <fighter2>` - Create On The Rise (Wednesday) fight
- `/thursdaythrowdown <fighter1> <fighter2>` - Create Thursday Throwdown (Thursday) fight
- `/notifyreply` - Notify opponent in fight channels
- `/finishfight` - Mark fight as complete
- `/spin <weight1> <weight2>` - Random weightclass selector
- `/spinall` - Random selector from all weights

## Text Commands

### Moderator-Only Commands (require Manage Channels permission):
- `!rankings <world|rbc|abc>` - View top 15 rankings
- `!rankingsnear [name] <world|rbc|abc>` - View rankings around a fighter
- `!matchup [name]` - World matchup suggestions
- `!matchupeu [name]` - EU (RBC) matchup suggestions
- `!matchupna [name]` - NA (ABC) matchup suggestions
- `!fightcard [name]` - Fighter fight card & history

### Public Commands (all users):
- `!notifyreply` - Notify opponent in fight channels (fighters notify opponent, mods notify both)
- `!finishfight` - Mark fight as complete
- `!spin <weight1> <weight2>` - Random selector between two weights
- `!spinall` - Random selector from all weights

## Project Structure
```
├── client/                 # React frontend (Vite)
│   └── src/
│       ├── components/     # Reusable UI components
│       ├── pages/          # Page components (Dashboard)
│       └── lib/            # Utilities
├── server/                 # Express backend
│   ├── discord.ts          # Discord bot logic
│   ├── routes.ts           # API endpoints
│   └── storage.ts          # In-memory storage
└── shared/
    └── schema.ts           # Type definitions
```

## Discord Bot Setup
1. Create a Discord Application at https://discord.com/developers/applications
2. Enable these Privileged Gateway Intents:
   - MESSAGE CONTENT INTENT
   - SERVER MEMBERS INTENT
3. Generate bot token and add to Replit Secrets as `DISCORD_BOT_TOKEN`
4. Invite bot to your server with these permissions:
   - Send Messages
   - Read Message History
   - View Channels
   - Manage Channels (for moderator command checks)

## Category Configuration
Update the category IDs in the code for your server:
- `CATEGORY_IDS.CAF` - CAF fights category
- `CATEGORY_IDS.Offline` - Offline fights category
- `CATEGORY_IDS.OnTheRise` - Wednesday live fights category
- `CATEGORY_IDS.ThursdayThrowdown` - Thursday live fights category

## API Endpoints
- `GET /api/bot/status` - Bot connection status
- `GET /api/fights` - List all fights
- `POST /api/fights` - Create new fight
- `PATCH /api/fights/:id/status` - Update fight status
- `POST /api/notify/:userId` - Send manual notification
- `GET /api/activities` - Recent bot activity
- `GET /api/settings` - Bot configuration
- `PATCH /api/settings` - Update settings
- `GET /api/stats` - Dashboard statistics

## How to Use
1. Use `/caffight`, `/offlinefight`, `/ontherise`, or `/thursdaythrowdown` commands
2. Select Discord User mentions for both fighters
3. Press Enter to create the fight
4. Fighters receive DMs with fight chat links
5. Fighters can use `!notifyreply` to notify opponent when they respond

## Rankings System
- Rankings are dynamically calculated based on fighter records (wins first, then losses as tiebreaker)
- Fresh records fetched from Firestore on every ranking command
- All 68 world fighters included, 15 EU, 15 NA

## Getting Discord IDs
- Enable Developer Mode in Discord (User Settings > Advanced > Developer Mode)
- Right-click a user and select "Copy User ID"
- Right-click a channel and select "Copy Channel ID"
