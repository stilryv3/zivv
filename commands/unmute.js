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
    .setName('unmute')
    .setDescription('Remove timeout (mute) from a member')
    .addUserOption(option => option.setName('target').setDescription('Member to unmute').setRequired(true)),

  async execute(interaction) {
    const member = interaction.options.getMember('target');

    if (!interaction.member.permissions.has('ModerateMembers')) {
      return interaction.reply({ content: '❌ You do not have permission to unmute members.', ephemeral: true });
    }

    if (!member.moderatable) {
      return interaction.reply({ content: '❌ I cannot unmute this member.', ephemeral: true });
    }

    await member.timeout(null);

    const caseId = logCase({
  type: 'unmute',
  user: target.user.tag,
  userId: target.id,
  moderator: interaction.user.tag,
  moderatorId: interaction.user.id,
  reason,
  guildId: interaction.guild.id,
  timestamp: new Date().toISOString()
});


    try {
      await member.send({
        embeds: [
          new EmbedBuilder()
            .setTitle('🔈 You have been unmuted')
            .setColor('#FFD1DC')
            .addFields(
              { name: 'Server', value: interaction.guild.name, inline: true },
              { name: 'Moderator', value: interaction.user.tag }
            )
            .setFooter({ text: `Case ID: ${caseId}` })
        ]
      });
    } catch {
      console.log(`❌ Could not DM unmuted user ${member.user.tag}`);
    }

    const embed = new EmbedBuilder()
      .setTitle('✅ Member Unmuted')
      .setColor('#FFD1DC')
      .addFields(
        { name: 'Member', value: member.user.tag, inline: true },
        { name: 'Moderator', value: interaction.user.tag, inline: true }
      )
      .setFooter({ text: `Zivv | Case ID: ${caseId}`, iconURL: 'https://cdn.discordapp.com/emojis/1394428781279580322.webp' });

    await interaction.reply({ embeds: [embed] });
  }
};
