const process = require('process');
const HTTPSClient = require('./httpsClient');
const GatewayClient = require('./gateway');

const options = {
  roles: {},
  permissions: {},

  checkPermission (id, roles) {
    if (id === this.permissions.owner) {
      return true;
    }

    if (this.permissions.roles === undefined) {
      return false;
    }

    for (let i = 0; i < roles.length; i++) {
      for (let n = 0; n < this.permissions.roles.length; n++) {
        if (roles[i] === this.permissions.roles[n]) {
          return true;
        }
      }
    }

    return false;
  }
};

const apiClient = new HTTPSClient('discordapp.com', 'api/v6');
const gatewayClient = new GatewayClient(process.env.DiscordBotToken, 'linux', 'discord-bot');

apiClient.request('GET', 'gateway')
  .then((result) => {
    gatewayClient.connect(result.data.url + '?v-6&encoding=json');
  })
  .catch((err) => {
    throw err;
  });

gatewayClient.on('GUILD_CREATE', (msg) => {
  options.permissions.owner = msg.d.owner_id;

  for (let i = 0; i < msg.d.roles.length; i++) {
    options.roles[msg.d.roles[i].name] = msg.d.roles[i].id;
  }

  console.log(options);
});

gatewayClient.on('MESSAGE_CREATE', (msg) => {
  if (options.checkPermission(msg.d.author.id, msg.d.member.roles) === false) {
    return;
  }

  console.log(msg.d.content);
});

gatewayClient.on('MESSAGE_UPDATE', (msg) => {
  if (options.checkPermission(msg.d.author.id, msg.d.member.roles) === false) {
    return;
  }

  console.log(msg.d.content);
});

gatewayClient.on('MESSAGE_DELETE', (msg) => {
  if (options.checkPermission(msg.d.author.id, msg.d.member.roles) === false) {
    return;
  }

  console.log(msg.d.content);
});
