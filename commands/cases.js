const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const fs = require('fs');
const path = require('path');

const casesFilePath = path.join(__dirname, '..', 'database', 'mod-cases.json');
const PAGE_SIZE = 10;

module.exports = {
  data: new SlashCommandBuilder()
    .setName('cases')
    .setDescription('List all moderation cases in this server'),

  async execute(interaction) {
    await interaction.deferReply();

    if (!interaction.guild) {
      return interaction.editReply('❌ This command can only be used in a server.');
    }

    // Load all cases
    let allCases = [];
    try {
      if (fs.existsSync(casesFilePath)) {
        const raw = fs.readFileSync(casesFilePath, 'utf-8');
        allCases = JSON.parse(raw);
      }
    } catch (error) {
      console.error('Error reading cases file:', error);
      return interaction.editReply('❌ Failed to load cases.');
    }

    // Filter cases for this guild
    const guildCases = allCases.filter(c => c.guildId === interaction.guild.id);

    if (guildCases.length === 0) {
      return interaction.editReply('⚠️ No moderation cases found in this server.');
    }

    // Pagination state
    let page = 0;
    const totalPages = Math.ceil(guildCases.length / PAGE_SIZE);

    const generateEmbed = (pageIndex) => {
      const embed = new EmbedBuilder()
        .setTitle(`Moderation Cases for ${interaction.guild.name}`)
        .setColor('Blurple')
        .setFooter({ text: `Requested by ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() })
        .setTimestamp();

      const casesToShow = guildCases.slice(pageIndex * PAGE_SIZE, (pageIndex + 1) * PAGE_SIZE);
      embed.setDescription(
        casesToShow.map(c =>
          `**Case #${c.id}** - \`${c.type}\`\n` +
          `User: ${c.user} (${c.userId})\n` +
          `Moderator: ${c.moderator} (${c.moderatorId})\n` +
          `Reason: ${c.reason}\n` +
          `Date: <t:${Math.floor(new Date(c.timestamp).getTime() / 1000)}:F>`
        ).join('\n\n')
      );

      embed.setFooter({ text: `Page ${pageIndex + 1} / ${totalPages}` });
      return embed;
    };

    const generateButtons = (pageIndex) => {
      return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('prev')
          .setLabel('Previous')
          .setStyle(ButtonStyle.Primary)
          .setDisabled(pageIndex === 0),
        new ButtonBuilder()
          .setCustomId('next')
          .setLabel('Next')
          .setStyle(ButtonStyle.Primary)
          .setDisabled(pageIndex === totalPages - 1),
      );
    };

    const message = await interaction.editReply({
      embeds: [generateEmbed(page)],
      components: [generateButtons(page)]
    });

    const collector = message.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 120000 // 2 minutes
    });

    collector.on('collect', async i => {
      if (i.user.id !== interaction.user.id) {
        return i.reply({ content: '❌ These buttons aren\'t for you!', ephemeral: true });
      }

      if (i.customId === 'prev' && page > 0) {
        page--;
      } else if (i.customId === 'next' && page < totalPages - 1) {
        page++;
      }

      await i.update({
        embeds: [generateEmbed(page)],
        components: [generateButtons(page)]
      });
    });

    collector.on('end', async () => {
      // Disable buttons after timeout
      if (message.editable) {
        await message.edit({
          components: [
            new ActionRowBuilder().addComponents(
              new ButtonBuilder().setCustomId('prev').setLabel('Previous').setStyle(ButtonStyle.Primary).setDisabled(true),
              new ButtonBuilder().setCustomId('next').setLabel('Next').setStyle(ButtonStyle.Primary).setDisabled(true),
            )
          ]
        });
      }
    });
  }
};
