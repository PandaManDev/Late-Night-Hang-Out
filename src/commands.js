import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
  ChannelType
} from "discord.js";
import { getGuildSettings, updateGuildSettings } from "./storage.js";

const commands = [
  new SlashCommandBuilder()
    .setName("ping")
    .setDescription("Check whether the bot is online."),
  new SlashCommandBuilder()
    .setName("help")
    .setDescription("Show the bot command list."),
  new SlashCommandBuilder()
    .setName("serverinfo")
    .setDescription("Show information about this server."),
  new SlashCommandBuilder()
    .setName("userinfo")
    .setDescription("Show information about a server member.")
    .addUserOption(option => option.setName("user").setDescription("Member to inspect").setRequired(false)),
  new SlashCommandBuilder()
    .setName("clear")
    .setDescription("Delete recent messages from this channel.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .addIntegerOption(option => option.setName("amount").setDescription("Number of messages (1-100)").setMinValue(1).setMaxValue(100).setRequired(true)),
  new SlashCommandBuilder()
    .setName("kick")
    .setDescription("Kick a member from the server.")
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers)
    .addUserOption(option => option.setName("user").setDescription("Member to kick").setRequired(true))
    .addStringOption(option => option.setName("reason").setDescription("Reason for the kick").setMaxLength(500)),
  new SlashCommandBuilder()
    .setName("ban")
    .setDescription("Ban a member from the server.")
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
    .addUserOption(option => option.setName("user").setDescription("Member to ban").setRequired(true))
    .addStringOption(option => option.setName("reason").setDescription("Reason for the ban").setMaxLength(500)),
  new SlashCommandBuilder()
    .setName("timeout")
    .setDescription("Timeout a member.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption(option => option.setName("user").setDescription("Member to timeout").setRequired(true))
    .addIntegerOption(option => option.setName("minutes").setDescription("Duration (1-40320 minutes)").setMinValue(1).setMaxValue(40320).setRequired(true))
    .addStringOption(option => option.setName("reason").setDescription("Reason").setMaxLength(500)),
  new SlashCommandBuilder()
    .setName("untimeout")
    .setDescription("Remove a member's timeout.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption(option => option.setName("user").setDescription("Member to untimeout").setRequired(true)),
  new SlashCommandBuilder()
    .setName("announce")
    .setDescription("Post an announcement in a channel.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .addChannelOption(option => option.setName("channel").setDescription("Where to post").addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement).setRequired(true))
    .addStringOption(option => option.setName("message").setDescription("Announcement text").setMaxLength(2000).setRequired(true)),
  new SlashCommandBuilder()
    .setName("setwelcome")
    .setDescription("Set the channel for member welcome and goodbye messages.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addChannelOption(option => option.setName("channel").setDescription("Welcome channel").addChannelTypes(ChannelType.GuildText).setRequired(true)),
  new SlashCommandBuilder()
    .setName("setlogchannel")
    .setDescription("Set the channel for moderation and server logs.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addChannelOption(option => option.setName("channel").setDescription("Log channel").addChannelTypes(ChannelType.GuildText).setRequired(true))
].map(command => command.toJSON());

function makeEmbed(title, description, color = 0x5865f2) {
  return new EmbedBuilder()
    .setColor(color)
    .setTitle(title)
    .setDescription(description)
    .setTimestamp();
}

async function sendLog(guild, description) {
  const settings = getGuildSettings(guild.id);
  if (!settings.logChannelId) return;
  const channel = await guild.channels.fetch(settings.logChannelId).catch(() => null);
  if (channel?.isTextBased()) {
    await channel.send({ embeds: [makeEmbed("Server Log", description, 0x747f8d)] }).catch(() => {});
  }
}

export async function handleCommand(interaction) {
  const { commandName, guild, member } = interaction;
  if (!guild) {
    return interaction.reply({ content: "This command can only be used inside a server.", ephemeral: true });
  }

  if (commandName === "ping") {
    return interaction.reply({ embeds: [makeEmbed("Pong!", `WebSocket latency: **${interaction.client.ws.ping}ms**`)] });
  }

  if (commandName === "help") {
    const description = [
      "**General**",
      "`/ping` — Check bot latency",
      "`/serverinfo` — Server details",
      "`/userinfo [user]` — Member details",
      "",
      "**Moderation**",
      "`/clear amount` — Clear 1-100 messages",
      "`/kick user [reason]` — Kick a member",
      "`/ban user [reason]` — Ban a member",
      "`/timeout user minutes [reason]` — Timeout a member",
      "`/untimeout user` — Remove a timeout",
      "`/announce channel message` — Send an announcement",
      "",
      "**Configuration**",
      "`/setwelcome channel` — Set welcome/goodbye channel",
      "`/setlogchannel channel` — Set server log channel"
    ].join("\n");
    return interaction.reply({ embeds: [makeEmbed("Late Night Hang Out | Commands", description)], ephemeral: true });
  }

  if (commandName === "serverinfo") {
    const owner = await guild.fetchOwner();
    const embed = makeEmbed(guild.name, [
      `**Owner:** ${owner.user.tag}`,
      `**Members:** ${guild.memberCount}`,
      `**Created:** <t:${Math.floor(guild.createdTimestamp / 1000)}:D>`,
      `**Channels:** ${guild.channels.cache.size}`,
      `**Roles:** ${guild.roles.cache.size}`
    ].join("\n"));
    if (guild.iconURL()) embed.setThumbnail(guild.iconURL({ size: 256 }));
    return interaction.reply({ embeds: [embed] });
  }

  if (commandName === "userinfo") {
    const user = interaction.options.getUser("user") ?? interaction.user;
    const target = await guild.members.fetch(user.id).catch(() => null);
    const embed = makeEmbed(user.tag, [
      `**User ID:** ${user.id}`,
      `**Joined:** ${target?.joinedTimestamp ? `<t:${Math.floor(target.joinedTimestamp / 1000)}:R>` : "Unknown"}`,
      `**Account created:** <t:${Math.floor(user.createdTimestamp / 1000)}:R>`,
      `**Top role:** ${target?.roles?.highest ?? "Unknown"}`
    ].join("\n"));
    embed.setThumbnail(user.displayAvatarURL({ size: 256 }));
    return interaction.reply({ embeds: [embed] });
  }

  if (commandName === "clear") {
    if (!interaction.channel?.isTextBased() || !("bulkDelete" in interaction.channel)) {
      return interaction.reply({ content: "This channel does not support bulk deletion.", ephemeral: true });
    }
    const amount = interaction.options.getInteger("amount", true);
    const deleted = await interaction.channel.bulkDelete(amount, true);
    await interaction.reply({ content: `Deleted **${deleted.size}** recent messages. Messages older than 14 days cannot be bulk-deleted.`, ephemeral: true });
    await sendLog(guild, `${interaction.user.tag} cleared ${deleted.size} messages in <#${interaction.channelId}>.`);
    return;
  }

  if (["kick", "ban", "timeout", "untimeout"].includes(commandName)) {
    const user = interaction.options.getUser("user", true);
    if (user.id === interaction.user.id) {
      return interaction.reply({ content: "You cannot use this command on yourself.", ephemeral: true });
    }
    if (user.id === interaction.client.user.id) {
      return interaction.reply({ content: "I cannot moderate myself.", ephemeral: true });
    }
    const target = await guild.members.fetch(user.id).catch(() => null);
    if (!target) return interaction.reply({ content: "That member is not in this server.", ephemeral: true });
    if (target.id === guild.ownerId) return interaction.reply({ content: "The server owner cannot be moderated.", ephemeral: true });
    if (!member.permissions.has(PermissionFlagsBits.Administrator) && member.roles.highest.comparePositionTo(target.roles.highest) <= 0) {
      return interaction.reply({ content: "Your highest role must be above the target member's highest role.", ephemeral: true });
    }
    if (!target.manageable && commandName !== "ban") {
      return interaction.reply({ content: "My role is not high enough to moderate that member.", ephemeral: true });
    }

    const reason = interaction.options.getString("reason") || `Action by ${interaction.user.tag}`;
    if (commandName === "kick") {
      if (!target.kickable) return interaction.reply({ content: "I cannot kick that member. Check my role position and permissions.", ephemeral: true });
      await target.kick(reason);
      await interaction.reply({ content: `Kicked **${user.tag}**. Reason: ${reason}` });
      await sendLog(guild, `**Kick:** ${user.tag}\n**Moderator:** ${interaction.user.tag}\n**Reason:** ${reason}`);
    } else if (commandName === "ban") {
      if (!member.permissions.has(PermissionFlagsBits.BanMembers)) return interaction.reply({ content: "You need the Ban Members permission.", ephemeral: true });
      await guild.members.ban(user.id, { reason });
      await interaction.reply({ content: `Banned **${user.tag}**. Reason: ${reason}` });
      await sendLog(guild, `**Ban:** ${user.tag}\n**Moderator:** ${interaction.user.tag}\n**Reason:** ${reason}`);
    } else if (commandName === "timeout") {
      if (!target.moderatable) return interaction.reply({ content: "I cannot timeout that member. Check role positions and permissions.", ephemeral: true });
      const minutes = interaction.options.getInteger("minutes", true);
      await target.timeout(minutes * 60 * 1000, reason);
      await interaction.reply({ content: `Timed out **${user.tag}** for **${minutes} minutes**. Reason: ${reason}` });
      await sendLog(guild, `**Timeout:** ${user.tag} for ${minutes} minutes\n**Moderator:** ${interaction.user.tag}\n**Reason:** ${reason}`);
    } else {
      if (!target.moderatable) return interaction.reply({ content: "I cannot remove that member's timeout.", ephemeral: true });
      await target.timeout(null, `Timeout removed by ${interaction.user.tag}`);
      await interaction.reply({ content: `Removed **${user.tag}**'s timeout.` });
      await sendLog(guild, `**Timeout removed:** ${user.tag}\n**Moderator:** ${interaction.user.tag}`);
    }
    return;
  }

  if (commandName === "announce") {
    const channel = interaction.options.getChannel("channel", true);
    const message = interaction.options.getString("message", true);
    await channel.send({ content: message, allowedMentions: { parse: [] } });
    return interaction.reply({ content: `Announcement posted in <#${channel.id}>.`, ephemeral: true });
  }

  if (commandName === "setwelcome") {
    const channel = interaction.options.getChannel("channel", true);
    updateGuildSettings(guild.id, { welcomeChannelId: channel.id });
    return interaction.reply({ content: `Welcome and goodbye messages will be sent in <#${channel.id}>.`, ephemeral: true });
  }

  if (commandName === "setlogchannel") {
    const channel = interaction.options.getChannel("channel", true);
    updateGuildSettings(guild.id, { logChannelId: channel.id });
    return interaction.reply({ content: `Server logs will be sent in <#${channel.id}>.`, ephemeral: true });
  }
}

export { commands, sendLog, makeEmbed };
