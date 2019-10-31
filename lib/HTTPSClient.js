const https = require('https');
const url = require('url');

const BASE_URL = 'https://discordapp.com/api';
const API_VERSION = 'v6';

class HTTPSClient {
  constructor () {
    const baseURL = new url.URL(BASE_URL);

    this.hostname = baseURL.hostname;
    this.basePath = baseURL.pathname + '/' + API_VERSION;
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

    if (data) {
      this._data = JSON.parse(data);
    }
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
