const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("loja")
    .setDescription("Ver produtos disponíveis"),

  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setTitle("🛍️ Dev Store")
      .setDescription(
        "✨ Créditos Lovable.dev disponíveis\n\n" +
        "✅ Ativação imediata\n" +
        "⚡ Entrega rápida\n" +
        "💬 Suporte via WhatsApp\n\n" +
        "👉 **Fale conosco:**\n" +
        "📲 https://wa.me/556181203599"
      )
      .setColor(0x7c3aed)
      .setFooter({ text: "Dev Store • Compra segura" });

    await interaction.reply({ embeds: [embed] });
  }
};
