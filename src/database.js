const process = require('process');
const mysql = require('mysql');

const database = mysql.createConnection({
  host: 'localhost',
  user: process.env.SQLUser,
  password: process.env.SQLPassword,
  charset: 'utf8mb4'
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

function queryPromise (...params) {
  return new Promise((resolve, reject) => {
    database.query(...params, (err, results, fields) => {
      if (err) {
        return reject(err);
      }

      resolve({ results, fields });
    });
  });
}

function insertPromise (table, columns, values) {
  return queryPromise(`INSERT INTO ${table} (${columns.join(', ')}) VALUES (?)`, values);
}

function deletePromise (table, conditions) {
  const conditionsArray = [];
  let column = null;

  for (column in conditions) {
    if (Object.prototype.hasOwnProperty.call(conditions, column)) {
      conditionsArray.push(`${column} = ${conditions[column]}`);
    }
  }

  return queryPromise(`DELETE FROM ${table} WHERE ` + conditionsArray.join(' AND ') + ';');
}

function selectPromise (table, conditions) {
  const conditionsArray = [];
  let column = null;

  for (column in conditions) {
    if (Object.prototype.hasOwnProperty.call(conditions, column)) {
      conditionsArray.push(`${column} = ${conditions[column]}`);
    }
  }

  return queryPromise(`SELECT * FROM ${table} WHERE ` + conditionsArray.join(' AND ') + ';');
}

async function initDatabase () {
  await connectPromise();
  console.log('Database Connected');
  await queryPromise('SET character_set_server = utf8mb4;');
  await queryPromise('CREATE DATABASE IF NOT EXISTS bot;');
  await queryPromise('USE bot;');
  await queryPromise('CREATE TABLE IF NOT EXISTS constants (id INT AUTO_INCREMENT UNIQUE, name VARCHAR(100) UNIQUE, value VARCHAR(100), key(id));');
  await queryPromise('CREATE TABLE IF NOT EXISTS messages (id INT AUTO_INCREMENT UNIQUE, guild_id VARCHAR(64), message_id VARCHAR(64), reaction VARCHAR(100), role VARCHAR(100), key(id));');

  const response = await queryPromise('SELECT * FROM constants WHERE name = "db_version";');
  const version = (response.results.length && response.results[0].value) || '';

  switch (version) {
    case '1':
      break;
    default:
      migrateTo1();
  }

  console.log('Database Setup Complete');
}

async function migrateTo1 () {
  console.log('Migration To 1 Started');
  const response = await queryPromise('SELECT * FROM messages WHERE is_unicode = TRUE;');

  await Promise.all(response.results.map((row) => {
    return queryPromise('UPDATE messages SET reaction = ? WHERE id = ?;', [String.fromCodePoint(row.unicode), row.id]);
  }));

  await queryPromise('ALTER TABLE messages DROP COLUMN is_unicode, DROP COLUMN unicode;');
  await queryPromise('INSERT INTO constants (name, value) VALUES ("db_version", "3") ON DUPLICATE KEY UPDATE value = "3";');
  console.log('Migration to 1 Completed');
}

module.exports = { database, initDatabase, insertPromise, deletePromise, selectPromise };
