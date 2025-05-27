const { joinVoiceChannel, createAudioResource, AudioPlayerStatus } = require('@discordjs/voice');
const play = require('play-dl');
const { player } = require('../music/musicPlayer');

module.exports = {
  name: 'play',
  description: 'Search and play music from YouTube',
  async execute(message, args) {
    const voiceChannel = message.member.voice.channel;
    if (!voiceChannel) return message.reply('❌ Join a voice channel first!');
    if (!args.length) return message.reply('❌ Enter song name.');

    const permissions = voiceChannel.permissionsFor(message.client.user);
    if (!permissions.has('CONNECT') || !permissions.has('SPEAK')) {
      return message.reply('❌ I need permission to join & speak.');
    }

    try {
      const query = args.join(' ');
      const searchResult = await play.search(query, { limit: 1 });
      if (!searchResult.length) return message.reply('❌ No results found.');

      const song = searchResult[0];
      const stream = await play.stream(song.url);

      const resource = createAudioResource(stream.stream, {
        inputType: stream.type,
      });

      const connection = joinVoiceChannel({
        channelId: voiceChannel.id,
        guildId: voiceChannel.guild.id,
        adapterCreator: voiceChannel.guild.voiceAdapterCreator,
      });

      player.play(resource);
      connection.subscribe(player);

      player.on(AudioPlayerStatus.Idle, () => {
        connection.destroy();
      });

      message.reply(`🎶 Now playing: **${song.title}**`);
    } catch (err) {
      console.error(err);
      message.reply('❌ Error playing the song.');
    }
  },
};
