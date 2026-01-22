const { Client, GatewayIntentBits, Collection } = require("discord.js");
const express = require("express");
const fs = require("fs");
const path = require("path");
const logger = require("./utils/logger");

/* ===== CLIENT ===== */
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

client.commands = new Collection();

/* ===== LOAD COMMANDS ===== */
const commandsPath = path.join(__dirname, "commands");
fs.readdirSync(commandsPath).forEach(file => {
  const command = require(`./commands/${file}`);
  client.commands.set(command.data.name, command);
});

/* ===== LOAD EVENTS ===== */
const eventsPath = path.join(__dirname, "events");
fs.readdirSync(eventsPath).forEach(file => {
  const event = require(`./events/${file}`);
  if (event.once) {
    client.once(event.name, (...args) => event.execute(...args, client));
  } else {
    client.on(event.name, (...args) => event.execute(...args, client));
  }
});

/* ===== INTERACTIONS ===== */
client.on("interactionCreate", async interaction => {
  if (!interaction.isChatInputCommand()) return;

  const command = client.commands.get(interaction.commandName);
  if (!command) return;

  try {
    await command.execute(interaction);
  } catch (err) {
    logger.error(err);
    if (interaction.replied || interaction.deferred) return;
    interaction.reply({ content: "❌ Erro ao executar o comando.", ephemeral: true });
  }
});

/* ===== LOGIN ===== */
client.login(process.env.DISCORD_TOKEN).catch(err => {
  logger.error("Token inválido ou erro ao logar.");
  console.error(err);
});

/* ===== WEB SERVER (RAILWAY SAFE) ===== */
const app = express();
const PORT = process.env.PORT || 3000;

app.get("/", (_, res) => {
  res.send("🚀 Bot Dev Store Online");
});

app.listen(PORT, "0.0.0.0", () => {
  logger.info(`Web server ativo na porta ${PORT}`);
});
