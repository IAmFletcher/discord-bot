const autoBind = require('auto-bind');
const process = require('process');

const client = require('../src/client');
const db = require('../src/database');

class Guild {
  constructor ({ id, owner_id: ownerID, roles }) {
    this.id = id;
    this.ownerID = ownerID;
    this.roles = {};
    this._addRoles(roles);

    this.intervals = {};
    this.queues = {};

    autoBind(this);
  }

  update ({ id, owner_id: ownerID, roles }) {
    this.id = id;
    this.ownerID = ownerID;
    this._addRoles(roles);
  }

  roleCreate ({ id, name }) {
    this._addRole(id, name);
  }

  roleUpdate ({ id, name }) {
    if (this.roles[name]) {
      return;
    }

    delete this.roles[this._getRoleNameByID(id)];
    this.roles[name] = id;
  }

  roleDelete ({ role_id: id }) {
    delete this.roles[this._getRoleNameByID(id)];
  }

  messageCreate (d) {
    if (d.webhook_id) {
      return;
    }

    if (d.author.id !== this.ownerID) {
      return;
    }

    const items = parseContent(d.content).filter((item) => {
      return this.roles[item.role];
    });

    if (!items.length) {
      return;
    }

    this._addReactions(items, d.channel_id, d.id);
    this._insertItemsDB(items, d.id);
  }

  messageUpdate (d) {
    if (d.webhook_id) {
      return;
    }

    if (d.author.id !== this.ownerID) {
      return;
    }

    const items = parseContent(d.content).filter((item) => {
      return this.roles[item.role];
    });

    if (!items.length) {
      return;
    }

    this._deleteMessageDB(d.id)
      .then(() => {
        this._addReactions(items, d.channel_id, d.id);
        this._insertItemsDB(items, d.id);
      })
      .catch((err) => {
        console.error(err);
      });
  }

  messageDelete ({ id }) {
    this._deleteMessageDB(id)
      .catch((err) => {
        console.error(err);
      });
  }

  messageDeleteBulk ({ ids }) {
    db.query('SELECT * FROM messages WHERE ?;', {
      guild_id: this.id
    })
      .then((results) => {
        for (let i = 0; i < results.length; i++) {
          if (ids.includes(results[i].message_id)) {
            return this._deleteMessageDB(results[i].message_id);
          }
        }
      })
      .catch((err) => {
        console.error(err);
      });
  }

  messageReactionAdd (d) {
    if (d.user_id === process.env.DiscordOwnerID && d.emoji.name === '🆙') {
      client.request('GET', `/channels/${d.channel_id}/messages/${d.message_id}`)
        .then((response) => {
          this.messageUpdate(response.data);
        })
        .catch((err) => {
          console.error(err);
        });
    }

    this._handleReaction(d, 'PUT');
  }

  messageReactionRemove (d) {
    this._handleReaction(d, 'DELETE');
  }

  _handleReaction (d, command) {
    db.query('SELECT * FROM messages WHERE guild_id=? AND message_id=?;', [
      this.id,
      d.message_id
    ])
      .then((results) => {
        for (let i = 0; i < results.length; i++) {
          if (d.emoji.name !== results[i].reaction) {
            continue;
          }

          this._addGuildRequest(command, `guilds/${this.id}/members/${d.user_id}/roles/${this.roles[results[i].role]}`);
        }
      })
      .catch((err) => {
        console.error(err);
      });
  }

  clearIntervals () {
    for (const id in this.intervals) {
      clearInterval(this.intervals[id]);
    }
  }

  _addRole (id, name) {
    this.roles[name] = id;
  }

  _addRoles (roles) {
    for (let i = 0; i < roles.length; i++) {
      this._addRole(roles[i].id, roles[i].name);
    }
  }

  _getRoleNameByID (id) {
    return Object.keys(this.roles).find((name) => {
      return this.roles[name] === id;
    });
  }

  _addRequest (id, method, endpoint) {
    if (!this.intervals[id]) {
      this.intervals[id] = setInterval(this._sendRequest, 1000, id);
    }

    if (!this.queues[id]) {
      this.queues[id] = [];
    }

    this.queues[id].push({ method, endpoint });
  }

  _addGuildRequest (method, endpoint) {
    this._addRequest('guild', method, endpoint);
  }

  _sendRequest (id) {
    if (this.queues[id].length === 0) {
      clearInterval(this.intervals[id]);
      delete this.intervals[id];
      return;
    }

    const request = this.queues[id].shift();

    client.request(request.method, request.endpoint)
      .then((response) => {
        console.log((response.statusCode <= 204 ? 'Success: ' : 'Error: ') + response.statusCode);
      })
      .catch((err) => {
        console.error(err);
      });
  }

  _addReactions (items, channelID, msgID) {
    items.map((item) => {
      return item.reaction.replace(/(?:<:)(.*)(?:>)/, '$1');
    }).forEach((reaction) => {
      this._addRequest(channelID, 'PUT', `channels/${channelID}/messages/${msgID}/reactions/${reaction}/@me`);
    });
  }

  _insertItemsDB (items, msgID) {
    db.query('INSERT INTO messages (guild_id, message_id, reaction, role) VALUES ?;', [items.map(item => {
      return [this.id, msgID, item.reaction, item.role];
    })])
      .catch((err) => {
        console.error(err);
      });
  }

  _deleteMessageDB (msgID) {
    return db.query('DELETE FROM messages WHERE guild_id=? AND message_id=?;', [
      this.id,
      msgID
    ]);
  }
}

function parseContent (content) {
  const lines = content.split('\n').filter((line) => {
    return line.length > 0;
  });

  for (let i = 0; i < lines.length; i++) {
    if (lines[i] === ('**Role Menu:**')) {
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

    items.push({
      reaction: split[0].trim(),
      role: split[1].replace(/`/g, '')
    });
  }

  return items;
}

module.exports = Guild;
