// index.js
require('dotenv').config();
const axios = require('axios');
const db = require('./db');
const buyLabubu = require('./bot');
const puppeteer = require('puppeteer');

const productUrl = process.env.PRODUCT_URL;
const interval = parseInt(process.env.CHECK_INTERVAL || '5000');

if (!productUrl) {
  console.error("❌ PRODUCT_URL is not set in .env");
  process.exit(1);
}

console.log(`🔎 Monitoring ${productUrl} every ${interval / 1000}s...`);

async function checkStock() {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  try {
    await page.goto(productUrl, { waitUntil: 'networkidle2' });

    // Wait for buttons to render and extract all their inner text
    await page.waitForSelector('button', { timeout: 7000 });
    const buttonTexts = await page.$$eval('button', buttons =>
      buttons.map(btn => btn.innerText.trim().toLowerCase())
    );

    const inStock = buttonTexts.includes('add to bag');
    const status = inStock ? 'in_stock' : 'sold_out';
    const message = inStock ? 'LABUBU in stock!' : 'LABUBU still sold out';

    console.log(inStock ? "🚨 LABUBU IN STOCK! GO GO GO!" : "❌ Still sold out");

    await db('stock_logs').insert({ status, message });

    if (inStock) {
      await buyLabubu();
    }
  } catch (err) {
    console.error("⚠️ Error checking product:", err.message);
    await db('stock_logs').insert({ status: 'error', message: err.message });
  } finally {
    await browser.close();
  }
}

setInterval(checkStock, interval);
