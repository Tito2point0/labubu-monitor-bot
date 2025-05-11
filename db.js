const knex = require('knex');

const db = knex({
  client: 'sqlite3',
  connection: {
    filename: './data.db',
  },
  useNullAsDefault: true,
});

module.exports = db;
