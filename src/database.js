const process = require('process');
const mysql = require('mysql');

const database = mysql.createConnection({
  host: 'localhost',
  user: process.env.SQLUser,
  password: process.env.SQLPassword
});

function connectPromise () {
  return new Promise((resolve, reject) => {
    database.connect((err) => {
      if (err) {
        return reject(err);
      }

      resolve();
    });
  });
}

function queryPromise (query) {
  return new Promise((resolve, reject) => {
    database.query(query, (err, results, fields) => {
      if (err) {
        return reject(err);
      }

      resolve({ results, fields });
    });
  });
}

async function initDatabase () {
  await connectPromise();
  console.log('Database Connected');
  await queryPromise('CREATE DATABASE IF NOT EXISTS bot');
  await queryPromise('USE bot');
  await queryPromise('CREATE TABLE IF NOT EXISTS messages (id INT AUTO_INCREMENT UNIQUE, guild_id VARCHAR(64), message_id VARCHAR(64), is_unicode BOOLEAN, unicode INT, reaction VARCHAR(100), role VARCHAR(100), key(id));');
  console.log('Database Setup Complete');
}

module.exports = { database, initDatabase };
