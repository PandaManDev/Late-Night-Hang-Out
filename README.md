# Late Night Hang Out Discord Bot

A Discord community bot built with **Node.js 24** and **discord.js v14**.

## Features

- Slash commands: ping, help, serverinfo, userinfo
- Moderation: clear, kick, ban, timeout, untimeout
- Announcements
- Configurable welcome and goodbye channel
- Configurable moderation/server log channel
- Per-server settings saved in `data/settings.json`
- Slash commands register automatically on startup
- Optional fast command registration for one test server using `GUILD_ID`

## Requirements

- Node.js 24+
- A Discord application and bot token
- The bot invited with the required scopes and permissions

## Setup

1. Clone this repository.
2. Install dependencies:

   ```bash
   npm install
   ```

3. Copy `.env.example` to `.env`.
4. Fill in `DISCORD_TOKEN` and `CLIENT_ID`.
5. Optionally set `GUILD_ID` while testing. Leave it blank for global command registration.
6. Start the bot:

   ```bash
   npm start
   ```

## Discord Developer Portal

In **Bot > Privileged Gateway Intents**, enable **Server Members Intent** for welcome/goodbye events.

Invite the bot using the OAuth2 URL Generator with:
- Scopes: `bot`, `applications.commands`
- Permissions: View Channels, Send Messages, Embed Links, Read Message History, Manage Messages, Kick Members, Ban Members, Moderate Members, Manage Server

Only grant permissions the bot needs. Keep the bot role below administrator/staff roles, but above members it must moderate.

## Commands

| Command | Purpose |
| --- | --- |
| `/ping` | Check bot latency |
| `/help` | List commands |
| `/serverinfo` | Server information |
| `/userinfo [user]` | Member information |
| `/clear amount` | Delete 1-100 recent messages |
| `/kick user [reason]` | Kick a member |
| `/ban user [reason]` | Ban a member |
| `/timeout user minutes [reason]` | Timeout a member (up to 28 days) |
| `/untimeout user` | Remove a timeout |
| `/announce channel message` | Send an announcement |
| `/setwelcome channel` | Configure welcome/goodbye messages |
| `/setlogchannel channel` | Configure server logs |

## Hosting panel

- Runtime: Node.js 24
- Install command: `npm install`
- Startup command: `npm start`
- Environment variables: add `DISCORD_TOKEN`, `CLIENT_ID`, and optionally `GUILD_ID`, `BOT_STATUS` in the panel.
- Do not upload your `.env` file or share your bot token.

## Notes

Settings are written to the local `data/settings.json` file. Make sure your host preserves the project directory between restarts, or use persistent storage for the `data` folder.
