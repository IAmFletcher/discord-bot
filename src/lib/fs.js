const fs = require('fs');

module.exports = {
  readDir (path, options = 'utf8') {
    return new Promise((resolve, reject) => {
      fs.readdir(path, options, (err, files) => {
        if (err) {
          return reject(err);
        }

        resolve(files);
      });
    });
  },

  readFile (path, options = null) {
    return new Promise((resolve, reject) => {
      fs.readFile(path, options, (err, data) => {
        if (err) {
          return reject(err);
        }

        resolve(data);
      });
    });
  }
};
