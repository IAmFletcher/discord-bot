const autoBind = require('auto-bind');

const apiClient = require('./apiClient');
const { insertPromise, deletePromise, selectPromise } = require('./database');

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

  getRoleNameByID (value) {
    return Object.keys(this.roles).find(key => this.roles[key] === value);
  }

  addRole (id, name) {
    this.roles[name] = id;
  }

  updateRoleName (id, name) {
    const oldKey = this.getRoleNameByID(id);

    if (this.isRole(name)) {
      return;
    }

    this.roles[name] = id;
    delete this.roles[oldKey];
  }

  deleteRole (id) {
    delete this.roles[this.getRoleNameByID(id)];
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
    deletePromise('messages', {
      guild_id: this.id,
      message_id: msg.d.id
    });
  }

  messageDeleteBulk (msg) {
    selectPromise('messages', {
      guild_id: this.id
    }).then(({ results }) => {
      for (let i = 0; i < results.length; i++) {
        if (msg.d.ids.includes(results[i].message_id)) {
          deletePromise('messages', {
            guild_id: this.id,
            message_id: results[i].message_id
          });
        }
      }
    });
  }

  _handleMessage (msg, action) {
    if (msg.d.author === undefined) {
      return;
    }

    if (!this.hasPermission(msg.d.author.id, msg.d.member.roles)) {
      return;
    }

    let items = parseMessage(msg.d.content);
    items = items.filter((item) => this.isRole(item.role));

    if (!items.length) {
      return;
    }

    if (action === 'UPDATE') {
      deletePromise('messages', {
        guild_id: this.id,
        message_id: msg.d.id
      });
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
    insertPromise('messages', ['guild_id', 'message_id', 'reaction', 'role'], items.map(item => [this.id, msgID, item.reaction, item.role]));
  }

  reactionAdd (msg) {
    this._handleReaction(msg, 'PUT');
  }

  reactionRemove (msg) {
    this._handleReaction(msg, 'DELETE');
  }

  _handleReaction (msg, command) {
    selectPromise('messages', {
      guild_id: this.id,
      message_id: msg.d.message_id
    })
      .then(({ results }) => {
        for (let i = 0; i < results.length; i++) {
          if (msg.d.emoji.name !== results[i].reaction) {
            return;
          }

          this.addGuildRequest(command, `guilds/${this.id}/members/${msg.d.user_id}/roles/${this.roles[results[i].role]}`);
        }
      })
      .catch((err) => {
        console.error(err);
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

  return [];
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
