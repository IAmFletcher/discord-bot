const HTTPSClient = require('./httpsClient');

const apiClient = new HTTPSClient('discordapp.com', 'api/v6');

apiClient.request('GET', 'gateway')
  .then((result) => {
    console.log(result.data.url);
  })
  .catch((err) => {
    throw err;
  });
