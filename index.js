const fs = require('fs');
const path = require('path');
const { Client, Collection, GatewayIntentBits, Partials } = require('discord.js');
require('dotenv').config();

const { quoteHandler, purgeServerQuoteImages, loadQuoteLog } = require('./quote');

const prefix = '~';
console.log('____  ______  __  __     ___   __  __')
console.log('|__     | |   | | | |   |   |  \ \/ /')
console.log(' _ |    | |   | | | |_  |  _/   | |')
console.log('|__|    | |   | | |___| |  \    | |')
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
  partials: [Partials.Message, Partials.Channel, Partials.User],
});

client.commands = new Collection();

// Load slash command files
const commandFiles = fs.readdirSync(path.join(__dirname, 'commands')).filter(file => file.endsWith('.js'));
for (const file of commandFiles) {
  const command = require(`./commands/${file}`);
  if (command.data && command.execute) {
    client.commands.set(command.data.name, command);
  } else {
    console.warn(`[WARN] Skipping ${file} — missing data or execute`);
  }
}

client.once('ready', () => {
  console.log(`✅ Logged in as ${client.user.tag}`);

  // Cleanup expired quotes every hour
  setInterval(() => {
    console.log('🧹 Checking for expired quotes...');
    loadQuoteLog(); // triggers auto-cleanup inside quote module
  }, 60 * 60 * 1000);
});

// Slash command interaction handling
client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;

  const command = client.commands.get(interaction.commandName);
  if (!command) {
    return interaction.reply({ content: '❌ Command not found.', ephemeral: true });
  }

  try {
    await command.execute(interaction);
  } catch (error) {
    console.error(error);
    interaction.reply({ content: '❌ There was an error executing this command.', ephemeral: true });
  }
});

// Prefix-based command fallback & quote handling (merged to single event)
client.on('messageCreate', async (msg) => {
  if (msg.author.bot) return;
  if (!msg.content) return;

  if (!msg.content.toLowerCase().startsWith(prefix)) return;

  const args = msg.content.slice(prefix.length).trim().split(/\s+/);
  const cmd = args.shift().toLowerCase();

  if (cmd === 'quote') {
    // quoteHandler expects (message, args)
    return quoteHandler(msg, args);
  }

  if (cmd === 'purgequotes') {
    return purgeServerQuoteImages(msg);
  }

  // Fallback to simulate slash command from prefix commands
  const slashCmd = client.commands.get(cmd);
  if (!slashCmd) return;

  try {
    const fakeInteraction = {
      user: msg.author,
      member: msg.member,
      channel: msg.channel,
      guild: msg.guild,
      client: client,
      reply: (options) => msg.reply(options),
      deferReply: () => Promise.resolve(),
      followUp: (options) => msg.channel.send(options),
      editReply: (options) => msg.channel.send(options),
      options: {
        getString: (name) => {
          const index = slashCmd.data.options?.findIndex(opt => opt.name === name);
          return index >= 0 ? args[index] : null;
        },
        getInteger: (name) => {
          const val = fakeInteraction.options.getString(name);
          return val ? parseInt(val, 10) : null;
        },
        getUser: () => msg.mentions.users.first() || msg.author,
        getBoolean: () => null,
      }
    };

    await slashCmd.execute(fakeInteraction);
  } catch (err) {
    console.error(err);
    msg.reply('❌ Error running this command.');
  }
});

client.login(process.env.token);
