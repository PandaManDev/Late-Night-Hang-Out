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
    GatewayIntentBits.GuildMembers
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

client.on("error", error => console.error("Discord client error:", error));
process.on("unhandledRejection", error => console.error("Unhandled promise rejection:", error));

try {
  await registerCommands();
  await client.login(token);
} catch (error) {
  console.error("Bot startup failed:", error);
  process.exit(1);
}
