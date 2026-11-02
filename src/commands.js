import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
  ChannelType
} from "discord.js";
import { getGuildSettings, updateGuildSettings } from "./storage.js";

export const commands = [
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
    .addChannelOption(option => option.setName("channel").setDescription("Log channel").addChannelTypes(ChannelType.GuildText).setRequired(true)),
  new SlashCommandBuilder()
    .setName("avatar")
    .setDescription("Show a member's avatar.")
    .addUserOption(option => option.setName("user").setDescription("Member whose avatar to show").setRequired(false)),
  new SlashCommandBuilder()
    .setName("membercount")
    .setDescription("Show the server member count."),
  new SlashCommandBuilder()
    .setName("coinflip")
    .setDescription("Flip a coin."),
  new SlashCommandBuilder()
    .setName("eightball")
    .setDescription("Ask the magic 8-ball a question.")
    .addStringOption(option => option.setName("question").setDescription("Your question").setMaxLength(300).setRequired(true)),
  new SlashCommandBuilder()
    .setName("roll")
    .setDescription("Roll a dice.")
    .addIntegerOption(option => option.setName("sides").setDescription("Number of sides (2-1000)").setMinValue(2).setMaxValue(1000).setRequired(false)),
  new SlashCommandBuilder()
    .setName("choose")
    .setDescription("Let the bot choose between two options.")
    .addStringOption(option => option.setName("option1").setDescription("First option").setMaxLength(100).setRequired(true))
    .addStringOption(option => option.setName("option2").setDescription("Second option").setMaxLength(100).setRequired(true)),
  new SlashCommandBuilder()
    .setName("slowmode")
    .setDescription("Set this channel's slowmode.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
    .addIntegerOption(option => option.setName("seconds").setDescription("Slowmode seconds (0-21600)").setMinValue(0).setMaxValue(21600).setRequired(true)),
  new SlashCommandBuilder()
    .setName("lock")
    .setDescription("Prevent @everyone from sending messages in this channel.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),
  new SlashCommandBuilder()
    .setName("unlock")
    .setDescription("Allow @everyone to send messages in this channel.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),
  new SlashCommandBuilder()
    .setName("nickname")
    .setDescription("Change a member's nickname.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageNicknames)
    .addUserOption(option => option.setName("user").setDescription("Member to rename").setRequired(true))
    .addStringOption(option => option.setName("name").setDescription("New nickname (leave blank to clear)").setMaxLength(32).setRequired(false)),
  new SlashCommandBuilder()
    .setName("role")
    .setDescription("Add or remove a role from a member.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
    .addSubcommand(sub => sub.setName("add").setDescription("Give a role to a member.")
      .addUserOption(option => option.setName("user").setDescription("Member").setRequired(true))
      .addRoleOption(option => option.setName("role").setDescription("Role to give").setRequired(true)))
    .addSubcommand(sub => sub.setName("remove").setDescription("Remove a role from a member.")
      .addUserOption(option => option.setName("user").setDescription("Member").setRequired(true))
      .addRoleOption(option => option.setName("role").setDescription("Role to remove").setRequired(true))),
  new SlashCommandBuilder()
    .setName("poll")
    .setDescription("Create a two-option poll.")
    .addStringOption(option => option.setName("question").setDescription("Poll question").setMaxLength(200).setRequired(true))
    .addStringOption(option => option.setName("option1").setDescription("First option").setMaxLength(50).setRequired(true))
    .addStringOption(option => option.setName("option2").setDescription("Second option").setMaxLength(50).setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
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
  const logChannelId = settings.logChannelId || "1566892595546820709";
  const channel = await guild.channels.fetch(logChannelId).catch(() => null);
  if (channel?.isTextBased()) {
    await channel.send({ embeds: [makeEmbed("Server Log", description, 0x747f8d)] }).catch(() => {});
  }
}

export async function handleCommand(interaction) {
  const { commandName, guild, member } = interaction;

  const adminRoleIds = new Set([
    "1566890802943103107",
    "1566891359908929637",
    "1566891462984073276",
    "1566891555300704256"
  ]);
  const adminOnlyCommands = new Set([
    "clear", "kick", "ban", "timeout", "untimeout",
    "announce", "setwelcome", "setlogchannel", "slowmode",
    "lock", "unlock", "nickname", "role", "poll"
  ]);

  if (adminOnlyCommands.has(commandName)) {
    const hasAdminRole = member.roles.cache.some(role => adminRoleIds.has(role.id));
    if (!hasAdminRole) {
      return interaction.reply({
        content: "You need one of the approved admin roles to use this command.",
        ephemeral: true
      });
    }
  }
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
      "`/setlogchannel channel` — Set server log channel",
      "",
      "**Community & Fun**",
      "`/avatar [user]` — Show an avatar",
      "`/membercount` — Show member count",
      "`/coinflip` — Flip a coin",
      "`/eightball question` — Ask the 8-ball",
      "`/roll [sides]` — Roll dice",
      "`/choose option1 option2` — Pick an option",
      "`/poll question option1 option2` — Create a poll",
      "",
      "**Channel & Role Tools**",
      "`/slowmode seconds` — Set slowmode",
      "`/lock` and `/unlock` — Lock or unlock channel",
      "`/nickname user [name]` — Change nickname",
      "`/role add|remove user role` — Manage member roles"
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

  if (commandName === "avatar") {
    const user = interaction.options.getUser("user") ?? interaction.user;
    const url = user.displayAvatarURL({ size: 1024, extension: "png" });
    const embed = makeEmbed(`${user.tag}'s Avatar`, `[Open full-size avatar](${url})`).setImage(url);
    return interaction.reply({ embeds: [embed] });
  }

  if (commandName === "membercount") {
    return interaction.reply({ embeds: [makeEmbed("Server Members", `This server has **${guild.memberCount.toLocaleString()}** members.`)] });
  }

  if (commandName === "coinflip") {
    const result = Math.random() < 0.5 ? "Heads" : "Tails";
    return interaction.reply({ embeds: [makeEmbed("Coin Flip", `The coin landed on **${result}**.`)] });
  }

  if (commandName === "eightball") {
    const answers = ["It is certain.", "Without a doubt.", "Yes — definitely.", "Most likely.", "Ask again later.", "Cannot predict that right now.", "Don't count on it.", "My sources say no.", "Very doubtful."];
    const question = interaction.options.getString("question", true);
    return interaction.reply({ embeds: [makeEmbed("Magic 8-Ball", `**Question:** ${question}\n\n**Answer:** ${answers[Math.floor(Math.random() * answers.length)]}`)] });
  }

  if (commandName === "roll") {
    const sides = interaction.options.getInteger("sides") ?? 6;
    const result = Math.floor(Math.random() * sides) + 1;
    return interaction.reply({ embeds: [makeEmbed("Dice Roll", `You rolled **${result}** on a d${sides}.`)] });
  }

  if (commandName === "choose") {
    const first = interaction.options.getString("option1", true);
    const second = interaction.options.getString("option2", true);
    const choice = Math.random() < 0.5 ? first : second;
    return interaction.reply({ embeds: [makeEmbed("The Choice Is...", `I choose **${choice}**.`)] });
  }

  if (commandName === "slowmode") {
    const seconds = interaction.options.getInteger("seconds", true);
    if (!interaction.channel || !("setRateLimitPerUser" in interaction.channel)) {
      return interaction.reply({ content: "Slowmode cannot be configured in this channel.", ephemeral: true });
    }
    await interaction.channel.setRateLimitPerUser(seconds, `Changed by ${interaction.user.tag}`);
    return interaction.reply({ content: seconds === 0 ? "Slowmode disabled." : `Slowmode set to **${seconds} seconds**.` });
  }

  if (commandName === "lock" || commandName === "unlock") {
    const everyone = guild.roles.everyone;
    const locked = commandName === "lock";
    await interaction.channel.permissionOverwrites.edit(everyone, {
      SendMessages: locked ? false : null
    }, { reason: `${locked ? "Channel locked" : "Channel unlocked"} by ${interaction.user.tag}` });
    return interaction.reply({ content: locked ? "Channel locked for @everyone." : "Channel unlocked for @everyone." });
  }

  if (commandName === "nickname") {
    const user = interaction.options.getUser("user", true);
    const name = interaction.options.getString("name");
    const target = await guild.members.fetch(user.id).catch(() => null);
    if (!target) return interaction.reply({ content: "That member is not in this server.", ephemeral: true });
    if (target.id === guild.ownerId || (!member.permissions.has(PermissionFlagsBits.Administrator) && member.roles.highest.comparePositionTo(target.roles.highest) <= 0)) {
      return interaction.reply({ content: "You cannot change that member's nickname because of role hierarchy.", ephemeral: true });
    }
    if (!target.manageable) return interaction.reply({ content: "My role is not high enough to change that nickname.", ephemeral: true });
    await target.setNickname(name || null, `Changed by ${interaction.user.tag}`);
    return interaction.reply({ content: name ? `Changed **${user.tag}**'s nickname to **${name}**.` : `Cleared **${user.tag}**'s nickname.` });
  }

  if (commandName === "role") {
    const subcommand = interaction.options.getSubcommand();
    const user = interaction.options.getUser("user", true);
    const role = interaction.options.getRole("role", true);
    const target = await guild.members.fetch(user.id).catch(() => null);
    if (!target) return interaction.reply({ content: "That member is not in this server.", ephemeral: true });
    if (role.managed || role.id === guild.id || role.position >= guild.members.me.roles.highest.position) {
      return interaction.reply({ content: "I cannot manage that role. Move my bot role above it and choose a non-managed role.", ephemeral: true });
    }
    if (!member.permissions.has(PermissionFlagsBits.Administrator) && (role.position >= member.roles.highest.position || target.roles.highest.position >= member.roles.highest.position)) {
      return interaction.reply({ content: "Your highest role must be above both the target member and the role.", ephemeral: true });
    }
    if (!target.manageable) return interaction.reply({ content: "I cannot manage that member because of role hierarchy.", ephemeral: true });
    if (subcommand === "add") {
      await target.roles.add(role, `Added by ${interaction.user.tag}`);
      return interaction.reply({ content: `Added ${role} to **${user.tag}**.` });
    }
    await target.roles.remove(role, `Removed by ${interaction.user.tag}`);
    return interaction.reply({ content: `Removed ${role} from **${user.tag}**.` });
  }

  if (commandName === "poll") {
    const question = interaction.options.getString("question", true);
    const first = interaction.options.getString("option1", true);
    const second = interaction.options.getString("option2", true);
    const message = await interaction.channel.send({
      embeds: [makeEmbed(`Poll: ${question}`, `🇦 **${first}**\n🇧 **${second}**\n\nReact below to vote!`)]
    });
    await message.react("🇦");
    await message.react("🇧");
    return interaction.reply({ content: `Poll created: ${message.url}`, ephemeral: true });
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

export { sendLog, makeEmbed };
