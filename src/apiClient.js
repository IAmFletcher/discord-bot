const HTTPSClient = require('./HTTPSClient');

const apiClient = new HTTPSClient('discordapp.com', 'api/v6');

module.exports = apiClient;
