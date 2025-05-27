const { createAudioPlayer, AudioPlayerStatus } = require('@discordjs/voice');

const queue = new Map(); // guildId → song queue
const player = createAudioPlayer();

player.on(AudioPlayerStatus.Idle, () => {
  for (const [guildId, serverQueue] of queue.entries()) {
    if (serverQueue.songs.length > 0) {
      serverQueue.songs.shift(); // Remove current song
      const next = serverQueue.songs[0];
      if (next) {
        serverQueue.player.play(next.resource);
      } else {
        queue.delete(guildId);
      }
    }
  }
});

module.exports = {
  player,
  queue,
};
