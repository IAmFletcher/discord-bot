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
});

gatewayClient.on('MESSAGE_CREATE', (msg) => {
  if (options.checkPermission(msg.d.author.id, msg.d.member.roles) === false) {
    return;
  }

  const items = parseMessage(msg.d.content);

  if (items === undefined) {
    return;
  }

  console.log(items);
});

gatewayClient.on('MESSAGE_UPDATE', (msg) => {
  if (options.checkPermission(msg.d.author.id, msg.d.member.roles) === false) {
    return;
  }

  const items = parseMessage(msg.d.content);

  if (items === undefined) {
    return;
  }

  console.log(items);
});

gatewayClient.on('MESSAGE_DELETE', (msg) => {
  console.log(msg.d.id);
});

function parseMessage (message) {
  const lines = message.split('\n').filter((line) => line.length > 0);

  for (let i = 0; i < lines.length; i++) {
    if (lines[i] === '**Role Menu:**') {
      return parseLines(lines.slice(i + 1));
    }
  }
}

function parseLines (lines) {
  const items = {};

  for (let i = 0; i < lines.length; i++) {
    const split = lines[i].split(' : ');

    if (split.length !== 2) {
      continue;
    }

    items[split[0].trim()] = split[1].trim();
  }

  return items;
}

process.on('SIGINT', () => {
  gatewayClient.disconnect();
});
