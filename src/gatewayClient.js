const process = require('process');
const WebSocketClient = require('./WebSocketClient');

const gatewayClient = new WebSocketClient(process.env.DiscordBotToken, 'linux', 'discord-bot');

module.exports = gatewayClient;
