const autoBind = require('auto-bind');

const apiClient = require('./apiClient');
const { database } = require('./database');

class Guild {
  constructor ({ id, ownerID, roles }) {
    this.id = id;
    this.ownerID = ownerID;
    this.roles = {};

    for (let i = 0; i < roles.length; i++) {
      this.roles[roles[i].name] = roles[i].id;
    }

    // Has permission to add a Role Menu
    this.allowedUsers = {
      [ownerID]: true
    };
    this.allowedRoles = {};

    this.intervals = {};
    this.queues = {};

    autoBind(this);
  }

  isRole (role) {
    return Boolean(this.roles[role]);
  }

  hasPermission (id, roles) {
    if (this.allowedUsers[id]) {
      return true;
    }

    return roles.some((role) => this.allowedRoles[role]);
  }

  messageCreate (msg) {
    this._handleMessage(msg, 'CREATE');
  }

  messageUpdate (msg) {
    this._handleMessage(msg, 'UPDATE');
  }

  messageDelete (msg) {
    database.query('DELETE FROM messages WHERE guild_id = ? AND message_id = ?', [this.id, msg.d.id]);
  }

  _handleMessage (msg, action) {
    if (msg.d.author === undefined) {
      return;
    }

    if (!this.hasPermission(msg.d.author.id, msg.d.member.roles)) {
      return;
    }

    let items = parseMessage(msg.d.content);

    if (items === undefined) {
      return;
    }

    items = items.filter((item) => this.isRole(item.role));

    if (action === 'UPDATE') {
      database.query('DELETE FROM messages WHERE guild_id = ? AND message_id = ?', [this.id, msg.d.id]);
    }

    this._addReactions(msg.d.channel_id, msg.d.id, items);
    this._insertItemsIntoDB(msg.d.id, items);
  }

  _addReactions (channelID, msgID, items) {
    items
      .map((item) => item.reaction.replace(/(?:<:)(.*)(?:>)/, '$1'))
      .forEach((reaction) => this.addRequest(channelID, 'PUT', `channels/${channelID}/messages/${msgID}/reactions/${reaction}/@me`));
  }

  _insertItemsIntoDB (msgID, items) {
    const reaction = items.filter(item => item.reaction.includes('<'));
    const unicode = items.filter(item => !item.reaction.includes('<'));

    if (reaction.length) {
      database.query('INSERT INTO messages (guild_id, message_id, is_unicode, reaction, role) VALUES (?)', reaction.map(item => [this.id, msgID, false, item.reaction, item.role]));
    }

    if (unicode.length) {
      database.query('INSERT INTO messages (guild_id, message_id, is_unicode, unicode, role) VALUES (?)', unicode.map(item => [this.id, msgID, true, item.reaction.codePointAt(0), item.role]));
    }
  }

  reactionAdd (msg) {
    this._handleReaction(msg, 'PUT');
  }

  reactionRemove (msg) {
    this._handleReaction(msg, 'DELETE');
  }

  _handleReaction (msg, command) {
    database.query('SELECT * FROM messages WHERE guild_id = ? AND message_id = ?', [this.id, msg.d.message_id], (err, results, fields) => {
      if (err) {
        throw err;
      }

      for (let i = 0; i < results.length; i++) {
        if (msg.d.emoji.name[0] === '<') {
          if (msg.d.emoji.name === results[i].reaction) {
            this.addGuildRequest(command, `guilds/${this.id}/members/${msg.d.user_id}/roles/${this.roles[results[i].role]}`);
          }
        } else {
          if (msg.d.emoji.name.codePointAt(0) === results[i].unicode) {
            this.addGuildRequest(command, `guilds/${this.id}/members/${msg.d.user_id}/roles/${this.roles[results[i].role]}`);
          }
        }
      }
    });
  }

  addRequest (id, method, endpoint) {
    if (!this.intervals[id]) {
      this.intervals[id] = setInterval(this._sendRequest, 1000, id);
    }

    this.queues[id] = this.queues[id] || [];
    this.queues[id].push({ method, endpoint });
  }

  addGuildRequest (method, endpoint) {
    this.addRequest('guild', method, endpoint);
  }

  _sendRequest (id) {
    if (this.queues[id].length === 0) {
      clearInterval(this.intervals[id]);
      delete this.intervals[id];
      return;
    }

    const request = this.queues[id].shift();
    apiClient.request(request.method, request.endpoint);
  }

  clearIntervals () {
    for (const id in this.intervals) {
      clearInterval(this.intervals[id]);
    }
  }
}

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

    items.push({ reaction: split[0].trim(), role: split[1].replace(/[`]/g, '') });
  }

  return items;
}

module.exports = Guild;
