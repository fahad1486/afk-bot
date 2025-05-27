const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
require('dotenv').config();

const afkMap = new Map();
const afkCounts = new Map();
const prefix = '?';

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates,
  ],
});

client.once('ready', () => {
  console.log(`✅ Bot is online as ${client.user.tag}`);
});

client.on('messageCreate', async message => {
  if (message.author.bot || !message.guild) return;
  const userId = message.author.id;
  const content = message.content.trim();

  // Remove AFK if user talks
  if (afkMap.has(userId)) {
    const afk = afkMap.get(userId);
    if (afk.pings.length > 0) {
      const lines = afk.pings.map(p =>
        `🔔 **${p.from}**: [Jump to Message](${p.link})\n> ${p.content}`
      );
      message.author.send(`📬 While you were AFK, you were pinged:\n\n${lines.join('\n\n')}`).catch(() => {});
    }

    afkMap.delete(userId);
    const member = message.guild.members.cache.get(userId);
    if (member && member.manageable && member.displayName.startsWith('[AFK]')) {
      await member.setNickname(member.displayName.replace('[AFK] ', '')).catch(() => {});
    }

    message.reply(`👋 Welcome back, <@${userId}>! AFK removed.`).then(m => {
      setTimeout(() => m.delete().catch(() => {}), 5000);
    });
  }

  // Respond to AFK pings
  message.mentions.users.forEach(user => {
    if (afkMap.has(user.id)) {
      const afk = afkMap.get(user.id);
      const mins = Math.floor((Date.now() - afk.timestamp) / 60000);
      const timeText = mins < 1 ? 'just now' : `${mins} minute(s) ago`;

      afk.pings.push({
        from: message.author.tag,
        link: `https://discord.com/channels/${message.guild.id}/${message.channel.id}/${message.id}`,
        content: message.content
      });

      const msg = `💤 **${user.username}** is AFK: *${afk.reason}* (Since ${timeText})`;
      message.reply(msg).then(m => {
        setTimeout(() => m.delete().catch(() => {}), 2 * 60 * 1000);
      });
    }
  });

  // Command Handling
  if (!content.startsWith(prefix)) return;

  const args = content.slice(prefix.length).trim().split(/ +/);
  const command = args.shift().toLowerCase();

  if (command === 'afk') {
    const reason = args.join(' ') || 'AFK gaya bhai 😴';
    if (reason.includes('@')) return message.reply('❌ Mentions not allowed in AFK reason.');

    afkMap.set(userId, {
      reason,
      timestamp: Date.now(),
      pings: []
    });
    afkCounts.set(userId, (afkCounts.get(userId) || 0) + 1);

    const member = message.guild.members.cache.get(userId);
    if (member && member.manageable && !member.displayName.startsWith('[AFK]')) {
      await member.setNickname(`[AFK] ${member.displayName}`).catch(() => {});
    }

    message.reply(`☕ <@${userId}> is now AFK: *${reason}*`);
  }

  else if (command === 'tempafk') {
    const minutes = parseInt(args.shift());
    const reason = args.join(' ') || 'Temporary AFK';

    if (isNaN(minutes)) return message.reply('⏱️ Please provide time in minutes. Example: `?tempafk 5 I\'ll be back`');
    if (reason.includes('@')) return message.reply('❌ Mentions not allowed in AFK reason.');

    afkMap.set(userId, {
      reason,
      timestamp: Date.now(),
      pings: []
    });
    afkCounts.set(userId, (afkCounts.get(userId) || 0) + 1);

    const member = message.guild.members.cache.get(userId);
    if (member && member.manageable && !member.displayName.startsWith('[AFK]')) {
      await member.setNickname(`[AFK] ${member.displayName}`).catch(() => {});
    }

    message.reply(`⏰ <@${userId}> is now AFK for ${minutes} minute(s): *${reason}*`);

    setTimeout(async () => {
      if (afkMap.has(userId)) {
        const afk = afkMap.get(userId);
        if (afk.pings.length > 0) {
          const lines = afk.pings.map(p =>
            `🔔 **${p.from}**: [Jump to Message](${p.link})\n> ${p.content}`
          );
          message.author.send(`📬 While you were AFK, you were pinged:\n\n${lines.join('\n\n')}`).catch(() => {});
        }

        afkMap.delete(userId);
        if (member && member.manageable && member.displayName.startsWith('[AFK]')) {
          await member.setNickname(member.displayName.replace('[AFK] ', '')).catch(() => {});
        }

        message.channel.send(`👋 <@${userId}> is no longer AFK (auto-returned)`);
      }
    }, minutes * 60 * 1000);
  }

  else if (command === 'afktop') {
    const sorted = [...afkCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    if (sorted.length === 0) return message.reply('🤷 Nobody has gone AFK yet!');

    const leaderboard = sorted.map(([id, count], i) => {
      const user = message.guild.members.cache.get(id);
      const name = user ? user.user.tag : `Unknown (${id})`;
      return `**#${i + 1}** — ${name} → ${count} time(s)`;
    }).join('\n');

    message.channel.send({
      embeds: [
        new EmbedBuilder()
          .setTitle('🏆 Top AFK Users')
          .setColor(0xf1c40f)
          .setDescription(leaderboard)
      ]
    });
  }

  else if (command === 'help') {
    message.channel.send({
      embeds: [
        new EmbedBuilder()
          .setColor(0x3498db)
          .setTitle('🤖 AFK Bot Help')
          .setDescription(`
📌 **?afk [reason]** — Set your AFK status  
⏱️ **?tempafk [minutes] [reason]** — Timed AFK with auto-return  
🏆 **?afktop** — Show top AFK users

🎶 **?play [song name]** — Play music by name  
🔁 **?loop on/off [song]** — Loop a song forever  
⏭️ **?skip** — Skip current song  
📄 **?queue** — Show queue  
🎵 **?nowplaying** — What’s playing now  
⏸️ **?pause** / ▶️ **?resume** — Pause/resume music  
🛑 **?stop** — Stop music and leave VC  

📘 **?help** — Show this help menu  
🔗 [Join our Discord server](https://discord.gg/flawlessop)
          `)
          .setFooter({ text: 'Made by fahad._.ali 💻' })
      ]
    });
  }

  // 🎵 MUSIC COMMANDS
  else if (command === 'play') {
    require('./commands/music').execute(message, args);
  }
  else if (command === 'stop') {
    require('./commands/stop').execute(message);
  }
  else if (command === 'pause') {
    require('./commands/pause').execute(message);
  }
  else if (command === 'resume') {
    require('./commands/resume').execute(message);
  }
  else if (command === 'loop') {
    require('./commands/loop').execute(message, args);
  }
  else if (command === 'skip') {
    require('./commands/skip').execute(message);
  }
  else if (command === 'queue') {
    require('./commands/queue').execute(message);
  }
  else if (command === 'nowplaying') {
    require('./commands/nowplaying').execute(message);
  }

});

client.login(process.env.DISCORD_TOKEN);
