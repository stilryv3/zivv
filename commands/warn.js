const { SlashCommandBuilder } = require('discord.js');
const { logCase } = require('../utils/logCase.js'); // adjust path

module.exports = {
  data: new SlashCommandBuilder()
    .setName('warn')
    .setDescription('Warn a user.')
    .addUserOption(option =>
      option.setName('target')
        .setDescription('The user to warn')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('reason')
        .setDescription('Reason for the warning')
        .setRequired(false)),

  async execute(interaction) {
    const target = interaction.options.getUser('target');
    const reason = interaction.options.getString('reason') || 'No reason provided';

    if (!interaction.member.permissions.has('ModerateMembers')) {
      return interaction.reply({ content: '❌ You do not have permission to warn members.', ephemeral: true });
    }

    // Log the warning
    const caseId = logCase({
      type: 'warn',
      user: target.tag,
      userId: target.id,
      moderator: interaction.user.tag,
      moderatorId: interaction.user.id,
      reason,
      guildId: interaction.guild.id,
      timestamp: new Date().toISOString()
    });

    // Try to DM the user
    try {
      await target.send(`⚠️ You have been warned in **${interaction.guild.name}**.\nReason: ${reason}\nCase ID: ${caseId}`);
    } catch {
      // DM failed (probably closed DMs)
      await interaction.reply({ content: `⚠️ Warned ${target.tag}, but couldn't DM them.\nCase ID: ${caseId}`, ephemeral: true });
      return;
    }

    // Confirm to moderator
    await interaction.reply(`⚠️ Warned ${target.tag}.\nCase ID: ${caseId}\nReason: ${reason}`);
  }
};
