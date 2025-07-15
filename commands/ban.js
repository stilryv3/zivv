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
    .setName('ban')
    .setDescription('Ban a user from the server.')
    .addUserOption(option => option.setName('target').setDescription('User to ban').setRequired(true))
    .addStringOption(option => option.setName('reason').setDescription('Reason for ban').setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),

  async execute(interaction) {
    const target = interaction.options.getUser('target');
    const member = interaction.guild.members.cache.get(target.id);
    const reason = interaction.options.getString('reason') || 'No reason provided';

    if (!member || !member.bannable) {
      const failEmbed = new EmbedBuilder()
        .setColor('#FFB6C1')
        .setTitle('❌ Cannot Ban User')
        .setDescription(`I cannot ban **${target.tag}**.`)
        .setFooter({ text: 'Zivv', iconURL: 'https://cdn.discordapp.com/emojis/1394428781279580322.webp' });
      return interaction.reply({ embeds: [failEmbed], ephemeral: true });
    }

    const caseId = logCase({
  type: 'ban',
  user: target.user.tag,
  userId: target.id,
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
            .setTitle('🔨 You have been banned')
            .setColor('#FFB6C1')
            .addFields(
              { name: 'Server', value: interaction.guild.name, inline: true },
              { name: 'Reason', value: reason }
            )
            .setFooter({ text: `Case ID: ${caseId}` })
        ]
      });
    } catch {
      console.log(`❌ Could not DM banned user ${target.tag}`);
    }

    await member.ban({ reason });

    const successEmbed = new EmbedBuilder()
      .setColor('#77DD77')
      .setTitle('✅ User Banned')
      .setDescription(`Successfully banned **${target.tag}**.\nReason: ${reason}`)
      .setFooter({ text: `Zivv | Case ID: ${caseId}`, iconURL: 'https://cdn.discordapp.com/emojis/1394428781279580322.webp' });

    await interaction.reply({ embeds: [successEmbed] });
  }
};