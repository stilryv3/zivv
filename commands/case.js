const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

const casesPath = path.join(__dirname, '..', 'database', 'mod-cases.json');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('case')
    .setDescription('Look up a moderation case by its ID.')
    .addStringOption(option => 
      option.setName('id')
        .setDescription('Case ID to look up')
        .setRequired(true)
    ),

  async execute(interaction) {
    const caseId = interaction.options.getString('id');
    if (!fs.existsSync(casesPath)) {
      return interaction.reply({ content: 'No cases logged yet.', ephemeral: true });
    }

    const casesData = JSON.parse(fs.readFileSync(casesPath));

    // Find case matching ID and guild
    const modCase = casesData.find(c => c.id === caseId && c.guildId === interaction.guild.id);

    if (!modCase) {
      return interaction.reply({ content: `❌ Case \`${caseId}\` not found in this server.`, ephemeral: true });
    }

    const embed = new EmbedBuilder()
      .setTitle(`🗂️ Case ${modCase.id} (${modCase.type.toUpperCase()})`)
      .setColor('#FFD1DC')
      .addFields(
        { name: 'User', value: modCase.user ? modCase.user : modCase.userId, inline: true },
        { name: 'Moderator', value: modCase.moderator, inline: true },
        { name: 'Reason', value: modCase.reason || 'No reason provided' }
      )
      .setFooter({ text: `Logged on: ${new Date(modCase.timestamp).toLocaleString()}` });

    // Add optional fields for mute duration, etc
    if (modCase.durationMinutes) {
      embed.addFields({ name: 'Duration', value: `${modCase.durationMinutes} minutes`, inline: true });
    }

    await interaction.reply({ embeds: [embed] });
  }
};
