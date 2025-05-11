exports.up = function(knex) {
    return knex.schema.createTable('stock_logs', function(table) {
      table.increments('id').primary();
      table.timestamp('checked_at').defaultTo(knex.fn.now());
      table.string('status');  // 'in_stock', 'sold_out', 'error'
      table.text('message');   // optional log message
    });
  };
  
  exports.down = function(knex) {
    return knex.schema.dropTable('stock_logs');
  };