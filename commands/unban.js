const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
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
    .setName('unban')
    .setDescription('Unban a user from the server.')
    .addUserOption(option => option.setName('target').setDescription('User to unban').setRequired(true))
    .addStringOption(option => option.setName('reason').setDescription('Reason for unban').setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),

  async execute(interaction) {
    const target = interaction.options.getUser('target');
    const reason = interaction.options.getString('reason') || 'No reason provided';

    // Check if user is banned
    const bans = await interaction.guild.bans.fetch();
    if (!bans.has(target.id)) {
      return interaction.reply({ content: `❌ User **${target.tag}** is not banned.`, ephemeral: true });
    }

    const caseId = logCase({
  type: 'unban',
  user: `${targetUser.username}#${targetUser.discriminator}`,
  userId: targetUser.id,
  moderator: interaction.user.tag,
  moderatorId: interaction.user.id,
  reason,
  guildId: interaction.guild.id,
  timestamp: new Date().toISOString()
});


    try {
      await target.send({
        embeds: [
          new EmbedBuilder()
            .setTitle('✅ You have been unbanned')
            .setColor('#77DD77')
            .addFields(
              { name: 'Server', value: interaction.guild.name, inline: true },
              { name: 'Reason', value: reason }
            )
            .setFooter({ text: `Case ID: ${caseId}` })
        ]
      });
    } catch {
      console.log(`❌ Could not DM unbanned user ${target.tag}`);
    }

    await interaction.guild.members.unban(target, reason);

    const successEmbed = new EmbedBuilder()
      .setColor('#77DD77')
      .setTitle('✅ User Unbanned')
      .setDescription(`Successfully unbanned **${target.tag}**.\nReason: ${reason}`)
      .setFooter({ text: `Zivv | Case ID: ${caseId}`, iconURL: 'https://cdn.discordapp.com/emojis/1394428781279580322.webp' });

    await interaction.reply({ embeds: [successEmbed] });
  }
};
