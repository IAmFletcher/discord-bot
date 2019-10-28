const path = require('path');
const Database = require('./lib/Database');
const fs = require('./lib/fs');

const DB_DIR = './db';
const INIT_FILE = path.join(DB_DIR, 'init.sql');
const FILE_REGEX = /v\d+.sql/;
const NUMBER_REGEX = /\d+/;

const db = new Database();

db.connect()
  .then(() => {
    return fs.readFile(INIT_FILE, 'utf8');
  })
  .then((query) => {
    return db.query(query);
  })
  .then(() => {
    return db.query('SELECT * FROM constants WHERE name = "db_version";');
  })
  .then((results) => {
    // If db_version hasn't been set, start at 0
    const dbVersion = (results[0] && results[0].value) || 0;

    return readNewSQLFiles(dbVersion);
  })
  .then((queries) => {
    return migrate(queries);
  })
  .catch((err) => {
    console.error(err);
  });

function readNewSQLFiles (dbVersion) {
  return fs.readDir(DB_DIR)
    .then((files) => {
      files = files.filter((file) => {
        return file.match(FILE_REGEX) && file.match(NUMBER_REGEX) > dbVersion;
      });

      return Promise.all(files.map((file) => {
        return fs.readFile(path.join(DB_DIR, file), 'utf8');
      }));
    });
}

async function migrate (queries) {
  for (let i = 0; i < queries.length; i++) {
    await db.query(queries[i]);
  }
}

module.exports = db;

process.on('SIGINT', () => {
  db.end();
});
