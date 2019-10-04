const process = require('process');

const Guild = require('./Guild');

const { database, initDatabase } = require('./database');
const apiClient = require('./apiClient');
const gatewayClient = require('./gatewayClient');

const BOT_ID = process.env.DiscordBotID;

const guilds = {};

initDatabase()
  .then(() => {
    return apiClient.request('GET', 'gateway');
  })
  .then((result) => {
    gatewayClient.connect(result.data.url + '?v-6&encoding=json');
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });

gatewayClient.on('GUILD_CREATE', (msg) => {
  if (guilds[msg.d.id]) {
    return;
  }

  guilds[msg.d.id] = new Guild({
    id: msg.d.id,
    ownerID: msg.d.owner_id,
    roles: msg.d.roles
  });
});

gatewayClient.on('MESSAGE_CREATE', (msg) => {
  guilds[msg.d.guild_id].messageCreate(msg);
});

gatewayClient.on('MESSAGE_UPDATE', (msg) => {
  guilds[msg.d.guild_id].messageUpdate(msg);
});

gatewayClient.on('MESSAGE_DELETE', (msg) => {
  guilds[msg.d.guild_id].messageDelete(msg);
});

gatewayClient.on('MESSAGE_REACTION_ADD', (msg) => {
  if (msg.d.user_id === BOT_ID) {
    return;
  }

  guilds[msg.d.guild_id].reactionAdd(msg);
});

gatewayClient.on('MESSAGE_REACTION_REMOVE', (msg) => {
  if (msg.d.user_id === BOT_ID) {
    return;
  }

  guilds[msg.d.guild_id].reactionRemove(msg);
});

process.on('SIGINT', () => {
  gatewayClient.disconnect(1000);
  database.end();

  Object.keys(guilds).forEach((id) => {
    guilds[id].clearIntervals();
  });
});
