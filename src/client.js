const HTTPSClient = require('../lib/HTTPSClient');

const client = new HTTPSClient('discordapp.com', 'api/v6');

module.exports = client;
