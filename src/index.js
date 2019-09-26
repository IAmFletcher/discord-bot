const process = require('process');
const mysql = require('mysql');
const HTTPSClient = require('./httpsClient');
const GatewayClient = require('./gateway');

const database = mysql.createConnection({
  host: 'localhost',
  user: 'fletcher',
  password: 'pass'
});

database.connect((err) => {
  if (err) {
    throw err;
  }

  console.log('Database Connected');

  database.query('CREATE DATABASE IF NOT EXISTS bot', (err, result) => {
    if (err) {
      throw err;
    }

    console.log('Database Created');
  });

  database.query('USE bot');
  database.query('CREATE TABLE IF NOT EXISTS messages (id INT AUTO_INCREMENT UNIQUE, message_id VARCHAR(64), is_unicode BOOLEAN, unicode INT, reaction VARCHAR(100), role VARCHAR(100), key(id));');
});

const options = {
  id: '622342248872542209',
  roles: {},
  permissions: {},

  guildQueue: [],

  intervals: {},
  queues: {},

  addGuildRequest (method, endpoint) {
    if (this.intervals.guild === undefined) {
      this.intervals.guild = setInterval(this._sendGuildRequest, 1000);
    }

    this.guildQueue.push([method, endpoint]);
  },

  _sendGuildRequest () {
    if (this.guildQueue.length === 0) {
      return;
    }

    const request = this.guildQueue.shift();
    apiClient.request(request[0], request[1], { Authorization: `Bot ${process.env.DiscordBotToken}` });
  },

  addChannelRequest (channelID, method, endpoint) {
    if (this.intervals[channelID] !== undefined) {
      this.queues[channelID].push([method, endpoint]);
      return;
    }

    this.intervals[channelID] = setInterval(this._sendChannelRequest, 1000, channelID);
    this.queues[channelID] = [];
    this.queues[channelID].push([method, endpoint]);
  },

  _sendChannelRequest (channelID) {
    if (this.queues[channelID].length === 0) {
      return;
    }

    const request = this.queues[channelID].shift();
    apiClient.request(request[0], request[1], { Authorization: `Bot ${process.env.DiscordBotToken}` });
  },

  isRole (role) {
    return Object.prototype.hasOwnProperty.call(this.roles, role);
  },

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

options._sendGuildRequest = options._sendGuildRequest.bind(options);
options._sendChannelRequest = options._sendChannelRequest.bind(options);

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
  options.guild_id = msg.d.id;
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

  addReactions(msg.d.channel_id, msg.d.id, items);
  insertItemsIntoDB(msg.d.id, items);
});

gatewayClient.on('MESSAGE_UPDATE', (msg) => {
  if (options.checkPermission(msg.d.author.id, msg.d.member.roles) === false) {
    return;
  }

  const items = parseMessage(msg.d.content);

  if (items === undefined) {
    return;
  }

  database.query('DELETE FROM messages WHERE message_id = ?', msg.d.id);
  addReactions(msg.d.channel_id, msg.d.id, items);
  insertItemsIntoDB(msg.d.id, items);
});

function addReactions (channelID, msgID, items) {
  for (let i = 0; i < items.length; i++) {
    let emoji = '';
    if (items[i][0][0] === '<') {
      emoji = items[i][0].replace(/(?:<:)(.*)(?:>)/, '$1');
    } else {
      emoji = items[i][0];
    }

    options.addChannelRequest(channelID, 'PUT', `channels/${channelID}/messages/${msgID}/reactions/${emoji}/@me`);
  }
}

function insertItemsIntoDB (msgID, items) {
  for (let i = 0; i < items.length; i++) {
    if (options.isRole(items[i][1]) === false) {
      items.splice(i, 1);
    }
  }

  const unicode = items.filter(item => !item[0].includes('<'));
  const reaction = items.filter(item => item[0].includes('<'));

  if (unicode.length !== 0) {
    database.query('INSERT INTO messages (message_id, is_unicode, unicode, role) VALUES (?)', unicode.map(item => [msgID, true, item[0].codePointAt(0), item[1]]));
  }

  if (reaction.length !== 0) {
    database.query('INSERT INTO messages (message_id, is_unicode, reaction, role) VALUES (?)', reaction.map(item => [msgID, false, item[0], item[1]]));
  }
}

gatewayClient.on('MESSAGE_DELETE', (msg) => {
  database.query('SELECT COUNT(*) FROM messages where message_id = ?', msg.d.id, (err, results, fields) => {
    if (err !== null) {
      throw err;
    }

    if (results[0]['COUNT(*)'] > 0) {
      database.query('DELETE FROM messages WHERE message_id = ?', msg.d.id);
    }
  });
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
  const items = [];

  for (let i = 0; i < lines.length; i++) {
    const split = lines[i].split(' : ');

    if (split.length !== 2) {
      continue;
    }

    items.push([split[0].trim(), split[1].replace(/[ `]/g, '')]);
  }

  return items;
}

gatewayClient.on('MESSAGE_REACTION_ADD', (msg) => {
  if (msg.d.user_id === options.id) {
    return;
  }

  database.query('SELECT * FROM messages WHERE message_id = ?', msg.d.message_id, (err, results, fields) => {
    if (err !== null) {
      throw err;
    }

    if (results.length === 0) {
      return;
    }

    for (let i = 0; i < results.length; i++) {
      if (msg.d.emoji.name[0] === '<') {
        if (msg.d.emoji.name === results[i].reaction) {
          options.addGuildRequest('PUT', `guilds/${options.guild_id}/members/${msg.d.user_id}/roles/${options.roles[results[i].role]}`);
        }
      } else {
        if (msg.d.emoji.name.codePointAt(0) === results[i].unicode) {
          options.addGuildRequest('PUT', `guilds/${options.guild_id}/members/${msg.d.user_id}/roles/${options.roles[results[i].role]}`);
        }
      }
    }
  });
});

gatewayClient.on('MESSAGE_REACTION_REMOVE', (msg) => {
  if (msg.d.user_id === options.id) {
    return;
  }

  database.query('SELECT * FROM messages WHERE message_id = ?', msg.d.message_id, (err, results, fields) => {
    if (err !== null) {
      throw err;
    }

    if (results.length === 0) {
      return;
    }

    for (let i = 0; i < results.length; i++) {
      if (msg.d.emoji.name[0] === '<') {
        if (msg.d.emoji.name === results[i].reaction) {
          options.addGuildRequest('DELETE', `guilds/${options.guild_id}/members/${msg.d.user_id}/roles/${options.roles[results[i].role]}`);
        }
      } else {
        if (msg.d.emoji.name.codePointAt(0) === results[i].unicode) {
          options.addGuildRequest('DELETE', `guilds/${options.guild_id}/members/${msg.d.user_id}/roles/${options.roles[results[i].role]}`);
        }
      }
    }
  });
});

process.on('SIGINT', () => {
  gatewayClient.disconnect();
  database.end();

  for (const channelid in options.intervals) {
    clearInterval(options.intervals[channelid]);
  }
});
