const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Replies with Pong or shows a failure message.')
    .addBooleanOption(option =>
      option
        .setName('fail')
        .setDescription('Trigger a failure response (for testing)')
        .setRequired(false)
    ),

  async execute(interaction) {
    const shouldFail = interaction.options.getBoolean('fail');

    if (shouldFail) {
      const failEmbed = new EmbedBuilder()
        .setColor(0xff0000)
        .setTitle(`<:fail:1394433138809376778> Failed!`)
        .setDescription('This is a simulated failure response.')
        .setFooter({ text: 'Try again later.' });

      await interaction.reply({ embeds: [failEmbed], ephemeral: true });
    } else {
      const pingEmbed = new EmbedBuilder()
        .setColor(0x00ffcc)
        .setTitle(`<:success:1394433498353504346> Pong!`)
        .setDescription(`Latency: ${interaction.client.ws.ping}ms`)
        .setFooter({ text: 'Everything looks good!' });

      await interaction.reply({ embeds: [pingEmbed] });
    }
  },
};