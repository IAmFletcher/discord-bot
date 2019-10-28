const process = require('process');

const Guild = require('./src/Guild');

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

  guilds[msg.d.id] = new Guild({
    id: msg.d.id,
    ownerID: msg.d.owner_id,
    roles: msg.d.roles
  });
});

gateway.on('MESSAGE_CREATE', (msg) => {
  guilds[msg.d.guild_id].messageCreate(msg);
});

gateway.on('MESSAGE_UPDATE', (msg) => {
  guilds[msg.d.guild_id].messageUpdate(msg);
});

gateway.on('MESSAGE_DELETE', (msg) => {
  guilds[msg.d.guild_id].messageDelete(msg);
});

gateway.on('MESSAGE_REACTION_ADD', (msg) => {
  if (msg.d.user_id === BOT_ID) {
    return;
  }

  guilds[msg.d.guild_id].reactionAdd(msg);
});

gateway.on('MESSAGE_REACTION_REMOVE', (msg) => {
  if (msg.d.user_id === BOT_ID) {
    return;
  }

  guilds[msg.d.guild_id].reactionRemove(msg);
});

gateway.on('MESSAGE_DELETE_BULK', (msg) => {
  guilds[msg.d.guild_id].messageDeleteBulk(msg);
});

gateway.on('GUILD_ROLE_CREATE', (msg) => {
  guilds[msg.d.guild_id].addRole(msg.d.role.id, msg.d.role.name);
});

gateway.on('GUILD_ROLE_UPDATE', (msg) => {
  guilds[msg.d.guild_id].updateRoleName(msg.d.role.id, msg.d.role.name);
});

gateway.on('GUILD_ROLE_DELETE', (msg) => {
  guilds[msg.d.guild_id].deleteRole(msg.d.role_id);
});

process.on('SIGINT', () => {
  gateway.disconnect(1000);

  Object.keys(guilds).forEach((id) => {
    guilds[id].clearIntervals();
  });
});
