import "dotenv/config";
import {
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  ActivityType
} from "discord.js";
import { commands, handleCommand, sendLog, makeEmbed } from "./commands.js";
import { getGuildSettings } from "./storage.js";

const token = process.env.DISCORD_TOKEN;
const clientId = process.env.CLIENT_ID;
const guildId = process.env.GUILD_ID;

if (!token || !clientId) {
  console.error("Missing DISCORD_TOKEN or CLIENT_ID. Copy .env.example to .env and fill them in.");
  process.exit(1);
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildInvites,
    GatewayIntentBits.GuildModeration,
    GatewayIntentBits.GuildEmojisAndStickers
  ]
});

async function registerCommands() {
  const rest = new REST({ version: "10" }).setToken(token);
  const route = guildId
    ? Routes.applicationGuildCommands(clientId, guildId)
    : Routes.applicationCommands(clientId);

  await rest.put(route, { body: commands });
  console.log(`Registered ${commands.length} slash commands ${guildId ? `for guild ${guildId}` : "globally"}.`);
}

client.once("ready", async readyClient => {
  console.log(`Logged in as ${readyClient.user.tag}`);
  readyClient.user.setActivity(process.env.BOT_STATUS || "the late night vibes", { type: ActivityType.Watching });
});

client.on("interactionCreate", async interaction => {
  if (!interaction.isChatInputCommand()) return;
  try {
    await handleCommand(interaction);
  } catch (error) {
    console.error(`Command /${interaction.commandName} failed:`, error);
    const payload = { content: "Something went wrong while running that command. Check the bot console for details.", ephemeral: true };
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(payload).catch(() => {});
    } else {
      await interaction.reply(payload).catch(() => {});
    }
  }
});

client.on("guildMemberAdd", async member => {
  const settings = getGuildSettings(member.guild.id);
  if (!settings.welcomeChannelId) return;
  const channel = await member.guild.channels.fetch(settings.welcomeChannelId).catch(() => null);
  if (channel?.isTextBased()) {
    await channel.send({
      embeds: [makeEmbed("Welcome to Late Night Hang Out!", `Welcome ${member} to **${member.guild.name}**! Make yourself at home and enjoy your stay.`)]
    }).catch(console.error);
  }
  await sendLog(member.guild, `**Member joined:** ${member.user.tag} (${member.id})`);
});

client.on("guildMemberRemove", async member => {
  const settings = getGuildSettings(member.guild.id);
  if (settings.welcomeChannelId) {
    const channel = await member.guild.channels.fetch(settings.welcomeChannelId).catch(() => null);
    if (channel?.isTextBased()) {
      await channel.send({
        embeds: [makeEmbed("Member left", `**${member.user.tag}** has left the server.`, 0xed4245)]
      }).catch(console.error);
    }
  }
  await sendLog(member.guild, `**Member left:** ${member.user.tag} (${member.id})`);
});


const clip = (value, max = 900) => {
  const text = (value || "").trim();
  return text ? (text.length > max ? text.slice(0, max) + "…" : text) : "*No text content available*";
};

client.on("messageCreate", async message => {
  if (!message.guild || message.author?.bot) return;
  const attachments = [...message.attachments.values()].map(file => file.url).join("\\n");
  await sendLog(message.guild,
    `**Message sent** in <#${message.channelId}>\\n**Author:** ${message.author.tag} (${message.author.id})\\n**Content:** ${clip(message.content)}${attachments ? `\\n**Attachments:**\\n${attachments}` : ""}`
  );
});

client.on("messageDelete", async message => {
  if (!message.guild) return;
  const author = message.author ? `${message.author.tag} (${message.author.id})` : "Unknown (message was not cached)";
  await sendLog(message.guild,
    `**Message deleted** in <#${message.channelId}>\\n**Author:** ${author}\\n**Content:** ${clip(message.content)}`
  );
});

client.on("messageUpdate", async (oldMessage, newMessage) => {
  if (!newMessage.guild || newMessage.author?.bot) return;
  if (oldMessage.content === newMessage.content) return;
  await sendLog(newMessage.guild,
    `**Message edited** in <#${newMessage.channelId}>\\n**Author:** ${newMessage.author?.tag || "Unknown"} (${newMessage.author?.id || "unknown"})\\n**Before:** ${clip(oldMessage.content)}\\n**After:** ${clip(newMessage.content)}\\n[Jump to message](${newMessage.url})`
  );
});

client.on("messageDeleteBulk", async messages => {
  const first = messages.first();
  if (!first?.guild) return;
  await sendLog(first.guild, `**Bulk message deletion** in <#${first.channelId}>\\n**Messages deleted:** ${messages.size}`);
});

client.on("channelCreate", channel => {
  if (channel.guild) void sendLog(channel.guild, `**Channel created:** ${channel} (${channel.name})`);
});
client.on("channelDelete", channel => {
  if (channel.guild) void sendLog(channel.guild, `**Channel deleted:** #${channel.name} (${channel.id})`);
});
client.on("channelUpdate", (oldChannel, newChannel) => {
  if (!newChannel.guild) return;
  void sendLog(newChannel.guild, `**Channel updated:** ${newChannel} (${newChannel.name})`);
});

