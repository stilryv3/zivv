const fs = require('fs');
const path = require('path');
const { REST, Routes } = require('discord.js');
require('dotenv').config();

const commands = [];

const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
  const command = require(path.join(commandsPath, file));
  if (command.data && command.execute) {
    commands.push(command.data.toJSON());
  }
}

const rest = new REST({ version: '10' }).setToken(process.env.token);

(async () => {
  try {
    console.log('🔁 Refreshing global application (/) commands...');

    await rest.put(
      Routes.applicationCommands(process.env.client), // Your bot's client ID
      { body: commands }
    );

    console.log('✅ Successfully reloaded application commands.');
  } catch (error) {
    console.error('❌ Failed to reload commands:', error);
  }
})();