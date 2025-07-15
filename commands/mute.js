const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const logCase = require('../utils/logCase');

function generateCaseID(length = 6) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let id = '';
  for (let i = 0; i < length; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return id;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('mute')
    .setDescription('Timeout a member (mute) for a duration')
    .addUserOption(option => option.setName('target').setDescription('Member to mute').setRequired(true))
    .addIntegerOption(option => option.setName('duration').setDescription('Duration in minutes').setRequired(true))
    .addStringOption(option => option.setName('reason').setDescription('Reason for mute').setRequired(false)),

  async execute(interaction) {
    const member = interaction.options.getMember('target');
    const duration = interaction.options.getInteger('duration');
    const reason = interaction.options.getString('reason') || 'No reason provided';

    if (!interaction.member.permissions.has('ModerateMembers')) {
      return interaction.reply({ content: '❌ You do not have permission to mute members.', ephemeral: true });
    }

    if (!member.moderatable) {
      return interaction.reply({ content: '❌ I cannot mute this member.', ephemeral: true });
    }

    const timeoutDuration = duration * 60 * 1000;

    await member.timeout(timeoutDuration, reason);

    const caseId = logCase({
    type: 'mute',
    user: member.user.tag,
    userId: member.id,
    moderator: interaction.user.tag,
    moderatorId: interaction.user.id,
    reason,
    durationMinutes: duration,
    guildId: interaction.guild.id,
    timestamp: new Date().toISOString()
});


    try {
      await member.send({
        embeds: [
          new EmbedBuilder()
            .setTitle('🔇 You have been muted')
            .setColor('#FFD1DC')
            .addFields(
              { name: 'Server', value: interaction.guild.name, inline: true },
              { name: 'Duration', value: `${duration} minutes`, inline: true },
              { name: 'Reason', value: reason }
            )
            .setFooter({ text: `Case ID: ${caseId}` })
        ]
      });
    } catch {
      console.log(`❌ Could not DM muted user ${member.user.tag}`);
    }

    const embed = new EmbedBuilder()
      .setTitle('✅ Member Muted')
      .setColor('#FFD1DC')
      .addFields(
        { name: 'Member', value: member.user.tag, inline: true },
        { name: 'Moderator', value: interaction.user.tag, inline: true },
        { name: 'Duration', value: `${duration} minutes`, inline: true },
        { name: 'Reason', value: reason }
      )
      .setFooter({ text: `Zivv | Case ID: ${caseId}`, iconURL: 'https://cdn.discordapp.com/emojis/1394428781279580322.webp' });

    await interaction.reply({ embeds: [embed] });
  }
};