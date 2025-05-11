require('dotenv').config();
const axios = require('axios');
const db = require('./db');

const productUrl = process.env.PRODUCT_URL;
const interval = parseInt(process.env.CHECK_INTERVAL || '5000');

async function checkStock() {
  try {
    const res = await axios.get(productUrl);
    const inStock = res.data.includes('Add to cart');

    if (inStock) {
      console.log("🚨 LABUBU IN STOCK! GO GO GO!");
      await db('stock_logs').insert({
        status: 'in_stock',
        message: 'LABUBU in stock!'
      });
    } else {
      console.log("❌ Still sold out");
      await db('stock_logs').insert({
        status: 'sold_out',
        message: 'LABUBU still sold out'
      });
    }
  } catch (err) {
    console.error("⚠️ Error checking product:", err.message);
    await db('stock_logs').insert({
      status: 'error',
      message: err.message
    });
  }
}

console.log(`🔎 Monitoring ${productUrl} every ${interval / 1000}s...`);
setInterval(checkStock, interval);
