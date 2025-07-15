const fs = require('fs');
const path = require('path');
const Canvas = require('canvas');
const { AttachmentBuilder } = require('discord.js');
const EXPIRATION_HOURS = 12;
const EXPIRATION_MS = EXPIRATION_HOURS * 60 * 60 * 1000;

const quoteLogPath = path.join(__dirname, 'database', 'quoteLog.json');

// Helper to load or create quote log file
function loadQuoteLog() {
  if (!fs.existsSync(quoteLogPath)) {
    fs.writeFileSync(quoteLogPath, '[]');
  }

  let log = JSON.parse(fs.readFileSync(quoteLogPath, 'utf-8'));

  // ✅ Clean expired entries automatically
  return cleanExpiredQuotes(log);
}


function saveQuoteLog(log) {
  fs.writeFileSync(quoteLogPath, JSON.stringify(log, null, 2));
}

// Create the quote image from a quote object or Discord message
async function createQuoteImage(quote) {
  // quote can be either:
  // - a Discord Message (when quoting a replied message), or
  // - an object from quoteLog.json (when fetching by id or random)

  // Normalize fields for either case
  const avatarURL = quote.avatarURL || (quote.author?.displayAvatarURL ? quote.author.displayAvatarURL({ extension: 'png', size: 256 }) : '');
  const displayName = quote.displayName || quote.authorName || (quote.member?.displayName) || (quote.author?.username) || 'Unknown';
  const username = quote.username || (quote.author ? `${quote.author.username}#${quote.author.discriminator}` : 'Unknown#0000');
  const content = quote.content || '[embed/attachment message]';
  const createdAt = quote.quotedAt ? new Date(quote.quotedAt) : quote.createdAt || new Date();

  const width = 900;
  const height = 280;
  const canvas = Canvas.createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // Background
  ctx.fillStyle = '#fef8ff';
  ctx.fillRect(0, 0, width, height);

  // Left gradient
  const gradient = ctx.createLinearGradient(0, 0, 250, 0);
  gradient.addColorStop(0, '#e694ff');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 250, height);

  // Rounded rectangle function for older canvas versions
  if (typeof ctx.roundRect !== 'function') {
    Canvas.CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, r) {
      if (w < 2 * r) r = w / 2;
      if (h < 2 * r) r = h / 2;
      this.beginPath();
      this.moveTo(x + r, y);
      this.arcTo(x + w, y, x + w, y + h, r);
      this.arcTo(x + w, y + h, x, y + h, r);
      this.arcTo(x, y + h, x, y, r);
      this.arcTo(x, y, x + w, y, r);
      this.closePath();
      return this;
    };
  }
  ctx.strokeStyle = '#e6baff';
  ctx.lineWidth = 4;
  ctx.roundRect(10, 10, width - 20, height - 20, 30);
  ctx.stroke();

  // Load and draw avatar circle
  try {
    const avatar = await Canvas.loadImage(avatarURL);
    ctx.save();
    ctx.beginPath();
    ctx.arc(125, height / 2, 80, 0, Math.PI * 2, true);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(avatar, 45, height / 2 - 80, 160, 160);
    ctx.restore();
  } catch {
    // If avatar loading fails, skip avatar
  }

  // Draw display name
  ctx.fillStyle = '#333';
  ctx.font = 'bold 30px Sans-serif';
  ctx.fillText(displayName, 250, 60);

  // Draw username
  ctx.font = '20px Sans-serif';
  ctx.fillStyle = '#777';
  ctx.fillText(username, 250, 95);

  // Draw time
  const time = createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  ctx.font = '18px Sans-serif';
  ctx.fillStyle = '#aaa';
  ctx.fillText(time, 250, 120);

  // Draw content with word wrap
  ctx.font = '22px Sans-serif';
  ctx.fillStyle = '#444';
  const words = content.split(' ');
  let line = '';
  let y = 140;
  const maxWidth = 600;

  for (const word of words) {
    const testLine = line + word + ' ';
    const testWidth = ctx.measureText(testLine).width;
    if (testWidth > maxWidth) {
      ctx.fillText(line, 250, y);
      line = word + ' ';
      y += 32;
    } else {
      line = testLine;
    }
  }
  ctx.fillText(line, 250, y);
  
if (quote.imageURL) {
  try {
    const img = await Canvas.loadImage(quote.imageURL);
    const maxWidth = 200;
const maxHeight = 200;

const aspectRatio = img.width / img.height;

let drawWidth = maxWidth;
let drawHeight = maxHeight;

if (aspectRatio > 1) {
  // Wide image
  drawHeight = maxWidth / aspectRatio;
} else {
  // Tall image
  drawWidth = maxHeight * aspectRatio;
}

// Draw the image bottom-right corner
ctx.drawImage(
  img,
  width - drawWidth - 30,
  height - drawHeight - 30,
  drawWidth,
  drawHeight
);

  } catch (err) {
    console.warn('Failed to load image attachment:', err.message);
  }
}

  return canvas.toBuffer('image/png');
}

