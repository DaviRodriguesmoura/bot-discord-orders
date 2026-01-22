const express = require("express");
const { Client, GatewayIntentBits, Collection } = require("discord.js");
const fg = require("fast-glob");
const { api, db } = require("./@shared");

const config = {
  token: process.env.DISCORD_TOKEN,
  apiKey: process.env.MGNEX_API_KEY,
  guildId: process.env.DISCORD_GUILD_ID,
  categoryId: process.env.DISCORD_CATEGORY_ID,
};

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessageReactions
  ],
});

const commandContainer = new Collection();

/* ====== COMMANDS ====== */
fg.sync("commands/**/*.js").forEach(file => {
  const command = require(`./${file}`);
  commandContainer.set(command.options.name, command);
});

/* ====== EVENTS ====== */
fg.sync("events/**/*.js").forEach(file => {
  const event = require(`./${file}`);
  client.on(event.type, (...args) => event.execute(...args, client));
});

/* ====== WORKERS ====== */
fg.sync("workers/**/*.js").forEach(file => {
  const worker = require(`./${file}`);
  worker.execute(client);
});

/* ====== INTERACTIONS ====== */
client.on("interactionCreate", interaction => {
  if (!interaction.isChatInputCommand()) return;
  const command = commandContainer.get(interaction.commandName);
  if (command) command.execute(interaction);
});

/* ====== READY ====== */
client.once("ready", async () => {
  console.log(`🤖 Bot conectado: ${client.user.tag}`);

  try {
    const req = await api.get("/open-api/store");
    db.set("store", req.data.store);

    console.log(`🏪 Loja conectada: ${req.data.store.settings.title}`);
    console.log(`🌐 URL da loja: ${req.data.store.url}`);

    const guild = await client.guilds.fetch(config.guildId);
    console.log(`✅ Servidor conectado: ${guild.name}`);

    await guild.channels.fetch(config.categoryId);

    await client.application.commands.set(
      commandContainer.map(cmd => cmd.options)
    );

  } catch (err) {
    console.error("❌ Erro ao conectar loja ou servidor:", err.message);
  }
});

/* ====== LOGIN ====== */
client.login(config.token).catch(err => {
  console.error("❌ Erro ao logar o bot:", err.message);
});

/* ====== WEB SERVER (OBRIGATÓRIO NO RAILWAY) ====== */
const app = express();
const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
  res.send("🚀 Bot Dev Store Online");
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`🌐 Web server rodando na porta ${PORT}`);
});
