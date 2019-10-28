const process = require('process');
const WebSocketClient = require('./WebSocketClient');

const gateway = new WebSocketClient(process.env.DiscordBotToken, 'linux', 'discord-bot');

module.exports = gateway;
