const https = require('https');

class HTTPSClient {
  constructor (hostname, basePath) {
    if (!process.env.DiscordBotToken) {
      console.error('process.env.DiscordBotToken is undefined/empty');
      process.exit(1);
    }

    if (basePath[0] !== '/') {
      basePath = '/' + basePath;
    }

    this.hostname = hostname;
    this.basePath = basePath;
    this.headers = {
      Authorization: `Bot ${process.env.DiscordBotToken}`
    };
  }

  request (method, endpoint) {
    if (endpoint[0] !== '/') {
      endpoint = '/' + endpoint;
    }

    const options = {
      hostname: this.hostname,
      path: encodeURI(this.basePath + endpoint),
      method: method,
      headers: this.headers
    };

    return new Promise((resolve, reject) => {
      const req = https.request(options, (res) => {
        let data = '';

        res.on('data', (d) => {
          data += d;
        });

        res.on('end', () => {
          if (res.statusCode === 204) {
            return resolve(new HTTPSResponse(res.statusCode, res.headers));
          }

          resolve(new HTTPSResponse(res.statusCode, res.headers, data));
        });
      });

      req.on('error', (err) => {
        reject(err);
      });

      req.end();
    });
  }
}

class HTTPSResponse {
  constructor (statusCode, headers, data) {
    this._statusCode = statusCode;
    this._headers = headers;
    this._data = JSON.parse(data);
  }

  get statusCode () {
    return this._statusCode;
  }

  get headers () {
    return this._headers;
  }

  get data () {
    return this._data;
  }
}

module.exports = HTTPSClient;