client.on("roleCreate", role => void sendLog(role.guild, `**Role created:** ${role.name} (${role.id})`));
client.on("roleDelete", role => void sendLog(role.guild, `**Role deleted:** ${role.name} (${role.id})`));
client.on("roleUpdate", (oldRole, newRole) => {
  const changes = [];
  if (oldRole.name !== newRole.name) changes.push(`Name: ${oldRole.name} → ${newRole.name}`);
  if (oldRole.hexColor !== newRole.hexColor) changes.push(`Color: ${oldRole.hexColor} → ${newRole.hexColor}`);
  if (oldRole.permissions.bitfield !== newRole.permissions.bitfield) changes.push("Permissions changed");
  if (changes.length) void sendLog(newRole.guild, `**Role updated:** ${newRole.name} (${newRole.id})\\n${changes.join("\\n")}`);
});

client.on("guildMemberUpdate", (oldMember, newMember) => {
  const changes = [];
  if (oldMember.nickname !== newMember.nickname) changes.push(`Nickname: ${oldMember.nickname || "none"} → ${newMember.nickname || "none"}`);
  const oldRoles = new Set(oldMember.roles.cache.keys());
  const newRoles = new Set(newMember.roles.cache.keys());
  const added = [...newRoles].filter(id => !oldRoles.has(id)).map(id => newMember.guild.roles.cache.get(id)?.name || id);
  const removed = [...oldRoles].filter(id => !newRoles.has(id)).map(id => oldMember.guild.roles.cache.get(id)?.name || id);
  if (added.length) changes.push(`Roles added: ${added.join(", ")}`);
  if (removed.length) changes.push(`Roles removed: ${removed.join(", ")}`);
  if (changes.length) void sendLog(newMember.guild, `**Member updated:** ${newMember.user.tag} (${newMember.id})\\n${changes.join("\\n")}`);
});

client.on("voiceStateUpdate", (oldState, newState) => {
  const member = newState.member || oldState.member;
  const guild = newState.guild || oldState.guild;
  if (!member || !guild) return;
  if (oldState.channelId === newState.channelId && oldState.serverMute === newState.serverMute && oldState.serverDeaf === newState.serverDeaf && oldState.selfMute === newState.selfMute && oldState.selfDeaf === newState.selfDeaf && oldState.streaming === newState.streaming && oldState.selfVideo === newState.selfVideo) return;
  let action = "Voice state changed";
  if (!oldState.channelId && newState.channelId) action = `Joined voice channel <#${newState.channelId}>`;
  else if (oldState.channelId && !newState.channelId) action = `Left voice channel <#${oldState.channelId}>`;
  else if (oldState.channelId !== newState.channelId) action = `Moved voice channel: <#${oldState.channelId}> → <#${newState.channelId}>`;
  else action = "Voice settings changed (mute/deafen/video/stream)";
  void sendLog(guild, `**${action}:** ${member.user.tag} (${member.id})`);
});

client.on("guildBanAdd", ban => void sendLog(ban.guild, `**Member banned:** ${ban.user.tag} (${ban.user.id})`));
client.on("guildBanRemove", ban => void sendLog(ban.guild, `**Member unbanned:** ${ban.user.tag} (${ban.user.id})`));

client.on("inviteCreate", invite => {
  if (invite.guild) void sendLog(invite.guild, `**Invite created:** ${invite.code} by ${invite.inviter?.tag || "Unknown"}`);
});
client.on("inviteDelete", invite => {
  if (invite.guild) void sendLog(invite.guild, `**Invite deleted:** ${invite.code}`);
});

client.on("threadCreate", thread => void sendLog(thread.guild, `**Thread created:** ${thread.name} in <#${thread.parentId}>`));
client.on("threadDelete", thread => void sendLog(thread.guild, `**Thread deleted:** ${thread.name} (${thread.id})`));
client.on("threadUpdate", (oldThread, newThread) => {
  if (oldThread.name !== newThread.name || oldThread.archived !== newThread.archived || oldThread.locked !== newThread.locked) {
    void sendLog(newThread.guild, `**Thread updated:** ${newThread.name} in <#${newThread.parentId}>\\nName/archive/lock settings changed`);
  }
});

client.on("guildUpdate", (oldGuild, newGuild) => {
  const changes = [];
  if (oldGuild.name !== newGuild.name) changes.push(`Name: ${oldGuild.name} → ${newGuild.name}`);
  if (oldGuild.icon !== newGuild.icon) changes.push("Server icon changed");
  if (changes.length) void sendLog(newGuild, `**Server updated**\\n${changes.join("\\n")}`);
});

client.on("error", error => console.error("Discord client error:", error));
process.on("unhandledRejection", error => console.error("Unhandled promise rejection:", error));

try {
  await registerCommands();
  await client.login(token);
} catch (error) {
  console.error("Bot startup failed:", error);
  process.exit(1);
}
