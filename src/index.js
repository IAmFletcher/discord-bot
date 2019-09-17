const process = require('process');
const HTTPSClient = require('./httpsClient');
const GatewayClient = require('./gateway');

const apiClient = new HTTPSClient('discordapp.com', 'api/v6');
const gatewayClient = new GatewayClient(process.env.DiscordBotToken, 'linux', 'discord-bot');

apiClient.request('GET', 'gateway')
  .then((result) => {
    gatewayClient.connect(result.data.url + '?v-6&encoding=json');
  })
  .catch((err) => {
    throw err;
  });
