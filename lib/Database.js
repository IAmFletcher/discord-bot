const mysql = require('mysql');
const process = require('process');

class Database {
  constructor () {
    this.db = mysql.createConnection({
      host: process.env.SQLHost,
      port: process.env.SQLRoot || 3306,
      user: process.env.SQLUser,
      password: process.env.SQLPassword,
      charset: 'utf8mb4',
      multipleStatements: true
    });
  }

  connect () {
    return new Promise((resolve, reject) => {
      this.db.connect((err) => {
        if (err) {
          return reject(err);
        }

        return resolve();
      });
    });
  }

  end () {
    return new Promise((resolve, reject) => {
      this.db.end((err) => {
        if (err) {
          return reject(err);
        }

        return resolve();
      });
    });
  }

  query (sql, values) {
    return new Promise((resolve, reject) => {
      this.db.query(sql, values, (err, results) => {
        if (err) {
          return reject(err);
        }

        resolve(results);
      });
    });
  }
}

module.exports = Database;
