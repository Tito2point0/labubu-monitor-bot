// index.js

require('dotenv').config();
const puppeteer = require('puppeteer');
const knex = require('knex');
const fs = require('fs');
const path = require('path');

// Initialize Knex with SQLite3
const db = knex({
  client: 'sqlite3',
  connection: {
    filename: './dev.sqlite3'
  },
  useNullAsDefault: true
});

// Ensure the 'stock_logs' table exists
(async () => {
  const exists = await db.schema.hasTable('stock_logs');
  if (!exists) {
    await db.schema.createTable('stock_logs', (table) => {
      table.increments('id').primary();
      table.string('status');
      table.text('message');
      table.timestamp('created_at').defaultTo(db.fn.now());
    });
    console.log('✅ Created "stock_logs" table.');
  }
})();

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
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64)');
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'en-US,en;q=0.9'
    });

    console.log("🌐 Navigating to product page...");
    const response = await page.goto(productUrl, { waitUntil: 'networkidle2', timeout: 15000 });

    console.log(`📡 Status Code: ${response.status()}`);

    // Wait for the main content to load
    await page.waitForSelector('body', { timeout: 10000 });

    // Extract all button texts
    const buttonTexts = await page.$$eval('button', buttons =>
      buttons.map(btn => btn.innerText.trim().toLowerCase())
    );

    console.log("🧾 Found buttons:", buttonTexts);

    const inStock = buttonTexts.includes('add to bag');

    // Extract product price if available
    let price = 'N/A';
    try {
      price = await page.$eval('.product-price', el => el.innerText.trim());
    } catch (e) {
      console.warn("⚠️ Could not extract price:", e.message);
    }

    const status = inStock ? 'in_stock' : 'sold_out';
    const message = inStock ? 'LABUBU in stock!' : 'LABUBU still sold out';

    console.log(inStock ? "🚨 LABUBU IN STOCK! GO GO GO!" : "❌ Still sold out");
    console.log(`💰 Price: ${price}`);

    await db('stock_logs').insert({ status, message });

    if (inStock) {
      // Placeholder for purchase logic
      console.log("🛒 Triggering purchase process...");
      // await buyLabubu(); // Implement this function as needed
    }
  } catch (err) {
    console.error("❌ Error during checkStock:", err.message);

    // Save screenshot and HTML for debugging
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const screenshotPath = path.join(__dirname, `error_screenshot_${timestamp}.png`);
    const htmlPath = path.join(__dirname, `error_page_${timestamp}.html`);

    await page.screenshot({ path: screenshotPath, fullPage: true });
    const html = await page.content();
    fs.writeFileSync(htmlPath, html);

    console.log(`🖼️ Saved screenshot: ${screenshotPath}`);
    console.log(`📝 Saved HTML: ${htmlPath}`);

    await db('stock_logs').insert({ status: 'error', message: err.message });
  } finally {
    await browser.close();
    console.log("🧼 Browser session closed.");
  }
}

setInterval(checkStock, interval);
