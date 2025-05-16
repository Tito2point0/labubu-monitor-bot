// viewLogs.js
const db = require('./db');

async function viewLogs() {
  try {
    const logs = await db('stock_logs').select('*').orderBy('id', 'desc').limit(20);
    console.table(logs);
  } catch (err) {
    console.error('❌ Error reading logs:', err.message);
  } finally {
    process.exit(0);
  }
}

viewLogs();
