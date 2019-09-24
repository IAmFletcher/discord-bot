const https = require('https');

class HTTPSClient {
  constructor (hostname, basePath) {
    if (basePath[0] !== '/') {
      basePath = '/' + basePath;
    }

    this.hostname = hostname;
    this.basePath = basePath;
  }

  request (method, endpoint, headers = {}) {
    if (endpoint[0] !== '/') {
      endpoint = '/' + endpoint;
    }

    const options = {
      hostname: this.hostname,
      path: this.basePath + endpoint,
      method: method,
      headers: headers
    };

    return new Promise((resolve, reject) => {
      const req = https.request(options, (res) => {
        let data = '';

        res.on('data', (d) => {
          data += d;
        });

        res.on('end', () => {
          if (!res.complete) {
            reject(new Error('The connection was terminated while the message was still being sent.'));
          }

          if (res.statusCode === 204) {
            resolve(new HTTPSResponse(res.statusCode, res.headers));
          } else {
            resolve(new HTTPSResponse(res.statusCode, res.headers, JSON.parse(data)));
          }
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
    this._data = data;
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