// Main quote handler
async function quoteHandler(message) {
  const prefix = '~';
  if (!message.content.toLowerCase().startsWith(prefix + 'quote')) return;

  const args = message.content.trim().split(/\s+/).slice(1);

  let quoteLog = loadQuoteLog();

  if (args.length === 0) {
    // Case: ~quote (quote replied message)
    if (!message.reference) {
  return message.reply('❌ You need to reply to a message with `~quote` to quote it.');
}

try {
  const channel = await message.client.channels.fetch(message.reference.channelId);
  const original = await channel.messages.fetch(message.reference.messageId);

  const imageURL = original.attachments.size > 0 ? original.attachments.first().url : null;

  const buffer = await createQuoteImage({
    ...original,
    imageURL
  });

  const id = quoteLog.length ? quoteLog[quoteLog.length - 1].id + 1 : 1;
  const fileName = `quote-${id}.png`;
  const filePath = path.join(__dirname, 'database', fileName);

  fs.writeFileSync(filePath, buffer);

  quoteLog.push({
    id,
    authorId: original.author.id,
    authorName: original.member?.displayName || original.author.username,
    username: `${original.author.username}#${original.author.discriminator}`,
    avatarURL: original.author.displayAvatarURL({ extension: 'png', size: 256 }),
    displayName: original.member?.displayName || original.author.username,
    content: original.content || '[embed/attachment message]',
    quotedAt: original.createdAt.toISOString(),
    fileName,
    guildId: message.guild.id,
    imageURL
  });

  saveQuoteLog(quoteLog);

  const attachment = new AttachmentBuilder(buffer, { name: fileName });
  await message.channel.send({ files: [attachment] });
} catch (error) {
  console.error('Quote creation error:', error);
  message.reply('❌ Something went wrong while creating the quote.');
}

  } else if (args[0].toLowerCase() === 'random') {
    // Case: ~quote random
    if (quoteLog.length === 0) return message.reply('❌ No quotes have been logged yet.');

    const randomQuote = quoteLog[Math.floor(Math.random() * quoteLog.length)];

    try {
      const buffer = await createQuoteImage(randomQuote);
      const attachment = new AttachmentBuilder(buffer, { name: `quote-random-${randomQuote.id}.png` });
      await message.channel.send({ files: [attachment] });
    } catch (error) {
      console.error('Random quote error:', error);
      message.reply('❌ Something went wrong fetching a random quote.');
    }
  } else {
    // Case: ~quote <id>
    const id = parseInt(args[0], 10);
    if (isNaN(id)) {
      return message.reply('❌ Invalid quote ID.');
    }

    const quote = quoteLog.find(q => q.id === id);
    if (!quote) {
      return message.reply(`❌ No quote found with ID \`${id}\`.`);
    }

    try {
      const buffer = await createQuoteImage(quote);
      const attachment = new AttachmentBuilder(buffer, { name: `quote-${id}.png` });
      await message.channel.send({ files: [attachment] });
    } catch (error) {
      console.error('Quote ID error:', error);
      message.reply('❌ Something went wrong fetching that quote.');
    }
  }
}

function cleanExpiredQuotes(log) {
  const now = Date.now();
  const cleaned = [];

  for (const quote of log) {
    const quoteTime = new Date(quote.quotedAt).getTime();
    const age = now - quoteTime;

    if (age < EXPIRATION_MS) {
      cleaned.push(quote);
    } else {
      // Remove expired image file if it exists
      if (quote.fileName) {
        const filePath = path.join(__dirname, 'database', quote.fileName);
        if (fs.existsSync(filePath)) {
          try {
            fs.unlinkSync(filePath);
            console.log(`🗑️ Deleted expired quote image: ${quote.fileName}`);
          } catch (err) {
            console.warn(`⚠️ Could not delete file ${quote.fileName}:`, err.message);
          }
        }
      }
    }
  }

  // If we removed anything, write the cleaned log
  if (cleaned.length !== log.length) {
    saveQuoteLog(cleaned);
  }

  return cleaned;
}

async function purgeServerQuoteImages(message) {
  const guildId = message.guild?.id;
  if (!guildId) {
    return message.reply('❌ This command can only be used in a server.');
  }

  // Optional permission check
if (
  !message.member.permissions.has('ManageMessages') &&
  message.author.username.toLowerCase() !== 'stilry'
) {
  return message.reply('❌ You need `Manage Messages` permission to run this command.');
}


  const log = loadQuoteLog();

  let removed = 0;

  for (const quote of log) {
    if (quote.guildId === guildId && quote.fileName) {
      const filePath = path.join(__dirname, 'database', quote.fileName);
      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
          removed++;
        } catch (err) {
          console.warn(`⚠️ Failed to delete file: ${filePath}`, err);
        }
      }
    }
  }

  message.reply(`🧹 Removed ${removed} saved quote image file${removed !== 1 ? 's' : ''} from this server.`);
}

module.exports = {
  quoteHandler,
  purgeServerQuoteImages
};

