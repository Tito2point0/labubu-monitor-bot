require('dotenv').config();
const axios = require('axios');

const productUrl = process.env.PRODUCT_URL;
const interval = parseInt(process.env.CHECK_INTERVAL || '5000');

async function checkStock() {
  try {
    const res = await axios.get(productUrl);

    if (res.data.includes('Add to cart')) {
      console.log("🚨 LABUBU IN STOCK! GO GO GO!");
    } else {
      console.log("❌ Still sold out...");
    }
  } catch (err) {
    console.error("⚠️ Error checking product:", err.message);
  }
}

console.log(`🔎 Monitoring ${productUrl} every ${interval / 1000}s...`);
setInterval(checkStock, interval);
