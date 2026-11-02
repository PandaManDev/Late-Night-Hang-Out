# Late Night Hang Out Discord Bot

A community bot built with **Node.js 24** and **discord.js v14**.

## Features
- General: ping, help, serverinfo, userinfo, avatar, membercount
- Moderation: clear, kick, ban, timeout, untimeout
- Channel tools: slowmode, lock, unlock
- Role tools: nickname, role add/remove
- Community/fun: coinflip, eightball, roll, choose, poll
- Announcements, welcome/goodbye messages, and server logs
- Per-server settings saved in `data/settings.json`
- Slash commands register automatically on startup

## Requirements
- Node.js 24+
- Discord application and bot token

## Setup
1. Install dependencies: `npm install`
2. Copy `.env.example` to `.env`
3. Set `DISCORD_TOKEN` and `CLIENT_ID`
4. Optionally set `GUILD_ID` for instant registration in one test server
5. Start: `npm start`

## Developer Portal
Enable **Server Members Intent** for welcome/goodbye events.

Invite scopes: `bot`, `applications.commands`.

Recommended permissions: View Channels, Send Messages, Embed Links, Read Message History, Add Reactions, Manage Messages, Manage Channels, Manage Roles, Manage Nicknames, Kick Members, Ban Members, Moderate Members, and Manage Server. Keep the bot role above roles it needs to manage and below trusted staff roles.

## Commands

| Command | Purpose |
| --- | --- |
| `/ping` | Check latency |
| `/help` | List commands |
| `/serverinfo` | Server details |
| `/userinfo [user]` | Member details |
| `/avatar [user]` | Show avatar |
| `/membercount` | Show member count |
| `/clear amount` | Delete 1-100 recent messages |
| `/kick user [reason]` | Kick a member |
| `/ban user [reason]` | Ban a member |
| `/timeout user minutes [reason]` | Timeout a member |
| `/untimeout user` | Remove timeout |
| `/announce channel message` | Post announcement |
| `/setwelcome channel` | Set welcome/goodbye channel |
| `/setlogchannel channel` | Set log channel |
| `/slowmode seconds` | Set channel slowmode |
| `/lock` / `/unlock` | Lock or unlock channel |
| `/nickname user [name]` | Change or clear nickname |
| `/role add|remove user role` | Add or remove a role |
| `/poll question option1 option2` | Create a reaction poll |
| `/coinflip` | Flip a coin |
| `/eightball question` | Ask the magic 8-ball |
| `/roll [sides]` | Roll a die |
| `/choose option1 option2` | Pick between two options |

## Hosting panel
- Runtime: Node.js 24
- Install command: `npm install`
- Startup command: `npm start`
- Set `DISCORD_TOKEN`, `CLIENT_ID`, and optionally `GUILD_ID` and `BOT_STATUS` as environment variables.
- Never commit or share your bot token.
- Keep `data/settings.json` on persistent storage so settings survive restarts.
