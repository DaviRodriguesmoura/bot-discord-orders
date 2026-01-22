const { Client } = require("discord.js");
const Discord = require("discord.js");
const config = {
  token: process.env.DISCORD_TOKEN,
  apiKey: process.env.MGNEX_API_KEY,
  guildId: process.env.DISCORD_GUILD_ID,
  categoryId: process.env.DISCORD_CATEGORY_ID,
  // Mantenha os emojis e métodos de pagamento se eles estiverem no config.json original
  emojis: {
    paymentMethods: {
      PIX: "💸",
      MERCADO_PAGO: "🎁",
      STRIPE: "💳"
    }
  }
};
const fg = require("fast-glob");
const { api, db } = require("./@shared");

const client = new Client({
    intents: [
        Discord.GatewayIntentBits.Guilds,
        Discord.GatewayIntentBits.GuildMessages,
        Discord.GatewayIntentBits.MessageContent,
        Discord.GatewayIntentBits.GuildMembers,
        Discord.GatewayIntentBits.GuildMessageReactions,
        "32767",
    ],
});

const commandContainer = new Discord.Collection();
fg.sync("commands/**/*.js").map((file) => {
    const command = require(`./${file}`);
    commandContainer.set(command.options.name, command);
});

fg.sync("events/**/*.js").map((file) => {
    const event = require(`./${file}`);

    client.on(event.type, (...args) => event.execute(...args, client));
});

fg.sync("workers/**/*.js").map((file) => {
    const worker = require(`./${file}`);

    worker.execute(client);
});

client.on("interactionCreate", (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    const command = commandContainer.get(interaction.commandName);
    command.execute(interaction);
});

const logger = {
    error: function (...args) {
        return console.error("[❌ ERRO]", ...args);
    },
    info: function (...args) {
        return console.info("[💜 INFO]", ...args);
    },
    warn: function (...args) {
        return console.warn("[🟡 IMPORTANTE]", ...args);
    },
};

(async () => {
    try {
        const req = await api.get("/open-api/store");

        db.set("store", req.data.store);

        client.on("clientReady", () => {
            logger.info(`Bot conectado: ${client.user.displayName}`);
            logger.info(`Loja conectada: ${req.data.store.settings.title}`);
            logger.info(`URL da loja: ${req.data.store.url}`);

            client.guilds
                .fetch(config.guildId)
                .catch(() => {
                    logger.error(`O servidor (${config.guildId}) não foi encontrado neste bot.`);
                    process.exit(1);
                })
                .then((guild) => {
                    logger.info(`Servidor conectado: ${guild.name}`);
                    guild.channels.fetch(config.categoryId).catch(() => {
                        logger.error(
                            `A categoria do carrinho (${config.categoryId}) não foi encontrado no servidor (${guild.name}).`
                        );
                        process.exit(1);
                    });
                });

            client.application.commands.set(
                commandContainer.map((command) => {
                    return command.options;
                })
            );
        });

        client.login(config.token).catch((err) => {
            if (err?.name?.includes("TokenInvalid")) return logger.error("A token do bot está inválida");
            if (err?.message?.includes("Used disallowed intents"))
                return logger.error(
                    "Você precisa habilitar as permissões de itents: Presence Intent, Server Members Intent, Message Content Intent"
                );
            return logger.error(err?.message);
        });
    } catch (error) {
        logger.error("A chave de acesso da API mginex está inválida, siga o tutorial: https://www.youtube.com/@mginex");
    }
})();
