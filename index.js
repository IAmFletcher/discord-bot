const process = require('process');

const Guild = require('./lib/Guild');

const client = require('./src/client');
const gateway = require('./src/gateway');

const BOT_ID = process.env.DiscordBotID;

const guilds = {};

client.request('GET', 'gateway')
  .then((result) => {
    gateway.connect(result.data.url + '?v-6&encoding=json');
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });

gateway.on('GUILD_CREATE', (msg) => {
  if (guilds[msg.d.id]) {
    return;
  }

  guilds[msg.d.id] = new Guild(msg.d);
});

gateway.on('GUILD_UPDATE', (msg) => {
  guilds[msg.d.id].update(msg.d);
});

gateway.on('GUILD_DELETE', (msg) => {
  if (msg.d.unavailable == null) {
    delete guilds[msg.d.id];
  }
});

gateway.on('GUILD_ROLE_CREATE', (msg) => {
  guilds[msg.d.guild_id].roleCreate(msg.d.role);
});

gateway.on('GUILD_ROLE_UPDATE', (msg) => {
  guilds[msg.d.guild_id].roleUpdate(msg.d.role);
});

gateway.on('GUILD_ROLE_DELETE', (msg) => {
  guilds[msg.d.guild_id].roleDelete(msg.d);
});

gateway.on('MESSAGE_CREATE', (msg) => {
  guilds[msg.d.guild_id].messageCreate(msg.d);
});

gateway.on('MESSAGE_UPDATE', (msg) => {
  guilds[msg.d.guild_id].messageUpdate(msg.d);
});

gateway.on('MESSAGE_DELETE', (msg) => {
  guilds[msg.d.guild_id].messageDelete(msg.d);
});

gateway.on('MESSAGE_DELETE_BULK', (msg) => {
  guilds[msg.d.guild_id].messageDeleteBulk(msg.d);
});

gateway.on('MESSAGE_REACTION_ADD', (msg) => {
  if (msg.d.user_id === BOT_ID) {
    return;
  }

  guilds[msg.d.guild_id].messageReactionAdd(msg.d);
});

gateway.on('MESSAGE_REACTION_REMOVE', (msg) => {
  if (msg.d.user_id === BOT_ID) {
    return;
  }

  guilds[msg.d.guild_id].messageReactionRemove(msg.d);
});

process.on('SIGINT', () => {
  gateway.disconnect(1000);

  Object.keys(guilds).forEach((id) => {
    guilds[id].clearIntervals();
  });
});
